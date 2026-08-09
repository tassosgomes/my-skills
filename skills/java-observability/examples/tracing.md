# Tracing Distribuido — Exemplos

Instrumentacao manual com OpenTelemetry (+ Jaeger) e propagacao de Correlation IDs via filtro.

## Instrumentacao Manual (OpenTelemetry + Jaeger)

```java
@Service
public class OrderService {

    private final Tracer tracer;

    public Order createOrder(CreateOrderCommand command) {
        Span span = tracer.spanBuilder("createOrder")
                .startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("order.customer_email", command.customerEmail());
            span.setAttribute("order.items_count", command.items().size());

            Order order = new Order(command.customerEmail());
            Order saved = orderRepository.save(order);

            span.addEvent("order.creation.completed", Attributes.of(
                    AttributeKey.longKey("order.id"), saved.getId()
            ));

            return saved;
        } finally {
            span.end();
        }
    }
}
```

## Correlation IDs

```java
@Component
public class CorrelationIdFilter implements OncePerRequestFilter {

    private static final String CORRELATION_ID_HEADER = "X-Correlation-ID";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                   HttpServletResponse response,
                                   FilterChain filterChain)
            throws ServletException, IOException {

        String correlationId = request.getHeader(CORRELATION_ID_HEADER);
        if (correlationId == null) {
            correlationId = UUID.randomUUID().toString();
        }

        MDC.put("correlation_id", correlationId);

        try {
            response.setHeader(CORRELATION_ID_HEADER, correlationId);
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove("correlation_id");
        }
    }
}
```
