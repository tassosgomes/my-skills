# Metricas com Micrometer — Exemplos

Configuracao Prometheus e metricas customizadas (gauges, counters, timers com percentis).

## Configuracao Prometheus

```yaml
management:
  metrics:
    export:
      prometheus:
        enabled: true
    distribution:
      http.server.requests:
        percentiles-histogram: true
        percentiles: 0.5, 0.95, 0.99
```

## Metricas Customizadas

```java
@Service
public class OrderService {

    private final MeterRegistry meterRegistry;
    private final AtomicInteger activeOrders;
    private final Timer orderProcessingTime;

    public OrderService(OrderRepository repo, MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;

        this.activeOrders = meterRegistry.gauge(
                "orders.active", new AtomicInteger(0));

        this.orderProcessingTime = Timer.builder("orders.processing.time")
                .description("Tempo para processar um pedido")
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry);
    }

    public Order createOrder(CreateOrderCommand command) {
        activeOrders.incrementAndGet();

        return orderProcessingTime.recordCallable(() -> {
            try {
                Order order = new Order(command.customerEmail());
                Order saved = repository.save(order);
                meterRegistry.counter("orders.created", "status", "success").increment();
                return saved;
            } finally {
                activeOrders.decrementAndGet();
            }
        });
    }
}
```
