# Monolito Modular

Um host único compõe módulos. Cada módulo é uma Clean Architecture completa em miniatura e só
expõe `Contracts` para os demais.

## Estrutura

```text
ProjectName.slnx
src/
├── Modules/
│   ├── Orders/
│   │   ├── ProjectName.Orders.Domain/
│   │   ├── ProjectName.Orders.Application/
│   │   ├── ProjectName.Orders.Infra.Data/      # DbContext, schema e outbox próprios
│   │   ├── ProjectName.Orders.Contracts/       # ÚNICO ponto visível a outros módulos: interfaces de leitura, DTOs, eventos de integração
│   │   └── ProjectName.Orders.Api/             # {Agregado}Endpoints + AddOrdersModule/MapOrdersModule
│   └── Billing/
│       └── ... (mesma estrutura)
├── ProjectName.SharedKernel/                   # SeedWork e Result<T>; nenhuma regra de negócio
└── ProjectName.Host/                           # único processo; referencia só *.Api
tests/
├── ProjectName.Tests.Common/
├── ProjectName.ArchitectureTests/              # regras de fronteira entre módulos
├── ProjectName.Orders.UnitTests/
├── ProjectName.Orders.IntegrationTests/
└── ProjectName.EndToEndTests/                  # HTTP contra o Host completo
```

## Regras de fronteira

1. Um módulo nunca referencia `Domain`, `Application`, `Infra.Data` ou `Api` de outro módulo; só
   `Contracts`.
2. `Contracts` não contém entidade, `DbContext` nem regra de negócio.
3. `SharedKernel` não depende de nenhum módulo.
4. `Host` referencia apenas os `*.Api`; cada `*.Api` referencia o próprio `Contracts` e o próprio
   `Infra.*` para compor a DI.
5. Comunicação síncrona entre módulos: interface em `Contracts` resolvida pela DI, nunca HTTP
   interno.
6. Comunicação assíncrona: evento de integração gravado no outbox do módulo de origem; o worker
   entrega aos handlers dos outros módulos (ou publica no RabbitMQ quando o módulo se prepara para
   virar serviço). Nunca chame handler de outro módulo dentro da transação do caso de uso.
7. Banco único com schema por módulo (`orders`, `billing`): cada `DbContext` usa `HasDefaultSchema`
   e sua própria migrations history table no schema do módulo.

Todas as regras acima são verificadas em `ProjectName.ArchitectureTests`
(`dotnet-testing/examples/architecture-tests.md`).

## Contrato e reação entre módulos

```csharp
// Modules/Orders/ProjectName.Orders.Contracts/IOrderReadService.cs
public interface IOrderReadService
{
    Task<OrderSummaryDto?> GetSummaryAsync(Guid orderId, CancellationToken cancellationToken);
}

// Modules/Orders/ProjectName.Orders.Contracts/OrderClosedIntegrationEvent.cs
public sealed record OrderClosedIntegrationEvent(Guid OrderId, string CustomerEmail, decimal Total);

// Modules/Billing/ProjectName.Billing.Api/IntegrationEventHandlers/OrderClosedHandler.cs
public sealed class OrderClosedHandler(ICreateInvoice createInvoice) : IIntegrationEventHandler<OrderClosedIntegrationEvent>
{
    public Task HandleAsync(OrderClosedIntegrationEvent integrationEvent, CancellationToken cancellationToken)
        => createInvoice.ExecuteAsync(
            new CreateInvoiceInput(integrationEvent.OrderId, integrationEvent.CustomerEmail, integrationEvent.Total),
            cancellationToken);
}
```

## Registro do módulo

Cada módulo expõe um `Add{Modulo}Module` e um `Map{Modulo}Module`; o `Program.cs` do Host só os
encadeia.

```csharp
// Modules/Orders/ProjectName.Orders.Api/OrdersModuleExtensions.cs
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
        endpoints.MapOrderEndpoints();          // MapGroup("v1/orders"), api-layer.md
        return endpoints;
    }
}
```

## Quando não usar

Módulos que já precisam de deploy ou escala independentes vão para `microservices.md`. Domínio sem
fronteiras claras fica na API simples.
