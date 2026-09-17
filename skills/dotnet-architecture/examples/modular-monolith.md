# Monolito Modular — Exemplo

Um host único (`Host/`) compõe módulos independentes. Cada módulo é uma Clean Architecture
completa em miniatura (Domain/Application/Infra.Data) e só expõe um contrato público restrito
para os demais módulos. Use este modelo quando o domínio já tem fronteiras claras, mas o custo
operacional de vários serviços ainda não se justifica.

## Estrutura de Pastas

```text
ProjectName.sln
src/
├── Modules/
│   ├── Orders/
│   │   ├── Orders.Domain/            # entidades, invariantes, portas do módulo
│   │   ├── Orders.Application/       # UseCases/{Agregado}/{CasoDeUso}/
│   │   ├── Orders.Infra.Data/        # EF Core, repositórios, DbContext e outbox próprios
│   │   ├── Orders.Contracts/         # ÚNICO ponto visível para outros módulos: DTOs + eventos
│   │   └── Orders.Api/               # endpoints do módulo (Minimal API ou controllers)
│   ├── Billing/
│   │   ├── Billing.Domain/
│   │   ├── Billing.Application/
│   │   ├── Billing.Infra.Data/
│   │   ├── Billing.Contracts/
│   │   └── Billing.Api/
│   └── SharedKernel/
│       └── SharedKernel.csproj       # SeedWork (Entity, AggregateRoot, ValueObject, DomainEvent) — sem regra de negócio
└── Host/
    └── ProjectName.Host/             # único processo ASP.NET Core; referencia só os *.Api e *.Contracts
tests/
├── Orders.UnitTests/
├── Orders.IntegrationTests/
└── ProjectName.EndToEndTests/        # testes HTTP contra o Host completo
```

## Regra de fronteira entre módulos

1. Um módulo referencia livremente seu próprio `Domain`/`Application`/`Infra.Data`.
2. Um módulo **nunca** referencia `Domain`, `Application` ou `Infra.Data` de outro módulo —
   apenas o `Contracts` do outro módulo (DTOs e eventos, sem entidade EF, sem regra de negócio).
3. `SharedKernel` contém só abstrações genéricas (o `SeedWork` de `domain-model.md` e
   `Result<T>`). Se uma regra de negócio for parar lá, ela deveria estar em um módulo.
4. Comunicação síncrona entre módulos usa a interface exposta em `Contracts`, resolvida via DI —
   nunca chamada HTTP interna dentro do mesmo processo.
5. Comunicação assíncrona (ex.: `Orders` avisa `Billing` que um pedido fechou) usa evento de
   integração gravado no outbox do módulo de origem, na mesma transação dos dados
   (`dotnet-dependency-config/examples/outbox-inbox.md`). O worker do outbox entrega o evento aos
   handlers dos outros módulos, resolvidos por tipo na DI, ou publica no RabbitMQ quando o módulo
   já se prepara para virar serviço. Nunca chame o handler de outro módulo dentro da transação do
   caso de uso.

```csharp
// Modules/Orders/Orders.Contracts/IOrderReadService.cs
// The only entry point Billing can see from Orders.
public interface IOrderReadService
{
    Task<OrderSummaryDto> GetSummaryAsync(int orderId, CancellationToken cancellationToken);
}

// Modules/Orders/Orders.Contracts/OrderClosedIntegrationEvent.cs
public sealed record OrderClosedIntegrationEvent(Guid OrderId, string CustomerEmail, decimal Total);
```

```csharp
// Modules/Billing/Billing.Api/IntegrationEventHandlers/OrderClosedHandler.cs
// Billing reacts without knowing Orders.Domain or Orders.Infra.Data; the handler only calls a use case.
public sealed class OrderClosedHandler : IIntegrationEventHandler<OrderClosedIntegrationEvent>
{
    private readonly ICreateInvoice _createInvoice;

    public OrderClosedHandler(ICreateInvoice createInvoice) => _createInvoice = createInvoice;

    public Task HandleAsync(OrderClosedIntegrationEvent integrationEvent, CancellationToken cancellationToken)
        => _createInvoice.ExecuteAsync(
            new CreateInvoiceInput(integrationEvent.OrderId, integrationEvent.CustomerEmail, integrationEvent.Total),
            cancellationToken);
}
```

## Registro do módulo no Host

Cada módulo expõe um método de extensão único para DI e outro para endpoints — o `Program.cs` do
Host só orquestra chamadas (ver `dotnet-program-setup` para o padrão completo de organização).

```csharp
// Modules/Orders/Orders.Api/OrdersModuleExtensions.cs
public static class OrdersModuleExtensions
{
    public static IServiceCollection AddOrdersModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<OrdersDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"),
                npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history", "orders")));

        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IOrderReadService, OrderReadService>();
        return services;
    }

    public static IEndpointRouteBuilder MapOrdersModule(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGroup("/api/orders").MapOrdersEndpoints();
        return endpoints;
    }
}
```

```csharp
// Host/ProjectName.Host/Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOrdersModule(builder.Configuration)
    .AddBillingModule(builder.Configuration);

var app = builder.Build();

app.MapOrdersModule();
app.MapBillingModule();

app.Run();
```

## Persistência: schema por módulo, banco único

Cada módulo tem seu próprio `DbContext` e sua própria migrations history table, isoladas por
schema (`orders`, `billing`) dentro do mesmo banco físico. Isso mantém o custo operacional de um
monolito (um único banco para operar) mas preserva o isolamento lógico necessário para, no futuro,
extrair um módulo para um microsserviço sem reescrever o Domain — só a Infra.Data muda de
schema para banco próprio.

```csharp
public class OrdersDbContext : DbContext
{
    public OrdersDbContext(DbContextOptions<OrdersDbContext> options) : base(options) { }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("orders");
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(OrdersDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
```

## Quando NÃO usar este modelo

- Se os módulos já precisam escalar, fazer deploy ou versionar de forma independente, vá direto
  para `examples/microservices.md`.
- Se o sistema é pequeno o suficiente para não ter fronteiras de domínio claras ainda, use
  `examples/project-setup.md` (API simples) e evolua para módulos quando a dor aparecer.
