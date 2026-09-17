# Microsserviços

Cada serviço é uma solution independente, com deploy, banco e ciclo de vida próprios.
Internamente segue a mesma Clean Architecture da API simples (`project-setup.md`); o que muda é a
fronteira entre serviços.

## Estrutura

```text
orders-service/
├── ProjectName.Orders.slnx
├── src/
│   ├── ProjectName.Orders.Api/
│   ├── ProjectName.Orders.Application/
│   ├── ProjectName.Orders.Domain/
│   ├── ProjectName.Orders.Infra.Data/
│   └── ProjectName.Orders.Infra.Messaging/
└── tests/
    ├── ProjectName.Orders.Tests.Common/
    ├── ProjectName.Orders.ArchitectureTests/
    ├── ProjectName.Orders.UnitTests/
    ├── ProjectName.Orders.IntegrationTests/
    └── ProjectName.Orders.EndToEndTests/

contracts/
└── ProjectName.Contracts/                # pacote NuGet interno: DTOs e eventos de integração
```

## Regras entre serviços

1. **Banco por serviço.** Nenhum serviço lê schema, view ou tabela de outro.
2. **Contrato é pacote NuGet versionado**, não projeto referenciado. Contém só DTOs e eventos de
   integração; nunca entidade ou `DbContext`.
3. **O Domain não referencia `Contracts`.** A conversão de evento de domínio para evento de
   integração acontece na Application antes de gravar no outbox; o consumo acontece em
   `Api/MessageHandlers`, que chama um caso de uso.
4. **Síncrono:** cliente tipado atrás de uma porta em `Application/Interfaces`, registrado com
   `IHttpClientFactory` e `AddStandardResilienceHandler` (`dotnet-performance`).
5. **Assíncrono:** RabbitMQ com outbox no produtor e consumidor idempotente ou com inbox
   (`dotnet-dependency-config`).
6. **Evolução aditiva do contrato:** campo novo opcional ou nova versão do pacote e da routing key
   (`.v2`); nunca mudar o significado de um campo existente.
7. **Correlação:** `traceparent` propagado via OpenTelemetry; todo log e span tem `service.name`.

Cada serviço tem seu `ArchitectureTests` com as regras da API simples mais a regra 3.

## Contrato compartilhado

```csharp
// contracts/ProjectName.Contracts/Orders/OrderClosedIntegrationEvent.cs
public sealed record OrderClosedIntegrationEvent(Guid OrderId, string CustomerEmail, decimal Total, DateTimeOffset OccurredAt);
```

```csharp
// billing-service — Api/MessageHandlers/OrderClosedMessageHandler.cs
public sealed class OrderClosedMessageHandler(ICreateInvoice createInvoice) : IMessageHandler<OrderClosedIntegrationEvent>
{
    // Naturally idempotent: CreateInvoice ignores an order that already has an invoice.
    // Without a natural key, decorate this handler with the inbox (outbox-inbox.md).
    public Task HandleAsync(OrderClosedIntegrationEvent message, MessageContext context, CancellationToken cancellationToken)
        => createInvoice.ExecuteAsync(new CreateInvoiceInput(message.OrderId, message.CustomerEmail, message.Total), cancellationToken);
}
```

## Quando não usar

Sem esteira de deploy independente por serviço, o resultado é um monolito distribuído (banco
compartilhado ou cadeia de chamadas síncronas). Nesse caso use `modular-monolith.md`.
