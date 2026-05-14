---
name: java-performance
description: "Performance e otimizacao Java Spring Boot: consultas JPA otimizadas (fetch join, projecoes, paginacao eficiente), deteccao e correcao de N+1, QueryDSL e Spring Data Specification para queries dinamicas, estrategias de caching (Caffeine local, Redis distribuido), batch processing com EntityManager, WebClient com pool de conexoes e timeout, HikariCP pool. Usar quando: otimizar queries; revisar performance JPA; implementar caching; configurar WebClient; code review de performance; pull request review."
---

# Java Performance & Optimization (Spring Boot 3+)

Documento normativo para otimizacao de performance em projetos Java.
Ideal para: code review automatico e pull request review.

---

# 1. JPA/Hibernate — Consultas Otimizadas

## 1.1 Fetch Join (evitar N+1)

```java
// PROBLEMA N+1: 1 query para Order + N queries para cada OrderItem
List<Order> orders = orderRepository.findAll();
for (Order order : orders) {
    order.getItems(); // Trigger 1 query por order!
}

// SOLUCAO: Fetch join
@Query("""
    SELECT o FROM Order o
    JOIN FETCH o.items i
    WHERE o.status = :status
""")
List<Order> findByStatusWithItems(@Param("status") OrderStatus status);

// Com multiplos relacionamentos
@Query("""
    SELECT o FROM Order o
    JOIN FETCH o.items i
    JOIN FETCH i.product p
    WHERE o.customerId = :customerId
""")
Optional<Order> findOrderWithDetails(@Param("customerId") Long customerId);
```

## 1.2 Projecoes (retornar apenas campos necessarios)

```java
// Interface projection
public interface OrderSummary {
    Long getId();
    String getCustomerEmail();
    BigDecimal getTotal();
    String getStatus();
}

// Class-based projection (record)
public record OrderSummaryRecord(
    Long id,
    String customerEmail,
    BigDecimal total,
    String status
) {}

@Query("""
    SELECT new com.company.OrderSummaryRecord(
        o.id, o.customerEmail, o.total, o.status
    )
    FROM Order o
    ORDER BY o.createdAt DESC
    LIMIT 100
""")
List<OrderSummaryRecord> findRecentOrders();
```

## 1.3 Paginacao Eficiente

```java
// Spring Data paginacao nativa
Page<Order> findByStatus(OrderStatus status, Pageable pageable);

// Uso
Pageable pageable = PageRequest.of(0, 20, Sort.by("createdAt").descending());
Page<Order> page = orderRepository.findByStatus(OrderStatus.COMPLETED, pageable);

// Cursor-based pagination para grandes datasets
@Query("""
    SELECT o FROM Order o
    WHERE o.id > :lastId
    ORDER BY o.id ASC
""")
List<Order> findNextOrders(@Param("lastId") Long lastId, Pageable pageable);

// Streaming para processamento de lotes
@Query(value = "SELECT * FROM orders WHERE status = 'PENDING'", nativeQuery = true)
@Transactional(readOnly = true)
Stream<Order> streamPendingOrders();
```

---

# 2. QueryDSL / Specification (queries dinamicas)

## QueryDSL (type-safe)

```java
@Service
public class OrderQueryService {

    public List<Order> searchOrders(OrderSearchCriteria criteria) {
        QOrder order = QOrder.order;
        BooleanBuilder predicate = new BooleanBuilder();

        if (criteria.getStatus() != null) {
            predicate.and(order.status.eq(criteria.getStatus()));
        }
        if (criteria.getMinTotal() != null) {
            predicate.and(order.total.goe(criteria.getMinTotal()));
        }
        if (criteria.getStartDate() != null) {
            predicate.and(order.createdAt.goe(criteria.getStartDate()));
        }

        return orderRepository.findAll(predicate);
    }
}
```

## Spring Data Specification (alternativa sem QueryDSL)

```java
@Repository
public interface OrderRepository extends JpaRepository<Order, Long>,
        JpaSpecificationExecutor<Order> {
}

@Service
public class OrderSearchService {

    public List<Order> searchWithSpecification(OrderSearchCriteria criteria) {
        Specification<Order> spec = Specification
                .where(statusEquals(criteria.getStatus()))
                .and(totalGreaterOrEqual(criteria.getMinTotal()))
                .and(createdAfter(criteria.getStartDate()));

        return orderRepository.findAll(spec);
    }

    private Specification<Order> statusEquals(OrderStatus status) {
        return (root, query, cb) -> status == null
                ? null : cb.equal(root.get("status"), status);
    }

    private Specification<Order> totalGreaterOrEqual(BigDecimal minTotal) {
        return (root, query, cb) -> minTotal == null
                ? null : cb.ge(root.get("total"), minTotal);
    }

    private Specification<Order> createdAfter(LocalDateTime startDate) {
        return (root, query, cb) -> startDate == null
                ? null : cb.greaterThanOrEqualTo(root.get("createdAt"), startDate);
    }
}
```

## Native Queries quando necessario

```java
@Query(value = """
    SELECT o.id, o.customer_email, o.total, COUNT(i.id) as item_count
    FROM orders o
    LEFT JOIN order_items i ON o.id = i.order_id
    GROUP BY o.id, o.customer_email, o.total
    HAVING COUNT(i.id) > :minItems
    """, nativeQuery = true)
List<OrderAggregateDto> findOrdersByItemCount(@Param("minItems") int minItems);
```

---

# 3. Batch Processing

```java
@Service
@Transactional
public class BatchOrderProcessor {

    @PersistenceContext
    private EntityManager entityManager;

    public void processBatch(List<Order> orders, int batchSize) {
        for (int i = 0; i < orders.size(); i++) {
            Order order = orders.get(i);
            order.process();
            entityManager.merge(order);

            // Flush e clear a cada lote para liberar memoria
            if ((i + 1) % batchSize == 0) {
                entityManager.flush();
                entityManager.clear();
            }
        }
        entityManager.flush();
    }
}
```

---

# 4. Caching

## Caffeine (cache local rapido)

```java
@Configuration
@EnableCaching
public class CacheConfiguration {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager();
        cacheManager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(10000)
                .expireAfterWrite(Duration.ofMinutes(10))
                .recordStats());
        return cacheManager;
    }
}
```

## Uso de Cache

```java
@Service
public class OrderService {

    @Cacheable(cacheNames = "orders", key = "#id")
    public Optional<Order> getOrder(Long id) {
        return orderRepository.findById(id);
    }

    @CachePut(cacheNames = "orders", key = "#result.id")
    public Order saveOrder(Order order) {
        return orderRepository.save(order);
    }

    @CacheEvict(cacheNames = "orders", key = "#id")
    public void deleteOrder(Long id) {
        orderRepository.deleteById(id);
    }

    @CacheEvict(cacheNames = {"orders", "ordersByStatus"}, allEntries = true)
    public void refreshAllCaches() {
        // Invalida todos os caches
    }
}
```

## Redis (cache distribuido)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

```yaml
spring:
  redis:
    host: redis.production.svc.cluster.local
    port: 6379
    timeout: 2000
    jedis:
      pool:
        max-active: 20
        max-idle: 10
```

---

# 5. WebClient Otimizado

```java
@Configuration
public class WebClientConfiguration {

    @Bean
    public WebClient webClient() {
        HttpClient httpClient = HttpClient.create()
                .connectionTimeout(Duration.ofSeconds(5))
                .responseTimeout(Duration.ofSeconds(10))
                .doOnConnected(c ->
                    c.addHandlerLast(new ReadTimeoutHandler(10, TimeUnit.SECONDS))
                );

        ClientHttpConnector connector = new ReactorClientHttpConnector(httpClient);

        return WebClient.builder()
                .clientConnector(connector)
                .baseUrl("https://api.external.com")
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}

// Uso com retry
@Service
public class ExternalApiService {

    private final WebClient webClient;

    public Mono<ProductDto> getProductFromExternal(Long productId) {
        return webClient.get()
                .uri("/products/{id}", productId)
                .retrieve()
                .bodyToMono(ProductDto.class)
                .timeout(Duration.ofSeconds(10))
                .doOnError(error -> log.error("Error fetching product", error))
                .retryWhen(Retry.backoff(3, Duration.ofSeconds(1)));
    }
}
```

---

# 6. Checklist de Performance

## JPA/Hibernate
- [ ] Sem problemas N+1 (usar fetch join)
- [ ] Projecoes usadas quando nao precisa de entidade completa
- [ ] Paginacao implementada em listagens
- [ ] Cursor-based pagination para grandes datasets
- [ ] Batch processing para operacoes em lote
- [ ] batch_size e fetch_size configurados no JPA

## Cache
- [ ] Caffeine configurado para cache local
- [ ] Redis para cache distribuido (se aplicavel)
- [ ] @Cacheable em queries frequentes
- [ ] @CacheEvict em operacoes de escrita
- [ ] TTL definido para cada cache

## WebClient
- [ ] WebClient ao inves de RestTemplate
- [ ] Timeouts configurados (connection + response)
- [ ] Retry com backoff configurado
- [ ] Pool de conexoes configurado

## Database
- [ ] HikariCP pool configurado
- [ ] open-in-view: false
- [ ] Indices criados para queries frequentes
- [ ] Queries nativas quando JOIN complexo
