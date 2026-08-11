# Monolito Modular — Exemplo

Um host único (`Host/`) compõe módulos independentes. Cada módulo é uma Clean Architecture
completa em miniatura (Domain/Application/Infrastructure) e só expõe um contrato público restrito
para os demais módulos. Use este modelo quando o domínio já tem fronteiras claras, mas o custo
operacional de vários serviços ainda não se justifica.

## Estrutura de Pastas

```text
ProjectName.sln
src/
├── Modules/
│   ├── Orders/
│   │   ├── Orders.Domain/            # entidades, invariantes, portas do módulo
│   │   ├── Orders.Application/       # commands, queries, handlers
│   │   ├── Orders.Infrastructure/    # EF Core, repositórios, DbContext próprio
│   │   ├── Orders.Contracts/         # ÚNICO ponto visível para outros módulos: DTOs + eventos
│   │   └── Orders.Api/               # endpoints do módulo (Minimal API ou controllers)
│   ├── Billing/
│   │   ├── Billing.Domain/
│   │   ├── Billing.Application/
│   │   ├── Billing.Infrastructure/
│   │   ├── Billing.Contracts/
│   │   └── Billing.Api/
│   └── SharedKernel/
│       └── SharedKernel.csproj       # tipos base (Entity, ValueObject, IDomainEvent) — sem regra de negócio
└── Host/
    └── ProjectName.Host/             # único processo ASP.NET Core; referencia só os *.Api e *.Contracts
Tests/
├── Orders.UnitTests/
├── Orders.IntegrationTests/
└── ProjectName.End2EndTests/         # end-to-end contra o Host completo
```

## Regra de fronteira entre módulos

1. Um módulo referencia livremente seu próprio `Domain`/`Application`/`Infrastructure`.
2. Um módulo **nunca** referencia `Domain`, `Application` ou `Infrastructure` de outro módulo —
   apenas o `Contracts` do outro módulo (DTOs e eventos, sem entidade EF, sem regra de negócio).
3. `SharedKernel` contém só abstrações genéricas (`Entity<TId>`, `IDomainEvent`,
   `Result<T>`). Se uma regra de negócio for parar lá, ela deveria estar em um módulo.
4. Comunicação síncrona entre módulos usa a interface exposta em `Contracts`, resolvida via DI —
   nunca chamada HTTP interna dentro do mesmo processo.
5. Comunicação assíncrona (ex.: `Orders` avisa `Billing` que um pedido fechou) usa um dispatcher de
   eventos in-process — o mesmo princípio do dispatcher nativo de CQRS (`examples/cqrs.md`), sem
   MediatR.

```csharp
// Modules/Orders/Orders.Contracts/IOrderReadService.cs
// Único ponto de acesso que Billing pode enxergar de Orders.
public interface IOrderReadService
{
    Task<OrderSummaryDto> GetSummaryAsync(int orderId, CancellationToken cancellationToken);
}

// Modules/Orders/Orders.Contracts/OrderClosedEvent.cs
public sealed record OrderClosedEvent(int OrderId, string CustomerEmail, decimal Total) : IDomainEvent;
```

```csharp
// Modules/Billing/Billing.Application/EventHandlers/OrderClosedHandler.cs
// Billing reage ao evento sem conhecer Orders.Domain ou Orders.Infrastructure.
public class OrderClosedHandler : IDomainEventHandler<OrderClosedEvent>
{
    private readonly IInvoiceRepository _invoices;

    public OrderClosedHandler(IInvoiceRepository invoices) => _invoices = invoices;

    public async Task HandleAsync(OrderClosedEvent domainEvent, CancellationToken cancellationToken)
    {
        var invoice = new Invoice(domainEvent.OrderId, domainEvent.CustomerEmail, domainEvent.Total);
        await _invoices.AddAsync(invoice, cancellationToken);
    }
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
extrair um módulo para um microsserviço sem reescrever o Domain — só a Infrastructure muda de
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
