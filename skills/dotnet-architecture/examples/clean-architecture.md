# Clean Architecture — Exemplo

Exemplo de fluxo entre camadas: entidade de dominio com regras de negocio encapsuladas e handler de aplicacao orquestrando o caso de uso.

```csharp
// Domain Layer
public class Order
{
    public int Id { get; private set; }
    public string CustomerEmail { get; private set; }
    public List<OrderItem> Items { get; private set; } = new();
    public OrderStatus Status { get; private set; }

    public void AddItem(int productId, int quantity, decimal price)
    {
        if (Status != OrderStatus.Draft)
            throw new InvalidOperationException("Cannot modify a confirmed order");

        Items.Add(new OrderItem(productId, quantity, price));
    }
}

// Application Layer
public class CreateOrderHandler : ICommandHandler<CreateOrderCommand, OrderResponse>
{
    private readonly IOrderRepository _repository;
    private readonly IUnitOfWork _unitOfWork;

    public async Task<OrderResponse> HandleAsync(CreateOrderCommand request, CancellationToken cancellationToken)
    {
        var order = new Order(request.CustomerEmail);

        foreach (var item in request.Items)
        {
            order.AddItem(item.ProductId, item.Quantity, item.Price);
        }

        await _repository.AddAsync(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new OrderResponse(order.Id, order.CustomerEmail);
    }
}
```
