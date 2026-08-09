# Estrutura de Pastas Detalhada por Camada

Detalhamento das pastas internas de cada modulo. Para a visao geral multi-modulo e as regras, veja o SKILL.md.

## Domain Layer (Modelo Puro)

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

## Application Layer (Use Cases)

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

## API Layer (REST)

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

## Infra Layer (Persistence/External)

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

# Convencoes de Pacotes (por Feature)

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
