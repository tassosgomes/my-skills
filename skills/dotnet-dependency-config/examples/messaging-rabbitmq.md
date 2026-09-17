# Mensageria — RabbitMQ com `RabbitMQ.Client`

Use o client oficial (`RabbitMQ.Client` 7.x, API assíncrona) diretamente, sem biblioteca wrapper.
A infraestrutura fica em `ProjectName.Infra.Messaging`; o registro na DI fica em
`Api/Extensions/MessagingExtensions.cs` (`dotnet-program-setup`).

Garantias deste padrão:

- **Produtor:** nunca publica de dentro do caso de uso. O evento vai para o outbox na mesma
  transação dos dados e o `OutboxPublisherWorker` publica com publisher confirms
  (`outbox-inbox.md`).
- **Consumidor:** `autoAck: false`, ACK só depois do sucesso, retry curto com backoff para falhas
  transitórias e NACK sem requeue para a DLQ na falha final.
- **Entrega:** at-least-once. Consumidores são idempotentes por natureza ou usam inbox.

```bash
dotnet add src/ProjectName.Infra.Messaging package RabbitMQ.Client
dotnet add src/ProjectName.Infra.Messaging package Polly.Core
```

## Estrutura

```text
ProjectName.Infra.Messaging/
├── RabbitMqTelemetry.cs             # ActivitySource e propagação do traceparent
├── Configuration/
│   ├── RabbitMqOptions.cs
│   └── EventRoutes.cs               # tipo do evento → routing key
├── Connection/
│   └── RabbitMqConnectionProvider.cs
├── Topology/
│   ├── QueueBinding.cs
│   └── RabbitMqTopologyInitializer.cs
├── Publishing/
│   ├── RabbitMqPublisher.cs
│   └── OutboxPublisherWorker.cs     # outbox-inbox.md
└── Consuming/
    ├── IMessageHandler.cs
    ├── MessageContext.cs
    ├── RabbitMqConsumerWorker.cs
    └── InboxMessageHandler.cs       # outbox-inbox.md
```

## Configuração

```csharp
// Configuration/RabbitMqOptions.cs
public sealed class RabbitMqOptions
{
    public const string SectionName = "RabbitMQ";

    [Required] public string HostName { get; init; } = "localhost";
    public int Port { get; init; } = 5672;
    [Required] public string UserName { get; init; } = string.Empty;
    [Required] public string Password { get; init; } = string.Empty;
    public string VirtualHost { get; init; } = "/";
    [Required] public string Exchange { get; init; } = string.Empty;
    public string ClientProvidedName { get; init; } = "projectname";
    public ushort PrefetchCount { get; init; } = 10;
    public int DeliveryLimit { get; init; } = 5;
}
```

```json
// appsettings.json — no password; it comes from user-secrets or RabbitMQ__Password
{
  "RabbitMQ": {
    "HostName": "localhost",
    "Port": 5672,
    "UserName": "projectname",
    "VirtualHost": "/",
    "Exchange": "projectname.events",
    "ClientProvidedName": "projectname-api"
  }
}
```

```csharp
// Configuration/EventRoutes.cs
// A routing key is a public contract: stable and versioned, never derived from the class name.
public static class EventRoutes
{
    private static readonly Dictionary<string, string> RoutingKeys = new()
    {
        [nameof(CategoryCreatedEvent)] = "catalog.category.created.v1",
        [nameof(VideoUploadedEvent)] = "catalog.video.uploaded.v1"
    };

    public static string GetRoutingKey(string eventType)
        => RoutingKeys.TryGetValue(eventType, out var routingKey)
            ? routingKey
            : throw new InvalidOperationException($"No routing key mapped for event '{eventType}'");
}
```

## Telemetria

O publisher cria um span `publish` filho do request que gravou o outbox (o `traceparent` é salvo
na própria `OutboxMessage`) e o consumidor cria um span `process` filho do publisher. O trace
atravessa HTTP → outbox → broker → consumidor.

```csharp
// RabbitMqTelemetry.cs
public static class RabbitMqTelemetry
{
    public const string SourceName = "ProjectName.Messaging";
    public const string TraceParentHeader = "traceparent";

    public static readonly ActivitySource ActivitySource = new(SourceName);

    public static Activity? StartPublishActivity(string routingKey, string? storedTraceParent)
    {
        ActivityContext.TryParse(storedTraceParent, null, out var parentContext);

        var activity = ActivitySource.StartActivity($"publish {routingKey}", ActivityKind.Producer, parentContext);
        activity?.SetTag("messaging.system", "rabbitmq");
        activity?.SetTag("messaging.destination.name", routingKey);
        return activity;
    }

    public static Activity? StartProcessActivity(string queue, IReadOnlyBasicProperties properties)
    {
        var traceParent = properties.Headers?.TryGetValue(TraceParentHeader, out var value) == true && value is byte[] bytes
            ? Encoding.UTF8.GetString(bytes)
            : null;

        ActivityContext.TryParse(traceParent, null, out var parentContext);

        var activity = ActivitySource.StartActivity($"process {queue}", ActivityKind.Consumer, parentContext);
        activity?.SetTag("messaging.system", "rabbitmq");
        activity?.SetTag("messaging.destination.name", queue);
        activity?.SetTag("messaging.message.id", properties.MessageId);
        return activity;
    }
}
```

Registre a fonte no OpenTelemetry com `.AddSource(RabbitMqTelemetry.SourceName)`
(`dotnet-production-readiness`).

## Conexão

Uma conexão por processo, criada de forma assíncrona na primeira utilização. A recuperação
automática do client reabre conexão e canais; não crie uma conexão nova quando ela cair.

```csharp
// Connection/RabbitMqConnectionProvider.cs
public sealed class RabbitMqConnectionProvider : IAsyncDisposable
{
    private readonly RabbitMqOptions _options;
    private readonly SemaphoreSlim _lock = new(1, 1);
    private IConnection? _connection;

    public RabbitMqConnectionProvider(IOptions<RabbitMqOptions> options) => _options = options.Value;

    public async Task<IConnection> GetConnectionAsync(CancellationToken cancellationToken)
    {
        if (_connection is not null)
            return _connection;

        await _lock.WaitAsync(cancellationToken);
        try
        {
            _connection ??= await new ConnectionFactory
            {
                HostName = _options.HostName,
                Port = _options.Port,
                UserName = _options.UserName,
                Password = _options.Password,
                VirtualHost = _options.VirtualHost,
                ClientProvidedName = _options.ClientProvidedName,
                AutomaticRecoveryEnabled = true,
                TopologyRecoveryEnabled = true
            }.CreateConnectionAsync(cancellationToken);

            return _connection;
        }
        finally
        {
            _lock.Release();
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_connection is not null)
        {
            await _connection.CloseAsync();
            _connection.Dispose();
        }

        _lock.Dispose();
    }
}
```

Nunca use `.GetAwaiter().GetResult()` para abrir conexão ou canal no registro da DI.

## Topologia

Exchange `topic` durável para eventos, filas quorum com DLX e uma DLQ por fila. Declarações são
idempotentes e rodam em um `IHostedService` registrado **antes** dos consumidores (hosted services
iniciam na ordem de registro).

```csharp
// Topology/QueueBinding.cs
public sealed record QueueBinding(string Queue, string RoutingKey);

// Topology/RabbitMqTopologyInitializer.cs
public sealed class RabbitMqTopologyInitializer : IHostedService
{
    private readonly RabbitMqConnectionProvider _connectionProvider;
    private readonly IEnumerable<QueueBinding> _bindings;
    private readonly RabbitMqOptions _options;

    public RabbitMqTopologyInitializer(
        RabbitMqConnectionProvider connectionProvider,
        IEnumerable<QueueBinding> bindings,
        IOptions<RabbitMqOptions> options)
    {
        _connectionProvider = connectionProvider;
        _bindings = bindings;
        _options = options.Value;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var connection = await _connectionProvider.GetConnectionAsync(cancellationToken);
        await using var channel = await connection.CreateChannelAsync(cancellationToken: cancellationToken);

        var deadLetterExchange = $"{_options.Exchange}.dlx";

        await channel.ExchangeDeclareAsync(_options.Exchange, ExchangeType.Topic, durable: true, cancellationToken: cancellationToken);
        await channel.ExchangeDeclareAsync(deadLetterExchange, ExchangeType.Direct, durable: true, cancellationToken: cancellationToken);

        foreach (var binding in _bindings)
        {
            var deadLetterQueue = $"{binding.Queue}.dlq";

            await channel.QueueDeclareAsync(deadLetterQueue, durable: true, exclusive: false, autoDelete: false,
                arguments: new Dictionary<string, object?> { ["x-queue-type"] = "quorum" },
                cancellationToken: cancellationToken);
            await channel.QueueBindAsync(deadLetterQueue, deadLetterExchange, binding.Queue, cancellationToken: cancellationToken);

            await channel.QueueDeclareAsync(binding.Queue, durable: true, exclusive: false, autoDelete: false,
                arguments: new Dictionary<string, object?>
                {
                    ["x-queue-type"] = "quorum",
                    ["x-dead-letter-exchange"] = deadLetterExchange,
                    ["x-dead-letter-routing-key"] = binding.Queue,
                    ["x-delivery-limit"] = _options.DeliveryLimit // poison message protection
                },
                cancellationToken: cancellationToken);
            await channel.QueueBindAsync(binding.Queue, _options.Exchange, binding.RoutingKey, cancellationToken: cancellationToken);
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
```

## Publicação

Um canal com publisher confirms. Com `publisherConfirmationTrackingEnabled`, o
`BasicPublishAsync` só retorna depois do confirm do broker e lança `PublishException` em NACK ou
em mensagem devolvida (`mandatory: true` sem fila vinculada). Use este publisher apenas a partir do
`OutboxPublisherWorker`, que publica sequencialmente.

```csharp
// Publishing/RabbitMqPublisher.cs
public sealed class RabbitMqPublisher : IAsyncDisposable
{
    private readonly RabbitMqConnectionProvider _connectionProvider;
    private readonly RabbitMqOptions _options;
    private IChannel? _channel;

    public RabbitMqPublisher(RabbitMqConnectionProvider connectionProvider, IOptions<RabbitMqOptions> options)
    {
        _connectionProvider = connectionProvider;
        _options = options.Value;
    }

    public async Task PublishAsync(OutboxMessage message, CancellationToken cancellationToken)
    {
        var routingKey = EventRoutes.GetRoutingKey(message.Type);
        using var activity = RabbitMqTelemetry.StartPublishActivity(routingKey, message.TraceParent);

        var channel = await GetChannelAsync(cancellationToken);

        var properties = new BasicProperties
        {
            MessageId = message.Id.ToString(), // consumer idempotency key
            Type = message.Type,
            ContentType = "application/json",
            DeliveryMode = DeliveryModes.Persistent,
            Timestamp = new AmqpTimestamp(new DateTimeOffset(message.OccurredOn).ToUnixTimeSeconds()),
            Headers = new Dictionary<string, object?>
            {
                [RabbitMqTelemetry.TraceParentHeader] = activity?.Id ?? message.TraceParent
            }
        };

        await channel.BasicPublishAsync(
            exchange: _options.Exchange,
            routingKey: routingKey,
            mandatory: true,
            basicProperties: properties,
            body: Encoding.UTF8.GetBytes(message.Payload),
            cancellationToken: cancellationToken);
    }

    private async Task<IChannel> GetChannelAsync(CancellationToken cancellationToken)
    {
        if (_channel is { IsOpen: true })
            return _channel;

        var connection = await _connectionProvider.GetConnectionAsync(cancellationToken);
        _channel = await connection.CreateChannelAsync(
            new CreateChannelOptions(publisherConfirmationsEnabled: true, publisherConfirmationTrackingEnabled: true),
            cancellationToken);

        return _channel;
    }

    public async ValueTask DisposeAsync()
    {
        if (_channel is not null)
            await _channel.DisposeAsync();
    }
}
```

## Consumo

O consumidor fica em `Infra.Messaging` e é genérico. A regra de negócio fica no
`IMessageHandler<T>` da Api (pasta `MessageHandlers/`), que só chama um caso de uso.

```csharp
// Consuming/MessageContext.cs
public sealed record MessageContext(Guid MessageId, string? Type, string? CorrelationId, bool Redelivered);

// Consuming/IMessageHandler.cs
public interface IMessageHandler<in TMessage>
{
    Task HandleAsync(TMessage message, MessageContext context, CancellationToken cancellationToken);
}
```

```csharp
// Consuming/RabbitMqConsumerWorker.cs
public sealed class RabbitMqConsumerWorker<TMessage> : BackgroundService
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);

    private readonly string _queue;
    private readonly RabbitMqConnectionProvider _connectionProvider;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqConsumerWorker<TMessage>> _logger;
    private readonly ResiliencePipeline _retry = new ResiliencePipelineBuilder()
        .AddRetry(new RetryStrategyOptions
        {
            ShouldHandle = new PredicateBuilder().Handle<Exception>(ex => ex is not (JsonException or EntityValidationException)),
            MaxRetryAttempts = 3,
            Delay = TimeSpan.FromSeconds(1),
            BackoffType = DelayBackoffType.Exponential,
            UseJitter = true
        })
        .Build();

    private IChannel? _channel;

    public RabbitMqConsumerWorker(
        string queue,
        RabbitMqConnectionProvider connectionProvider,
        IServiceScopeFactory scopeFactory,
        IOptions<RabbitMqOptions> options,
        ILogger<RabbitMqConsumerWorker<TMessage>> logger)
    {
        _queue = queue;
        _connectionProvider = connectionProvider;
        _scopeFactory = scopeFactory;
        _options = options.Value;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var connection = await _connectionProvider.GetConnectionAsync(stoppingToken);
        _channel = await connection.CreateChannelAsync(cancellationToken: stoppingToken);
        await _channel.BasicQosAsync(prefetchSize: 0, prefetchCount: _options.PrefetchCount, global: false, stoppingToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += (_, delivery) => HandleDeliveryAsync(delivery, stoppingToken);

        await _channel.BasicConsumeAsync(_queue, autoAck: false, consumer: consumer, cancellationToken: stoppingToken);
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task HandleDeliveryAsync(BasicDeliverEventArgs delivery, CancellationToken stoppingToken)
    {
        var context = new MessageContext(
            Guid.TryParse(delivery.BasicProperties.MessageId, out var messageId) ? messageId : Guid.Empty,
            delivery.BasicProperties.Type,
            delivery.BasicProperties.CorrelationId,
            delivery.Redelivered);

        try
        {
            if (context.MessageId == Guid.Empty)
                throw new JsonException("Message without a valid MessageId");

            // The body is only valid during the callback: deserialize before any long await.
            var message = JsonSerializer.Deserialize<TMessage>(delivery.Body.Span, SerializerOptions)
                ?? throw new JsonException("Empty message body");

            using var activity = RabbitMqTelemetry.StartProcessActivity(_queue, delivery.BasicProperties);
            using var logScope = _logger.BeginScope(new Dictionary<string, object?>
            {
                ["messaging.system"] = "rabbitmq",
                ["messaging.destination.name"] = _queue,
                ["messaging.message.id"] = context.MessageId
            });

            await _retry.ExecuteAsync(async token =>
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var handler = scope.ServiceProvider.GetRequiredService<IMessageHandler<TMessage>>();
                await handler.HandleAsync(message, context, token);
            }, stoppingToken);

            await _channel!.BasicAckAsync(delivery.DeliveryTag, multiple: false, CancellationToken.None);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Message {MessageId} from {Queue} sent to DLQ", context.MessageId, _queue);
            await _channel!.BasicNackAsync(delivery.DeliveryTag, multiple: false, requeue: false, CancellationToken.None);
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        if (_channel is not null)
            await _channel.DisposeAsync();
    }
}
```

```csharp
// Api/MessageHandlers/VideoEncodedMessageHandler.cs
public sealed class VideoEncodedMessageHandler : IMessageHandler<VideoEncodedMessage>
{
    private readonly IUpdateMediaStatus _updateMediaStatus;

    public VideoEncodedMessageHandler(IUpdateMediaStatus updateMediaStatus) => _updateMediaStatus = updateMediaStatus;

    public Task HandleAsync(VideoEncodedMessage message, MessageContext context, CancellationToken cancellationToken)
        => _updateMediaStatus.ExecuteAsync(new UpdateMediaStatusInput(message.VideoId, message.EncodedPath), cancellationToken);
}
```

## Registro

```csharp
// Api/Extensions/MessagingExtensions.cs
public static class MessagingExtensions
{
    public static IServiceCollection AddMessagingConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<RabbitMqOptions>()
            .Bind(configuration.GetSection(RabbitMqOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton<RabbitMqConnectionProvider>();
        services.AddSingleton<RabbitMqPublisher>();

        // Topology before any consumer or worker.
        services.AddHostedService<RabbitMqTopologyInitializer>();
        services.AddHostedService<OutboxPublisherWorker>();

        services.AddRabbitMqConsumer<VideoEncodedMessage, VideoEncodedMessageHandler>(
            queue: "catalog.video-encoded",
            routingKey: "encoder.video.encoded.v1");

        return services;
    }

    private static IServiceCollection AddRabbitMqConsumer<TMessage, THandler>(
        this IServiceCollection services, string queue, string routingKey)
        where THandler : class, IMessageHandler<TMessage>
    {
        services.AddSingleton(new QueueBinding(queue, routingKey));
        services.AddScoped<IMessageHandler<TMessage>, THandler>();
        services.AddSingleton<IHostedService>(sp => ActivatorUtilities.CreateInstance<RabbitMqConsumerWorker<TMessage>>(sp, queue));
        return services;
    }
}
```

Para consumidor com inbox, acrescente o decorator descrito em `outbox-inbox.md`.

## Regras

- ACK só depois que o handler terminar; NACK com `requeue: false` na falha final (vai para a DLQ).
- Não faça `requeue: true` em loop: com quorum queue, `x-delivery-limit` manda a mensagem para a
  DLQ quando o limite estoura, mas o retry com backoff deve acontecer no consumidor.
- Erro permanente (JSON inválido, invariante de domínio violada) não entra no retry.
- Um canal por consumidor e um canal para o publisher; não compartilhe canal entre threads.
- A routing key é contrato público versionado (`.v1`); mudança incompatível cria `.v2`.
- DLQ precisa de alerta/monitoramento; mensagem em DLQ é incidente, não descarte.
