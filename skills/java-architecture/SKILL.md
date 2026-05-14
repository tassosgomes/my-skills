---
name: java-architecture
description: "Padroes arquiteturais e estrutura de projeto Java Spring Boot 3+ / Java 21: Clean Architecture, Hexagonal, Repository Pattern com MapStruct, CQRS type-safe, tratamento de erros com ProblemDetail RFC 7807, estrutura multi-modulo Maven, organizacao de pacotes por feature/dominio. Usar quando: criar servico/modulo/feature Java; definir camadas domain/application/api/infra; implementar CQRS; configurar exception handler global; definir transacoes em use cases; organizar pastas e pacotes; configurar dependencias entre modulos."
---

# Java Architecture & Project Structure (Spring Boot 3+ / Java 21)

Documento normativo para geracao de codigo por LLMs.
Define os padroes obrigatorios de arquitetura, organizacao de camadas, estrutura de pastas, CQRS e tratamento de erros.
LLMs devem seguir estas regras estritamente.

---

# PARTE 1 — ARQUITETURA

---

# 1. Arquitetura Obrigatoria

## Modelo Arquitetural

Adotar **Clean Architecture / Hexagonal** com as seguintes camadas:

```
domain        -> modelo de negocio puro
application   -> casos de uso (orquestracao)
api           -> controllers REST (adapters)
infra         -> persistencia, integracoes externas
```

---

## 1.1 Regras da Camada Domain (Obrigatorias)

* NAO pode depender de Spring
* NAO pode depender de JPA
* NAO pode usar annotations de framework
* Deve conter regras de negocio
* Deve garantir consistencia interna
* Pode lancar DomainException

### Exemplo correto

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

---

# 2. Application Layer (Use Cases)

## Responsabilidades

* Orquestrar fluxo
* Chamar repositorios
* Coordenar dominio
* Controlar transacao

## Regras Obrigatorias

* Use cases de escrita devem ter `@Transactional`
* Queries devem usar `@Transactional(readOnly = true)`
* NAO colocar regra de negocio aqui
* NAO usar EntityManager diretamente

## Exemplo Padrao

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

---

# 3. Repository Pattern (Port & Adapter)

## Regras Obrigatorias

* Interface no `domain`
* Implementacao no `infra`
* MapStruct obrigatorio
* Nunca expor Entity JPA para outras camadas

## Domain Port

```java
public interface OrderRepository {

    Optional<Order> findById(Long id);

    Order save(Order order);

    void deleteById(Long id);

    List<Order> findAll();
}
```

## Infra Implementation

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

## MapStruct Obrigatorio

```java
@Mapper(componentModel = "spring")
public interface OrderMapper {

    Order toDomain(OrderEntity entity);

    OrderEntity toEntity(Order order);
}
```

---

# 4. CQRS Padrao (Sem Reflection Fragil)

## Proibido

* NAO resolver handler por nome de bean
* NAO usar string para encontrar handler
* NAO usar ApplicationContext.getBean com nome

## Interfaces Base

```java
public interface Command<R> {}
public interface Query<R> {}

public interface CommandHandler<C extends Command<R>, R> {
    R handle(C command);
}

public interface QueryHandler<Q extends Query<R>, R> {
    R handle(Q query);
}
```

## Dispatcher Type-Safe (Obrigatorio)

```java
@Component
public class SimpleDispatcher implements Dispatcher {

    private final Map<Class<?>, CommandHandler<?, ?>> commandHandlers;
    private final Map<Class<?>, QueryHandler<?, ?>> queryHandlers;

    public SimpleDispatcher(
            List<CommandHandler<?, ?>> commandHandlers,
            List<QueryHandler<?, ?>> queryHandlers
    ) {
        this.commandHandlers = commandHandlers.stream()
                .collect(Collectors.toMap(
                        this::resolveCommandType,
                        Function.identity()
                ));

        this.queryHandlers = queryHandlers.stream()
                .collect(Collectors.toMap(
                        this::resolveQueryType,
                        Function.identity()
                ));
    }

    @Override
    @SuppressWarnings("unchecked")
    public <R> R dispatch(Command<R> command) {
        CommandHandler<Command<R>, R> handler =
                (CommandHandler<Command<R>, R>) commandHandlers.get(command.getClass());

        if (handler == null) {
            throw new IllegalStateException("No handler found for " + command.getClass());
        }

        return handler.handle(command);
    }

    @Override
    @SuppressWarnings("unchecked")
    public <R> R query(Query<R> query) {
        QueryHandler<Query<R>, R> handler =
                (QueryHandler<Query<R>, R>) queryHandlers.get(query.getClass());

        if (handler == null) {
            throw new IllegalStateException("No handler found for " + query.getClass());
        }

        return handler.handle(query);
    }

    private Class<?> resolveCommandType(CommandHandler<?, ?> handler) {
        return GenericTypeResolver.resolveTypeArgument(
                handler.getClass(),
                CommandHandler.class
        );
    }

    private Class<?> resolveQueryType(QueryHandler<?, ?> handler) {
        return GenericTypeResolver.resolveTypeArgument(
                handler.getClass(),
                QueryHandler.class
        );
    }
}
```

---

# 5. API Layer

## Regras Obrigatorias

* Controllers devem ser finos
* Usar `@Valid`
* Nunca conter regra de negocio
* Apenas delegar ao Dispatcher ou UseCase

## Exemplo

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

---

# 6. Tratamento de Erros

## Obrigatorio

* Base class DomainException
* GlobalExceptionHandler
* ProblemDetail (RFC 7807)
* Nunca retornar stacktrace
* Logging estruturado

## Domain Exception Base

```java
public abstract class DomainException extends RuntimeException {

    protected DomainException(String message) {
        super(message);
    }
}
```

## Global Handler

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<ProblemDetail> handleDomainException(DomainException ex) {

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                ex.getMessage()
        );

        problem.setTitle("Business Rule Violation");

        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(
            MethodArgumentNotValidException ex
    ) {

        ProblemDetail problem = ProblemDetail.forStatus(
                HttpStatus.BAD_REQUEST
        );

        problem.setTitle("Validation Error");

        Map<String, String> errors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        FieldError::getDefaultMessage
                ));

        problem.setProperty("errors", errors);

        return ResponseEntity.badRequest().body(problem);
    }
}
```

---

# 7. Result Pattern (Uso Restrito)

## Regra

* NAO usar Result como padrao geral
* Usar apenas quando evitar exception for estrategico
* Exemplo: integracoes externas resilientes

Padrao principal do projeto: **Exception-driven flow**

---

# PARTE 2 — ESTRUTURA DE PASTAS E MODULOS

---

# 8. Estrutura Multi-Modulo Maven

```
financeiro/
├── pom.xml                          # POM pai (agregador)
│
├── domain/                          # Modelo puro
│   ├── pom.xml
│   └── src/main/java/com/company/project/domain/
│       ├── entity/
│       ├── event/
│       ├── exception/
│       └── repository/ (interfaces - ports)
│
├── application/                     # Use cases
│   ├── pom.xml
│   └── src/main/java/com/company/project/application/
│       ├── usecase/
│       ├── dto/
│       ├── mapper/
│       ├── validator/
│       └── service/
│
├── api/                             # Controllers/REST
│   ├── pom.xml
│   └── src/main/java/com/company/project/api/
│       ├── controller/
│       ├── filter/
│       ├── config/
│       └── response/
│
├── infra/                           # Persistence/External
│   ├── pom.xml
│   └── src/main/java/com/company/project/infra/
│       ├── persistence/
│       ├── config/
│       ├── adapter/
│       └── migration/
│
└── tests/                           # Integrated Tests
    ├── pom.xml
    └── src/test/java/com/company/project/
        ├── unit/
        ├── integration/
        └── e2e/
```

---

# 9. Organizacao por Camada

## 9.1 Domain Layer (Modelo Puro)

```
domain/src/main/java/com/company/project/domain/
├── entity/
│   ├── Order.java
│   ├── OrderItem.java
│   └── BaseEntity.java
├── event/
│   ├── DomainEvent.java
│   └── OrderCreatedEvent.java
├── exception/
│   ├── DomainException.java
│   └── InvalidOrderException.java
├── repository/
│   ├── OrderRepository.java
│   └── Repository.java (base)
└── value/
    ├── Money.java
    └── OrderStatus.java
```

Caracteristicas:
- Zero dependencias externas (nenhum Spring, JPA no codigo domain)
- Apenas codigo POJO/record
- Logica de negocio concentrada aqui
- Interfaces de repositorios (ports)

## 9.2 Application Layer (Use Cases)

```
application/src/main/java/com/company/project/application/
├── usecase/
│   ├── CreateOrderUseCase.java
│   └── GetOrderUseCase.java
├── command/
│   ├── Command.java (interface)
│   └── CreateOrderCommand.java
├── query/
│   ├── Query.java (interface)
│   └── GetOrderQuery.java
├── dto/
│   ├── OrderDto.java
│   └── OrderResponse.java
├── mapper/
│   └── OrderMapper.java
├── validator/
│   └── OrderValidator.java
└── service/
    └── OrderService.java
```

## 9.3 API Layer (REST)

```
api/src/main/java/com/company/project/api/
├── controller/
│   ├── OrderController.java
│   └── HealthController.java
├── config/
│   ├── WebConfig.java
│   └── OpenApiConfig.java
├── filter/
│   └── CorrelationIdFilter.java
├── handler/
│   └── GlobalExceptionHandler.java
└── Application.java (main)
```

## 9.4 Infra Layer (Persistence/External)

```
infra/src/main/java/com/company/project/infra/
├── persistence/
│   ├── entity/
│   │   ├── OrderEntity.java (JPA)
│   │   └── OrderItemEntity.java
│   ├── repository/
│   │   ├── OrderJpaRepository.java (Spring Data)
│   │   ├── OrderRepositoryImpl.java (implementacao do port)
│   │   └── OrderMapper.java
│   └── migration/
│       ├── V001__initial_schema.sql
│       └── V002__add_indexes.sql
├── config/
│   ├── JpaConfiguration.java
│   └── FlywayConfiguration.java
├── adapter/
│   └── http/
│       └── ExternalApiAdapter.java
└── cache/
    └── CacheConfiguration.java
```

---

# 10. Convencoes de Pacotes (por Feature)

```
com.company.project
├── domain
│   ├── user/
│   │   ├── entity/User.java
│   │   ├── exception/UserNotFoundException.java
│   │   └── repository/UserRepository.java
│   └── order/
│       ├── entity/Order.java
│       ├── value/OrderStatus.java
│       └── repository/OrderRepository.java
│
├── application
│   ├── user/
│   │   ├── usecase/CreateUserUseCase.java
│   │   ├── dto/UserDto.java
│   │   └── mapper/UserMapper.java
│   └── order/
│       ├── usecase/CreateOrderUseCase.java
│       └── command/CreateOrderCommand.java
│
├── api
│   └── controller/
│       ├── UserController.java
│       └── OrderController.java
│
└── infra
    ├── user/
    │   ├── entity/UserEntity.java
    │   └── repository/UserRepositoryImpl.java
    └── order/
        ├── entity/OrderEntity.java
        └── repository/OrderRepositoryImpl.java
```

## Nomes de Arquivos

```
Padrao correto:
- Entity: Order.java (domain)
- Service: OrderService.java (application)
- Controller: OrderController.java (api)
- JPA Entity: OrderEntity.java (infra)
- Repository Interface: OrderRepository.java (domain)
- Repository Impl: OrderRepositoryImpl.java (infra)
- JPA Repository: OrderJpaRepository.java (infra)
- DTO: OrderDto.java (application)
- UseCase: CreateOrderUseCase.java (application)
- Test: OrderServiceTest.java

Evitar:
- OrdiniService.java (abreviaturas)
- IOrderRepository.java (interface prefix "I")
- order_service.java (snake_case)
```

---

# 11. Dependencias entre Modulos

```xml
<!-- api/pom.xml depende de application -->
<dependency>
    <groupId>com.company</groupId>
    <artifactId>financeiro-application</artifactId>
</dependency>

<!-- application/pom.xml depende de domain -->
<dependency>
    <groupId>com.company</groupId>
    <artifactId>financeiro-domain</artifactId>
</dependency>

<!-- infra/pom.xml depende de domain -->
<dependency>
    <groupId>com.company</groupId>
    <artifactId>financeiro-domain</artifactId>
</dependency>
```

Regras:
- **Domain**: sem dependencias externas
- **Application**: depende apenas de Domain
- **API**: depende de Application
- **Infra**: depende de Domain (implementa ports)
- **Tests**: depende de todos (para integracao)
- **Spring Boot**: apenas em api/infra

---

# 12. Checklist Obrigatorio

## Clean Architecture
- [ ] Domain sem framework
- [ ] Use case com @Transactional
- [ ] Controllers finos
- [ ] Infra isolada

## CQRS
- [ ] Um handler por operacao
- [ ] Dispatcher type-safe
- [ ] Commands e Queries imutaveis (record)

## Persistencia
- [ ] MapStruct obrigatorio
- [ ] deleteById ao inves de delete(entity)
- [ ] Nunca retornar JPA entity

## Erros
- [ ] DomainException base
- [ ] ProblemDetail RFC 7807
- [ ] Nunca expor stacktrace

## Estrutura de Pastas
- [ ] Estrutura multi-modulo Maven/Gradle
- [ ] Separacao clara de camadas (domain, application, api, infra)
- [ ] Cada modulo com seu pom.xml
- [ ] Convencoes de pacotes por feature/dominio
- [ ] Um arquivo por classe publica
- [ ] Nomes descritivos sem abreviacoes
- [ ] Dependencias entre modulos respeitadas
