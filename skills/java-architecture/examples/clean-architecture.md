# Clean Architecture — Exemplos de Camadas

Exemplos de codigo para as camadas domain, application, infra (repository) e api, seguindo as regras obrigatorias da skill.

## Domain — Entidade com Regras de Negocio

Regras: nao depende de Spring/JPA, sem annotations de framework, contem regras de negocio, garante consistencia interna, pode lancar `DomainException`.

```java
public class Order {

    private Long id;
    private final String customerEmail;
    private final List<OrderItem> items = new ArrayList<>();
    private OrderStatus status;

    public Order(String customerEmail) {
        if (customerEmail == null || customerEmail.isBlank()) {
            throw new InvalidOrderException("Customer email is required");
        }

        this.customerEmail = customerEmail;
        this.status = OrderStatus.DRAFT;
    }

    public void addItem(Long productId, int quantity, BigDecimal price) {
        if (status != OrderStatus.DRAFT) {
            throw new InvalidOrderException("Cannot modify confirmed order");
        }

        items.add(new OrderItem(productId, quantity, price));
    }

    public void confirm() {
        if (items.isEmpty()) {
            throw new InvalidOrderException("Order must contain items");
        }

        this.status = OrderStatus.CONFIRMED;
    }

    public BigDecimal calculateTotal() {
        return items.stream()
                .map(i -> i.getPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // getters
}
```

## Application — Use Case

Regras: escrita com `@Transactional`, queries com `@Transactional(readOnly = true)`, orquestra fluxo/coordena dominio, NAO contem regra de negocio, NAO usa `EntityManager` diretamente.

```java
@Service
@Transactional
public class CreateOrderUseCase {

    private final OrderRepository repository;

    public CreateOrderUseCase(OrderRepository repository) {
        this.repository = repository;
    }

    public CreateOrderResponse execute(CreateOrderCommand command) {

        Order order = new Order(command.customerEmail());

        command.items().forEach(item ->
                order.addItem(item.productId(), item.quantity(), item.price())
        );

        order.confirm();

        Order saved = repository.save(order);

        return new CreateOrderResponse(
                saved.getId(),
                saved.getCustomerEmail()
        );
    }
}
```

## Repository Pattern (Port & Adapter)

Regras: interface (port) no `domain`, implementacao no `infra`, MapStruct obrigatorio, nunca expor Entity JPA para outras camadas.

### Domain Port

```java
public interface OrderRepository {

    Optional<Order> findById(Long id);

    Order save(Order order);

    void deleteById(Long id);

    List<Order> findAll();
}
```

### Infra Implementation

```java
@Repository
public class OrderRepositoryImpl implements OrderRepository {

    private final OrderJpaRepository jpaRepository;
    private final OrderMapper mapper;

    public OrderRepositoryImpl(
            OrderJpaRepository jpaRepository,
            OrderMapper mapper
    ) {
        this.jpaRepository = jpaRepository;
        this.mapper = mapper;
    }

    @Override
    public Optional<Order> findById(Long id) {
        return jpaRepository.findById(id)
                .map(mapper::toDomain);
    }

    @Override
    public Order save(Order order) {
        OrderEntity entity = mapper.toEntity(order);
        OrderEntity saved = jpaRepository.save(entity);
        return mapper.toDomain(saved);
    }

    @Override
    public void deleteById(Long id) {
        jpaRepository.deleteById(id);
    }

    @Override
    public List<Order> findAll() {
        return jpaRepository.findAll()
                .stream()
                .map(mapper::toDomain)
                .toList();
    }
}
```

### MapStruct Obrigatorio

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {

    Order toDomain(OrderEntity entity);

    OrderEntity toEntity(Order order);
}
```

## API — Controller Fino

Regras: controllers finos, usar `@Valid`, nunca conter regra de negocio, apenas delegar ao Dispatcher ou UseCase.

```java
@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final Dispatcher dispatcher;

    public OrderController(Dispatcher dispatcher) {
        this.dispatcher = dispatcher;
    }

    @PostMapping
    public ResponseEntity<CreateOrderResponse> createOrder(
            @Valid @RequestBody CreateOrderCommand command
    ) {
        CreateOrderResponse response = dispatcher.dispatch(command);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<GetOrderResponse> getOrder(@PathVariable Long id) {
        return ResponseEntity.ok(
                dispatcher.query(new GetOrderQuery(id))
        );
    }
}
```
