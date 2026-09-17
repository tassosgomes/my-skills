# Outbox e Inbox — Entrega Confiável de Eventos

Os dois padrões são complementares, um em cada ponta da mensageria:

| | Outbox | Inbox |
|---|---|---|
| Lado | Produtor | Consumidor |
| Resolve | Salvar o estado e publicar o evento de forma atômica | Processar a mesma mensagem duas vezes |
| Como | Grava o evento na mesma transação dos dados; um worker publica | Grava o `MessageId` na mesma transação dos efeitos; duplicata é ignorada |
| Quando | **Sempre** que um evento não pode ser perdido | Quando o efeito do consumidor não é idempotente por natureza |

O outbox entrega *at-least-once*: se o worker publicar e cair antes de marcar a mensagem como
processada, ela sai de novo. Por isso todo consumidor precisa ser idempotente.

## Outbox

### Modelo e tabela

```csharp
// Infra.Data/Outbox/OutboxMessage.cs
public sealed class OutboxMessage
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private OutboxMessage() { }

    public Guid Id { get; private set; }              // = DomainEvent.EventId = broker MessageId
    public string Type { get; private set; } = string.Empty;
    public string Payload { get; private set; } = string.Empty;
    public DateTime OccurredOn { get; private set; }
    public DateTime? ProcessedOn { get; private set; }
    public int Attempts { get; private set; }
    public string? LastError { get; private set; }
    public string? TraceParent { get; private set; }       // W3C trace context of the request that raised the event

    public static OutboxMessage FromDomainEvent(DomainEvent domainEvent) => new()
    {
        Id = domainEvent.EventId,
        Type = domainEvent.GetType().Name,
        Payload = JsonSerializer.Serialize(domainEvent, domainEvent.GetType(), SerializerOptions),
        OccurredOn = domainEvent.OccurredOn,
        TraceParent = Activity.Current?.Id
    };

    public void MarkAsProcessed(DateTime processedOn) => ProcessedOn = processedOn;

    public void RegisterFailure(string error)
    {
        Attempts++;
        LastError = error.Length > 2_000 ? error[..2_000] : error;
    }
}
```

```csharp
// Infra.Data/Outbox/OutboxMessageConfiguration.cs
public sealed class OutboxMessageConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("outbox_messages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasColumnName("id");
        builder.Property(m => m.Type).HasColumnName("type").HasMaxLength(200).IsRequired();
        builder.Property(m => m.Payload).HasColumnName("payload").HasColumnType("jsonb").IsRequired();
        builder.Property(m => m.OccurredOn).HasColumnName("occurred_on");
        builder.Property(m => m.ProcessedOn).HasColumnName("processed_on");
        builder.Property(m => m.Attempts).HasColumnName("attempts");
        builder.Property(m => m.LastError).HasColumnName("last_error").HasMaxLength(2_000);
        builder.Property(m => m.TraceParent).HasColumnName("trace_parent").HasMaxLength(55);

        builder.HasIndex(m => m.OccurredOn)
            .HasDatabaseName("ix_outbox_messages_pending")
            .HasFilter("processed_on IS NULL");
    }
}
```

`AggregateRoot.Events` não é mapeado: `builder.Ignore(a => a.Events)` na configuração de cada
agregado.

### Unit of Work

Os eventos entram no `ChangeTracker` junto com os dados; um único `SaveChangesAsync` é uma única
transação.

```csharp
// Infra.Data/UnitOfWork.cs
public sealed class UnitOfWork : IUnitOfWork
{
    private readonly ProjectNameDbContext _context;

    public UnitOfWork(ProjectNameDbContext context) => _context = context;

    public async Task CommitAsync(CancellationToken cancellationToken)
    {
        var aggregates = _context.ChangeTracker
            .Entries<AggregateRoot>()
            .Select(entry => entry.Entity)
            .Where(aggregate => aggregate.Events.Count > 0)
            .ToList();

        var outboxMessages = aggregates
            .SelectMany(aggregate => aggregate.Events)
            .Select(OutboxMessage.FromDomainEvent);

        await _context.OutboxMessages.AddRangeAsync(outboxMessages, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        aggregates.ForEach(aggregate => aggregate.ClearEvents());
    }
}
```

O agregado precisa estar rastreado para ter seus eventos coletados: o `GetAsync` do repositório
não usa `AsNoTracking` (`dotnet-architecture/examples/repository-pattern.md`).

### Worker de publicação

`FOR UPDATE SKIP LOCKED` permite várias réplicas do serviço lendo o outbox sem publicar a mesma
linha em paralelo.

```csharp
// Infra.Data/Outbox/OutboxOptions.cs (also read by OutboxHealthCheck)
public sealed class OutboxOptions
{
    public const string SectionName = "Outbox";

    public TimeSpan PollingInterval { get; init; } = TimeSpan.FromSeconds(2);
    public int BatchSize { get; init; } = 50;
    public int MaxAttempts { get; init; } = 10;
}
```

```csharp
// Infra.Messaging/Publishing/OutboxPublisherWorker.cs
public sealed class OutboxPublisherWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RabbitMqPublisher _publisher;
    private readonly OutboxOptions _options;
    private readonly ILogger<OutboxPublisherWorker> _logger;

    public OutboxPublisherWorker(
        IServiceScopeFactory scopeFactory,
        RabbitMqPublisher publisher,
        IOptions<OutboxOptions> options,
        ILogger<OutboxPublisherWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _publisher = publisher;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_options.PollingInterval);

        do
        {
            try
            {
                await PublishPendingAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Outbox publishing cycle failed");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task PublishPendingAsync(CancellationToken stoppingToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<ProjectNameDbContext>();

        await using var transaction = await context.Database.BeginTransactionAsync(stoppingToken);

        var messages = await context.OutboxMessages
            .FromSql($"""
                SELECT * FROM outbox_messages
                WHERE processed_on IS NULL AND attempts < {_options.MaxAttempts}
                ORDER BY occurred_on
                LIMIT {_options.BatchSize}
                FOR UPDATE SKIP LOCKED
                """)
            .ToListAsync(stoppingToken);

        foreach (var message in messages)
        {
            try
            {
                await _publisher.PublishAsync(message, stoppingToken);
                message.MarkAsProcessed(DateTime.UtcNow);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                message.RegisterFailure(ex.Message);
                _logger.LogWarning(ex, "Failed to publish outbox message {MessageId} ({Type})", message.Id, message.Type);
            }
        }

        // Do not cancel after publishing: marking as processed avoids needless republishing.
        await context.SaveChangesAsync(CancellationToken.None);
        await transaction.CommitAsync(CancellationToken.None);
    }
}
```

### Operação

- **Mensagens travadas:** linhas com `attempts >= MaxAttempts` não são mais tentadas. Exponha uma
  métrica/health check com essa contagem e trate como incidente.
- **Limpeza:** apague linhas processadas há mais de N dias em um job periódico
  (`DELETE FROM outbox_messages WHERE processed_on < now() - interval '7 days'`).
- **Ordem:** a publicação segue `occurred_on`, mas com várias réplicas e retries a ordem não é
  garantida. Consumidores não devem depender de ordem; use versão ou data do evento para
  descartar atualização antiga.
- **Contrato externo:** o payload publicado é o evento de domínio serializado. Se o contrato
  público precisar ser diferente, converta o evento de domínio em evento de integração antes de
  gravar no outbox, nunca no worker.

## Inbox

### Quando usar

| Efeito do consumidor | Inbox? |
|---|---|
| Upsert por Id, mudar status para um valor fixo, "já existe? então ignore" | Não — idempotente por natureza |
| Somar/subtrair valores, enviar e-mail/notificação, criar registro sem chave natural | Sim |
| Chamar API externa sem chave de idempotência | Sim (e ainda assim avalie a API externa) |

### Modelo e tabela

```csharp
// Infra.Data/Inbox/ProcessedMessage.cs
public sealed class ProcessedMessage
{
    public ProcessedMessage(Guid messageId, string consumer, DateTime processedOn)
    {
        MessageId = messageId;
        Consumer = consumer;
        ProcessedOn = processedOn;
    }

    public Guid MessageId { get; private set; }
    public string Consumer { get; private set; }
    public DateTime ProcessedOn { get; private set; }
}

// Infra.Data/Inbox/ProcessedMessageConfiguration.cs
public sealed class ProcessedMessageConfiguration : IEntityTypeConfiguration<ProcessedMessage>
{
    public void Configure(EntityTypeBuilder<ProcessedMessage> builder)
    {
        builder.ToTable("processed_messages");
        builder.HasKey(m => new { m.MessageId, m.Consumer }); // the same message can reach different consumers
        builder.Property(m => m.Consumer).HasMaxLength(200);
    }
}
```

### Decorator do handler

O decorator abre a transação, chama o handler (que chama o caso de uso, cujo `UnitOfWork` usa o
mesmo `DbContext` do escopo) e grava o `ProcessedMessage` antes do commit. Efeitos e registro de
processamento são atômicos.

```csharp
// Infra.Messaging/Consuming/InboxMessageHandler.cs
public sealed class InboxMessageHandler<TMessage> : IMessageHandler<TMessage>
{
    private readonly IMessageHandler<TMessage> _inner;
    private readonly ProjectNameDbContext _context;
    private readonly ILogger<InboxMessageHandler<TMessage>> _logger;

    public InboxMessageHandler(
        IMessageHandler<TMessage> inner,
        ProjectNameDbContext context,
        ILogger<InboxMessageHandler<TMessage>> logger)
    {
        _inner = inner;
        _context = context;
        _logger = logger;
    }

    public async Task HandleAsync(TMessage message, MessageContext messageContext, CancellationToken cancellationToken)
    {
        // Stable consumer name: renaming the handler makes old messages look new.
        var consumer = _inner.GetType().Name;

        var alreadyProcessed = await _context.ProcessedMessages
            .AnyAsync(m => m.MessageId == messageContext.MessageId && m.Consumer == consumer, cancellationToken);

        if (alreadyProcessed)
        {
            _logger.LogInformation("Message {MessageId} already processed by {Consumer}", messageContext.MessageId, consumer);
            return;
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);

        try
        {
            await _inner.HandleAsync(message, messageContext, cancellationToken);

            _context.ProcessedMessages.Add(new ProcessedMessage(messageContext.MessageId, consumer, DateTime.UtcNow));
            await _context.SaveChangesAsync(CancellationToken.None);
            await transaction.CommitAsync(CancellationToken.None);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Another delivery of the same message finished first: discard this one.
            await transaction.RollbackAsync(CancellationToken.None);
            _logger.LogInformation("Message {MessageId} processed concurrently by {Consumer}", messageContext.MessageId, consumer);
        }
    }
}
```

Se o `DbContext` usar `EnableRetryOnFailure`, envolva a transação em
`_context.Database.CreateExecutionStrategy().ExecuteAsync(...)`: transação explícita não funciona
com a execution strategy de retry sem esse envelope.

### Registro

Com Scrutor, decore apenas os consumidores que precisam de inbox:

```csharp
services.AddRabbitMqConsumer<OrderClosedIntegrationEvent, OrderClosedMessageHandler>(
    queue: "billing.order-closed",
    routingKey: "orders.order.closed.v1");

services.Decorate<IMessageHandler<OrderClosedIntegrationEvent>, InboxMessageHandler<OrderClosedIntegrationEvent>>();
```

Limpeza: apague `processed_messages` mais antigas que a janela máxima de redelivery do broker (ex.:
30 dias).

## Checklist

- [ ] Nenhum caso de uso publica no broker diretamente.
- [ ] `UnitOfWork.CommitAsync` grava dados e outbox no mesmo `SaveChangesAsync`.
- [ ] O `MessageId` publicado é o `EventId` do evento de domínio.
- [ ] O worker usa `FOR UPDATE SKIP LOCKED` e não cancela depois de publicar.
- [ ] Mensagens com tentativas esgotadas geram alerta.
- [ ] Todo consumidor é idempotente por natureza ou está decorado com inbox.
- [ ] Outbox e inbox têm rotina de limpeza.
