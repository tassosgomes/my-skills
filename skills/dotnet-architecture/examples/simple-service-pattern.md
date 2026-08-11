# Service Pattern Simples (sem CQRS) — Exemplo

Alternativa ao CQRS nativo para casos de uso sem complexidade que justifique commands/queries e
dispatcher. As camadas continuam as mesmas (Domain/Application/Infrastructure/API) — o que muda é
só a Application: um serviço por feature/aggregate, com métodos assíncronos diretos, em vez de uma
classe de command/query e um handler por operação.

## Interface e Implementação

```csharp
// Application Layer
public interface IOrderService
{
    Task<OrderResponse> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken);
    Task<OrderResponse> GetByIdAsync(int id, CancellationToken cancellationToken);
    Task<IReadOnlyList<OrderResponse>> ListAsync(CancellationToken cancellationToken);
    Task UpdateStatusAsync(int id, OrderStatus status, CancellationToken cancellationToken);
}

public class OrderService : IOrderService
{
    private readonly IOrderRepository _repository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IValidator<CreateOrderRequest> _validator;
    private readonly ILogger<OrderService> _logger;

    public OrderService(
        IOrderRepository repository,
        IUnitOfWork unitOfWork,
        IValidator<CreateOrderRequest> validator,
        ILogger<OrderService> logger)
    {
        _repository = repository;
        _unitOfWork = unitOfWork;
        _validator = validator;
        _logger = logger;
    }

    public async Task<OrderResponse> CreateAsync(CreateOrderRequest request, CancellationToken cancellationToken)
    {
        await _validator.ValidateAndThrowAsync(request, cancellationToken);

        var order = new Order(request.CustomerEmail);
        foreach (var item in request.Items)
            order.AddItem(item.ProductId, item.Quantity, item.Price);

        await _repository.AddAsync(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Order {OrderId} created for {CustomerEmail}", order.Id, order.CustomerEmail);

        return new OrderResponse(order.Id, order.CustomerEmail, order.Status);
    }

    public async Task<OrderResponse> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var order = await _repository.GetByIdAsync(id, cancellationToken);
        return order is null
            ? throw new OrderNotFoundException(id)
            : new OrderResponse(order.Id, order.CustomerEmail, order.Status);
    }

    public async Task<IReadOnlyList<OrderResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var orders = await _repository.GetAllAsync(cancellationToken);
        return orders.Select(o => new OrderResponse(o.Id, o.CustomerEmail, o.Status)).ToList();
    }

    public async Task UpdateStatusAsync(int id, OrderStatus status, CancellationToken cancellationToken)
    {
        var order = await _repository.GetByIdAsync(id, cancellationToken)
            ?? throw new OrderNotFoundException(id);

        order.ChangeStatus(status);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }
}
```

## Controller

```csharp
[ApiController]
[Route("api/orders")]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _orderService;

    public OrdersController(IOrderService orderService) => _orderService = orderService;

    [HttpPost]
    public async Task<IActionResult> CreateAsync([FromBody] CreateOrderRequest request, CancellationToken cancellationToken)
    {
        var result = await _orderService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetByIdAsync), new { id = result.Id }, result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetByIdAsync(int id, CancellationToken cancellationToken)
    {
        var result = await _orderService.GetByIdAsync(id, cancellationToken);
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> ListAsync(CancellationToken cancellationToken)
    {
        var result = await _orderService.ListAsync(cancellationToken);
        return Ok(result);
    }

    [HttpPatch("{id}/status")]
    public async Task<IActionResult> UpdateStatusAsync(int id, [FromBody] OrderStatus status, CancellationToken cancellationToken)
    {
        await _orderService.UpdateStatusAsync(id, status, cancellationToken);
        return NoContent();
    }
}
```

## Registro no DI

```csharp
// Extensions/ApplicationServicesExtensions.cs (ver dotnet-program-setup)
public static class ApplicationServicesExtensions
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IOrderService, OrderService>();
        services.AddValidatorsFromAssembly(typeof(IOrderService).Assembly);
        return services;
    }
}
```

## O que continua igual em relação ao CQRS

- `Domain` continua puro, sem depender de ASP.NET Core ou EF Core.
- Validação continua via FluentValidation, antes de qualquer efeito colateral.
- `CancellationToken` continua propagado em toda a cadeia assíncrona.
- Repositório continua atrás de interface no Domain/Application; entidade EF não vaza para a API.
- Erros continuam exceções específicas tratadas pelo `IExceptionHandler` global
  (`examples/error-handling.md`).

## O que muda

- Não há `ICommand<T>`/`IQuery<T>`, não há `Dispatcher`, não há um handler por operação — um único
  serviço concentra os casos de uso relacionados ao aggregate.
- O controller injeta a interface do serviço diretamente, sem indireção por dispatcher.
- Testar um caso de uso é testar um método do serviço, não montar um command e resolver um handler
  por reflection.

## Migrando para CQRS depois

Se o serviço crescer (muitos métodos, branches condicionais por tipo de operação, necessidade de
um modelo de leitura diferente do de escrita), extraia os métodos mais complexos para
commands/queries seguindo `examples/cqrs.md` — não precisa migrar o serviço inteiro de uma vez;
os dois padrões podem conviver no mesmo projeto enquanto a migração for gradual, desde que cada
caso de uso individual siga um dos dois padrões por completo, nunca uma mistura dos dois no mesmo
método.
