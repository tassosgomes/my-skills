# Microsserviços — Exemplo

Cada serviço é uma solution independente, com deploy, banco e ciclo de vida próprios. Use este
modelo quando módulos já precisam escalar, ser implantados ou versionados separadamente — não
como ponto de partida padrão. Se essa necessidade ainda não existe, comece pelo Monolito Modular
(`examples/modular-monolith.md`) e extraia serviços quando a dor de escala/deploy aparecer.

## Estrutura (um repositório por serviço, ou uma pasta por serviço em monorepo)

```text
orders-service/
├── ProjectName.Orders.sln
├── src/
│   ├── 1-Services/ProjectName.Orders.API/
│   ├── 2-Application/ProjectName.Orders.Application/
│   ├── 3-Domain/ProjectName.Orders.Domain/
│   └── 4-Infra/ProjectName.Orders.Infra/
└── tests/
    ├── ProjectName.Orders.UnitTests/
    ├── ProjectName.Orders.IntegrationTests/
    └── ProjectName.Orders.End2EndTests/

billing-service/
├── ProjectName.Billing.sln
└── ... (mesma estrutura interna)

contracts/
└── ProjectName.Contracts/            # pacote NuGet compartilhado: só DTOs e eventos
    └── ProjectName.Contracts.csproj
```

Internamente cada serviço segue exatamente a Clean Architecture de `examples/project-setup.md` —
o que muda em relação a uma API simples é a fronteira *entre* serviços, não a fronteira *dentro*
de cada um.

## Regras não negociáveis entre serviços

1. **Banco por serviço.** Nenhum serviço acessa o schema/tabelas de outro diretamente, nem via
   view, nem via link de banco. Se `Billing` precisa de dados de `Orders`, ele pede pela API ou
   consome o evento publicado — nunca lê o banco de `Orders`.
2. **Contrato compartilhado é um pacote, não um projeto referenciado.** `ProjectName.Contracts`
   é publicado como pacote NuGet versionado (interno) contendo só DTOs de request/response e
   eventos de integração — nunca entidades de domínio, nunca `DbContext`.
3. **Comunicação síncrona** via HTTP com cliente tipado registrado em `IHttpClientFactory`,
   timeout explícito e Polly para retry/circuit breaker (detalhe de implementação em
   `dotnet-performance`).
4. **Comunicação assíncrona** via RabbitMQ + CloudEvents para eventos de integração
   (`dotnet-dependency-config/examples/messaging-rabbitmq.md`); cada serviço consumidor é
   responsável pela sua própria idempotência.
5. **Versionamento de contrato é aditivo.** Alterar um DTO publicado é breaking change; adicione
   campo novo opcional ou publique uma nova versão do pacote — nunca mude o significado de um
   campo existente sem coordenar os consumidores.
6. **Correlação entre serviços** propaga `traceparent`/`TraceId` via OpenTelemetry
   (`dotnet-observability`); todo log e span cita o `service.name` de origem.

## Exemplo de contrato compartilhado

```csharp
// contracts/ProjectName.Contracts/Events/OrderClosedIntegrationEvent.cs
public sealed record OrderClosedIntegrationEvent(
    Guid OrderId,
    string CustomerEmail,
    decimal Total,
    DateTimeOffset OccurredAt);
```

```csharp
// orders-service — publica o evento após persistir
public class CreateOrderHandler : ICommandHandler<CreateOrderCommand, OrderResponse>
{
    private readonly IOrderRepository _repository;
    private readonly IEventPublisher _publisher;

    public async Task<OrderResponse> HandleAsync(CreateOrderCommand command, CancellationToken cancellationToken)
    {
        var order = new Order(command.CustomerEmail);
        await _repository.AddAsync(order, cancellationToken);

        await _publisher.PublishAsync(
            new OrderClosedIntegrationEvent(order.Id, order.CustomerEmail, order.Total, DateTimeOffset.UtcNow),
            cancellationToken);

        return new OrderResponse(order.Id, order.CustomerEmail);
    }
}
```

```csharp
// billing-service — consome o mesmo pacote de contratos, banco e domínio próprios
public class OrderClosedConsumer : IConsumer<OrderClosedIntegrationEvent>
{
    private readonly IInvoiceRepository _invoices;

    public async Task ConsumeAsync(OrderClosedIntegrationEvent @event, CancellationToken cancellationToken)
    {
        if (await _invoices.ExistsForOrderAsync(@event.OrderId, cancellationToken))
            return; // idempotência: evento já processado

        var invoice = new Invoice(@event.OrderId, @event.CustomerEmail, @event.Total);
        await _invoices.AddAsync(invoice, cancellationToken);
    }
}
```

## Cliente HTTP tipado entre serviços

```csharp
// billing-service — consumindo orders-service via HTTP quando precisa de leitura síncrona
public interface IOrdersServiceClient
{
    Task<OrderSummaryDto?> GetOrderAsync(Guid orderId, CancellationToken cancellationToken);
}

public class OrdersServiceClient : IOrdersServiceClient
{
    private readonly HttpClient _httpClient;

    public OrdersServiceClient(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<OrderSummaryDto?> GetOrderAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var response = await _httpClient.GetAsync($"/api/orders/{orderId}", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound) return null;

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<OrderSummaryDto>(cancellationToken: cancellationToken);
    }
}

// billing-service — registro em Extensions/HttpClientsExtensions.cs (ver dotnet-program-setup)
services.AddHttpClient<IOrdersServiceClient, OrdersServiceClient>(client =>
{
    client.BaseAddress = new Uri(configuration["Services:Orders:BaseUrl"]!);
    client.Timeout = TimeSpan.FromSeconds(5);
})
.AddStandardResilienceHandler();
```

## Quando NÃO usar este modelo

- Times pequenos sem esteira de deploy independente por serviço tendem a recriar um "monolito
  distribuído": vários processos com o acoplamento de um único banco ou de chamadas síncronas em
  cadeia. Se isso acontecer, o modelo certo é `examples/modular-monolith.md`.
