# Mensageria — RabbitMQ com Rmq.CloudEvents

> **Rmq.CloudEvents** e a biblioteca padrao para mensageria com RabbitMQ.
> - NuGet: https://www.nuget.org/packages/Rmq.CloudEvents
> - GitHub: https://github.com/tassosgomes/dotnet-rabbimq-lib

### Por que usar Rmq.CloudEvents?
- **Quorum Queues**: Declaracao automatica de filas quorum com DLQ (`<queue>.dlq`) e DLX
- **CloudEvents**: Wrapping/unwrapping transparente no formato CloudEvents JSON (`application/cloudevents+json`)
- **Retry com Polly**: Retry exponencial integrado para publish e consumer handler
- **DI-first**: Registro nativo para ASP.NET Core e Worker Services
- **Consumer Pipeline**: ACK automatico em sucesso, NACK (`requeue: false`) em falha final com roteamento para DLQ

### Requisitos
- .NET SDK 8.0+
- RabbitMQ 3.8+ (quorum queues)

### Instalacao
```bash
dotnet add package Rmq.CloudEvents
```

### Configuracao de Servicos
```csharp
using Rmq.CloudEvents.Configuration;
using Rmq.CloudEvents.Extensions;

builder.Services.AddRmqCloudEvents(options =>
{
    options.Connection = new RmqConnectionOptions
    {
        HostName = "localhost",
        Port = 5672,
        UserName = "guest",
        Password = "guest",
        VirtualHost = "/"
    };

    options.DefaultCloudEvents = new CloudEventsOptions
    {
        Source = new Uri("/my-service", UriKind.Relative),
        DefaultType = "com.mycompany.events"
    };
});
```

### Configuracao via appsettings.json
```json
{
  "RabbitMQ": {
    "Connection": {
      "HostName": "localhost",
      "Port": 5672,
      "UserName": "guest",
      "Password": "guest",
      "VirtualHost": "/"
    },
    "DefaultCloudEvents": {
      "Source": "/my-service",
      "DefaultType": "com.mycompany.events"
    },
    "DefaultRetry": {
      "MaxAttempts": 5,
      "InitialDelay": "00:00:01",
      "BackoffType": "Exponential",
      "UseJitter": true
    }
  }
}
```

### Modelo de Configuracao (`RmqOptions`)

| Propriedade | Tipo | Descricao |
|---|---|---|
| `Connection` | `RmqConnectionOptions` | `HostName`, `Port`, `UserName`, `Password`, `VirtualHost`, `Ssl`, `NetworkRecoveryInterval` |
| `DefaultCloudEvents` | `CloudEventsOptions` | `Source`, `DefaultType`, `SpecVersion` |
| `DefaultRetry` | `RetryOptions` | `MaxAttempts` (default 5), `InitialDelay` (default 1s), `BackoffType` (Exponential/Linear/Constant), `UseJitter` (default true) |
| `Queues` | `Dictionary<string, QueueOptions>` | Overrides por fila: tamanho quorum, delivery limit, retry, sufixo DLQ |

### Registrar um Consumer
```csharp
using Rmq.CloudEvents.Consuming;

// Registra o consumer associado a fila "orders"
builder.Services.AddRmqConsumer<OrderCreated, OrderCreatedHandler>("orders");

// Handler implementa IRmqMessageHandler<T>
public sealed class OrderCreatedHandler : IRmqMessageHandler<OrderCreated>
{
    public Task HandleAsync(
        OrderCreated message,
        MessageContext context,
        CancellationToken cancellationToken)
    {
        Console.WriteLine(
            $"Order {message.OrderId} received from {context.QueueName}, eventId={context.EventId}");
        return Task.CompletedTask;
    }
}

// Mensagem como record imutavel
public sealed record OrderCreated(int OrderId, string CustomerId, decimal Total);
```

### Publicar Mensagens
```csharp
using Rmq.CloudEvents.Publishing;

var publisher = serviceProvider.GetRequiredService<IRmqPublisher>();

// Publicacao basica
await publisher.PublishAsync(
    queueName: "orders",
    payload: new OrderCreated(1, "cust-001", 99.90m),
    cloudEventType: "com.mycompany.order.created.v1",
    cancellationToken: cancellationToken);

// Publicacao com headers customizados
await publisher.PublishAsync(
    queueName: "orders",
    payload: new OrderCreated(2, "cust-002", 149.50m),
    headers: new Dictionary<string, object>
    {
        ["x-correlation-id"] = "corr-123",
        ["x-tenant"] = "tenant-a"
    },
    cancellationToken: cancellationToken);
```

### Comportamento em Runtime

**Publish:**
- Payload e envelopado como CloudEvent JSON
- Topologia da fila e declarada (idempotente) antes do primeiro publish
- Politica de retry trata erros transientes de RabbitMQ/rede

**Consume:**
- Mensagem e desenvelopada do CloudEvent; handler recebe apenas o payload
- Sucesso: ACK
- Falha final (apos retries): NACK com `requeue: false`, mensagem roteada para DLQ

### Fluxo de Retry e DLX
```
Publish request
    |---> Publish OK? --yes--> Main queue ---> Consume message
    |         |                                      |
    |        no                               Handler OK?
    |         |                              /          \
    |   Publish error                      yes          no
    |                                       |            |
    |                                      ACK     Retry left?
    |                                              /        \
    |                                            yes        no
    |                                             |          |
    |                                        Retry handler   NACK (no requeue)
    |                                                            |
    |                                                       DLX exchange
    |                                                            |
    |                                                       Queue.dlq
```
