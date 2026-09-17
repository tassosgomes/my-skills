# Outbox e Inbox

| | Outbox | Inbox |
|---|---|---|
| Lado | Produtor | Consumidor |
| Quando | Sempre que um evento é publicado | Quando o efeito do consumidor não é idempotente por natureza |
| Como | Evento gravado na mesma transação dos dados; worker publica | `MessageId` + consumidor gravados na mesma transação dos efeitos |

## Outbox

### Tabela `outbox_messages`

| Coluna | Tipo | Origem |
|---|---|---|
| `id` | `uuid` PK | `DomainEvent.EventId` (UUIDv7) = `MessageId` publicado |
| `type` | `varchar(200)` | nome do evento |
| `payload` | `jsonb` | evento serializado (`JsonSerializerDefaults.Web`) |
| `occurred_on` | `timestamp` | `DomainEvent.OccurredOn` |
| `processed_on` | `timestamp null` | preenchido após confirm do broker |
| `attempts` | `int` | incrementado a cada falha |
| `last_error` | `varchar(2000)` | mensagem truncada |
| `trace_parent` | `varchar(55)` | `Activity.Current?.Id` do request que levantou o evento |

Índice parcial `ix_outbox_messages_pending` em `id` com filtro `processed_on IS NULL`: como o Id é
UUIDv7, ordenar por `id` é ordenar por criação.

### Unit of Work

```csharp
// Infra.Data/UnitOfWork.cs
public sealed class UnitOfWork(ProjectNameDbContext context) : IUnitOfWork
{
    public async Task CommitAsync(CancellationToken cancellationToken)
    {
        var aggregates = context.ChangeTracker.Entries<AggregateRoot>()
            .Select(entry => entry.Entity)
            .Where(aggregate => aggregate.Events.Count > 0)
            .ToList();

        await context.OutboxMessages.AddRangeAsync(
            aggregates.SelectMany(aggregate => aggregate.Events).Select(OutboxMessage.FromDomainEvent),
            cancellationToken);

        await context.SaveChangesAsync(cancellationToken);
        aggregates.ForEach(aggregate => aggregate.ClearEvents());
    }
}
```

O agregado precisa estar rastreado para ter seus eventos coletados.

### Worker de publicação

`OutboxOptions` (seção `Outbox`): `PollingInterval` 2 s, `BatchSize` 50, `MaxAttempts` 10.

```csharp
// OutboxPublisherWorker — one cycle, inside a transaction on a fresh scope
var messages = await context.OutboxMessages
    .FromSql($"""
        SELECT * FROM outbox_messages
        WHERE processed_on IS NULL AND attempts < {options.MaxAttempts}
        ORDER BY id
        LIMIT {options.BatchSize}
        FOR UPDATE SKIP LOCKED
        """)
    .ToListAsync(stoppingToken);

foreach (var message in messages)
{
    try
    {
        await publisher.PublishAsync(message, stoppingToken);
        message.MarkAsProcessed(DateTime.UtcNow);
    }
    catch (Exception ex) when (ex is not OperationCanceledException)
    {
        message.RegisterFailure(ex.Message);
        logger.LogWarning(ex, "Failed to publish outbox message {MessageId} ({Type})", message.Id, message.Type);
    }
}

// Never cancel after publishing: marking as processed avoids republishing.
await context.SaveChangesAsync(CancellationToken.None);
await transaction.CommitAsync(CancellationToken.None);
```

- `PeriodicTimer` no loop; falha de um ciclo é logada e o worker continua.
- `FOR UPDATE SKIP LOCKED` permite várias réplicas sem publicar a mesma linha em paralelo.
- Consumidores não dependem de ordem; usam versão ou data do evento para descartar atualização antiga.
- Contrato público diferente do evento de domínio: converta para evento de integração antes de
  gravar no outbox, nunca no worker.

### Operação

- Linhas com `attempts >= MaxAttempts` degradam o `OutboxHealthCheck` e geram alerta
  (`dotnet-observability`).
- Limpeza diária: processadas há mais de 7 dias (`ExecuteDeleteAsync`).

## Inbox

| Efeito do consumidor | Inbox? |
|---|---|
| Upsert por Id, status para valor fixo, "já existe? ignore" | Não |
| Somar/subtrair, enviar e-mail/notificação, criar registro sem chave natural | Sim |
| Chamar API externa sem chave de idempotência | Sim |

Tabela `processed_messages`: PK composta (`message_id`, `consumer`), `processed_on`. O mesmo
`MessageId` pode chegar a consumidores diferentes.

`InboxMessageHandler<TMessage>` decora o handler:

1. `consumer` = nome estável do handler interno (renomear a classe faz mensagens antigas parecerem
   novas).
2. Se `(MessageId, consumer)` já existe, loga `Information` e retorna.
3. Abre transação no `DbContext` do escopo, chama o handler (cujo caso de uso usa o mesmo
   `DbContext`), grava `ProcessedMessage`, `SaveChangesAsync` e commit com `CancellationToken.None`.
4. `DbUpdateException` com `PostgresErrorCodes.UniqueViolation`: outra entrega concluiu antes;
   rollback e retorna sem erro.
5. Com `EnableRetryOnFailure`, envolva em `Database.CreateExecutionStrategy().ExecuteAsync(...)`.

Limpeza: registros mais antigos que a janela máxima de redelivery (30 dias).

## Checklist

- [ ] Nenhum caso de uso publica no broker.
- [ ] `CommitAsync` grava dados e outbox no mesmo `SaveChangesAsync`.
- [ ] `MessageId` publicado = `EventId` (UUIDv7).
- [ ] Worker com `FOR UPDATE SKIP LOCKED`, sem cancelar depois de publicar.
- [ ] Todo consumidor é idempotente por natureza ou decorado com inbox.
- [ ] Outbox e inbox têm limpeza e alerta.
