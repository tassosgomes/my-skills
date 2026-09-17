# Mensageria — RabbitMQ com `RabbitMQ.Client` 7

Client oficial com API assíncrona, sem wrapper. Garantia: at-least-once; todo consumidor é
idempotente por natureza ou usa inbox (`outbox-inbox.md`).

## Estrutura

```text
ProjectName.Infra.Messaging/
├── RabbitMqTelemetry.cs             # ActivitySource "ProjectName.Messaging" + header traceparent
├── Configuration/
│   ├── RabbitMqOptions.cs           # SectionName "RabbitMQ", ValidateOnStart
│   └── EventRoutes.cs               # tipo do evento → routing key
├── Connection/
│   └── RabbitMqConnectionProvider.cs  # singleton, uma conexão por processo, criada async sob SemaphoreSlim
├── Topology/
│   ├── QueueBinding.cs
│   └── RabbitMqTopologyInitializer.cs # IHostedService
├── Publishing/
│   ├── RabbitMqPublisher.cs         # singleton, um canal com publisher confirms
│   └── OutboxPublisherWorker.cs
└── Consuming/
    ├── IMessageHandler.cs
    ├── MessageContext.cs
    ├── RabbitMqConsumerWorker.cs    # BackgroundService genérico por fila
    └── InboxMessageHandler.cs
```

A regra de negócio do consumo fica em `Api/MessageHandlers/{Evento}MessageHandler.cs`, que só
chama um caso de uso.

## Decisões

| Tema | Decisão |
|---|---|
| Conexão | Uma por processo; `AutomaticRecoveryEnabled` e `TopologyRecoveryEnabled`; `ClientProvidedName` = nome do serviço; nunca `.GetAwaiter().GetResult()` |
| Canais | Um por consumidor e um para o publisher; canal não é compartilhado entre threads |
| Exchange de eventos | `{servico}.events`, tipo `topic`, durável |
| Dead letter | Exchange `{servico}.events.dlx` (`direct`) e fila `{fila}.dlq` por fila |
| Filas | Quorum, duráveis, nome `{servico}.{evento-em-kebab}` (`catalog.video-encoded`) |
| Poison message | `x-delivery-limit` = `RabbitMqOptions.DeliveryLimit` (padrão 5) |
| Routing key | `{servico}.{agregado}.{evento}.v{n}`, mapeada em `EventRoutes`, nunca derivada do nome da classe |
| Ordem de start | `RabbitMqTopologyInitializer` registrado antes do `OutboxPublisherWorker` e dos consumidores |
| Publicação | Só pelo `OutboxPublisherWorker`; `publisherConfirmationsEnabled` e `publisherConfirmationTrackingEnabled`; `mandatory: true`; `DeliveryMode.Persistent` |
| Propriedades | `MessageId` = Id do outbox (= `EventId`, UUIDv7), `Type` = nome do evento, `ContentType` `application/json`, header `traceparent` |
| Serialização | `System.Text.Json` com `JsonSerializerDefaults.Web` |
| Prefetch | `RabbitMqOptions.PrefetchCount` (padrão 10) |
| Consumo | `autoAck: false`; um escopo de DI por mensagem |
| Retry | Polly `ResiliencePipeline` no consumidor: 3 tentativas, backoff exponencial com jitter a partir de 1 s |
| Erro permanente | `JsonException`, `EntityValidationException` e `MessageId` inválido não entram no retry |
| Falha final | Log `Error` e `BasicNackAsync(requeue: false)` → DLQ; nunca `requeue: true` em loop |
| DLQ | Tem alerta; mensagem em DLQ é incidente |

## Topologia

```csharp
// per binding, inside RabbitMqTopologyInitializer.StartAsync
await channel.QueueDeclareAsync($"{binding.Queue}.dlq", durable: true, exclusive: false, autoDelete: false,
    arguments: new Dictionary<string, object?> { ["x-queue-type"] = "quorum" }, cancellationToken: cancellationToken);
await channel.QueueBindAsync($"{binding.Queue}.dlq", deadLetterExchange, binding.Queue, cancellationToken: cancellationToken);

await channel.QueueDeclareAsync(binding.Queue, durable: true, exclusive: false, autoDelete: false,
    arguments: new Dictionary<string, object?>
    {
        ["x-queue-type"] = "quorum",
        ["x-dead-letter-exchange"] = deadLetterExchange,
        ["x-dead-letter-routing-key"] = binding.Queue,
        ["x-delivery-limit"] = options.DeliveryLimit
    },
    cancellationToken: cancellationToken);
await channel.QueueBindAsync(binding.Queue, options.Exchange, binding.RoutingKey, cancellationToken: cancellationToken);
```

## Fluxo de uma entrega

```csharp
// RabbitMqConsumerWorker<TMessage>.HandleDeliveryAsync (core)
try
{
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
        await scope.ServiceProvider.GetRequiredService<IMessageHandler<TMessage>>().HandleAsync(message, context, token);
    }, stoppingToken);

    await _channel!.BasicAckAsync(delivery.DeliveryTag, multiple: false, CancellationToken.None);
}
catch (Exception ex) when (ex is not OperationCanceledException)
{
    _logger.LogError(ex, "Message {MessageId} from {Queue} sent to DLQ", context.MessageId, _queue);
    await _channel!.BasicNackAsync(delivery.DeliveryTag, multiple: false, requeue: false, CancellationToken.None);
}
```

## Registro

```csharp
// Api/Extensions/MessagingExtensions.cs
services.AddOptions<RabbitMqOptions>()
    .Bind(configuration.GetSection(RabbitMqOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

services.AddSingleton<RabbitMqConnectionProvider>();
services.AddSingleton<RabbitMqPublisher>();
services.AddHostedService<RabbitMqTopologyInitializer>();     // first
services.AddHostedService<OutboxPublisherWorker>();

services.AddRabbitMqConsumer<VideoEncodedMessage, VideoEncodedMessageHandler>(
    queue: "catalog.video-encoded",
    routingKey: "encoder.video.encoded.v1");
```

`AddRabbitMqConsumer<TMessage, THandler>` registra o `QueueBinding` (singleton), o handler (scoped)
e um `RabbitMqConsumerWorker<TMessage>` para a fila. Consumidor com inbox recebe também
`services.Decorate<IMessageHandler<T>, InboxMessageHandler<T>>()`.

## Telemetria

- Publisher cria span `publish {routingKey}` (`ActivityKind.Producer`) filho do `traceparent`
  gravado no outbox; consumidor cria `process {queue}` (`ActivityKind.Consumer`) filho do header.
- Atributos `messaging.system`, `messaging.destination.name`, `messaging.message.id`.
- `.AddSource(RabbitMqTelemetry.SourceName)` no OpenTelemetry (`dotnet-production-readiness`).
