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
│   ├── ProjectName.Orders.Api/
│   ├── ProjectName.Orders.Application/
│   ├── ProjectName.Orders.Domain/
│   ├── ProjectName.Orders.Infra.Data/
│   └── ProjectName.Orders.Infra.Messaging/
└── tests/
    ├── ProjectName.Orders.Tests.Common/
    ├── ProjectName.Orders.UnitTests/
    ├── ProjectName.Orders.IntegrationTests/
    └── ProjectName.Orders.EndToEndTests/

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
4. **Comunicação assíncrona** via RabbitMQ (`RabbitMQ.Client`) para eventos de integração, com
   outbox no produtor e idempotência (inbox quando a operação não é idempotente) no consumidor
   (`dotnet-dependency-config/examples/messaging-rabbitmq.md` e `dotnet-dependency-config/examples/outbox-inbox.md`). Nunca publique
   no broker de dentro do caso de uso: se o commit falhar depois, o evento já saiu.
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
// orders-service — the aggregate raises the event; the UnitOfWork writes it to the outbox in the same transaction
public sealed class CloseOrder : ICloseOrder
{
    private readonly IOrderRepository _orderRepository;
    private readonly IUnitOfWork _unitOfWork;

    public CloseOrder(IOrderRepository orderRepository, IUnitOfWork unitOfWork)
    {
        _orderRepository = orderRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<OrderModelOutput> ExecuteAsync(CloseOrderInput input, CancellationToken cancellationToken)
    {
        var order = await _orderRepository.GetAsync(input.OrderId, cancellationToken);
        NotFoundException.ThrowIfNull(order, $"Order '{input.OrderId}' not found");

        order!.Close(); // RaiseEvent(new OrderClosedEvent(...))

        await _orderRepository.UpdateAsync(order, cancellationToken);
        await _unitOfWork.CommitAsync(cancellationToken);

        return OrderModelOutput.FromOrder(order);
    }
}
// Convert OrderClosedEvent into the public OrderClosedIntegrationEvent contract before writing it to the outbox.
```

```csharp
// billing-service — consumes the same contracts package; own database and domain
public sealed class OrderClosedMessageHandler : IMessageHandler<OrderClosedIntegrationEvent>
{
    private readonly ICreateInvoice _createInvoice;

    public OrderClosedMessageHandler(ICreateInvoice createInvoice) => _createInvoice = createInvoice;

    // Naturally idempotent: CreateInvoice checks whether the order already has an invoice.
    // Without such a natural key, register this consumer with the inbox decorator (outbox-inbox.md).
    public Task HandleAsync(OrderClosedIntegrationEvent message, MessageContext context, CancellationToken cancellationToken)
        => _createInvoice.ExecuteAsync(
            new CreateInvoiceInput(message.OrderId, message.CustomerEmail, message.Total),
            cancellationToken);
}
```

## Cliente HTTP tipado entre serviços

```csharp
// billing-service — calls orders-service over HTTP when it needs a synchronous read
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

// billing-service — registered in Extensions/HttpClientsExtensions.cs (see dotnet-program-setup)
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
