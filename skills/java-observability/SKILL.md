---
name: java-observability
description: "Observabilidade completa para Java Spring Boot: logging estruturado JSON com OpenTelemetry, tracing distribuido com Jaeger, metricas customizadas com Micrometer/Prometheus, Health Checks com Actuator (liveness/readiness/startup probes), correlacao trace_id/span_id via MDC, sanitizacao de dados sensiveis (LGPD/PCI-DSS), configuracao Logback por profile. Usar quando: implementar logging; configurar health checks; adicionar metricas; setup tracing; auditar observabilidade; configurar probes Kubernetes."
---

# Java Observability & Monitoring (Spring Boot 3+)

Documento normativo para logging estruturado, metricas, tracing e health checks.
Skill critica — deve ser executada como auditoria automatica.

---

# PARTE 1 — LOGGING ESTRUTURADO

---

# 1. Principios de Logging

- Todos os logs devem ser estruturados em **JSON**
- Logs devem incluir **trace_id** e **span_id** quando disponiveis
- O **service.name** deve ser o nome da pasta do servico
- Informacoes sensiveis **nunca** devem ser logadas

---

# 2. Formato Padronizado de Log

```json
{
  "timestamp": "2026-01-24T14:30:00.123Z",
  "level": "INFO",
  "message": "Avaliacao de veiculo criada com sucesso",
  "service": {
    "name": "vehicle-evaluation",
    "version": "1.0.0"
  },
  "trace": {
    "trace_id": "abc123def456",
    "span_id": "789xyz"
  },
  "context": {
    "user_id": "user-uuid",
    "request_path": "/api/evaluations",
    "http_method": "POST",
    "http_status": 201
  },
  "error": {
    "type": "ValidationException",
    "message": "Campo obrigatorio nao preenchido",
    "stack_trace": "..."
  }
}
```

### Campos Obrigatorios

| Campo | Tipo | Descricao |
|-------|------|-----------|
| timestamp | ISO 8601 UTC | Data/hora do log |
| level | string | DEBUG, INFO, WARN, ERROR |
| message | string | Mensagem descritiva do evento |
| service.name | string | Nome do servico |
| service.version | string | Versao da aplicacao |
| trace.trace_id | string | ID do trace (quando disponivel) |
| trace.span_id | string | ID do span atual |

---

# 3. Configuracao OpenTelemetry

## Dependencias Maven

```xml
<properties>
    <opentelemetry.version>1.32.0</opentelemetry.version>
    <opentelemetry-instrumentation.version>2.0.0</opentelemetry-instrumentation.version>
</properties>

<dependencies>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-api</artifactId>
        <version>${opentelemetry.version}</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
        <version>${opentelemetry.version}</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
        <version>${opentelemetry.version}</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry.instrumentation</groupId>
        <artifactId>opentelemetry-spring-boot-starter</artifactId>
        <version>${opentelemetry-instrumentation.version}</version>
    </dependency>
    <dependency>
        <groupId>io.opentelemetry.instrumentation</groupId>
        <artifactId>opentelemetry-logback-appender-1.0</artifactId>
        <version>${opentelemetry-instrumentation.version}</version>
    </dependency>
</dependencies>
```

## application.yml

```yaml
spring:
  application:
    name: vehicle-evaluation

otel:
  service:
    name: ${spring.application.name}
    version: 1.0.0
  exporter:
    otlp:
      endpoint: http://otel-collector:4317
      protocol: grpc
  traces:
    exporter: otlp
  logs:
    exporter: otlp
  instrumentation:
    spring-webmvc:
      enabled: true
    jdbc:
      enabled: true
    logback-appender:
      enabled: true
```

## Logback Configuration (logback-spring.xml)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>

    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg trace_id=%X{trace_id} span_id=%X{span_id}%n</pattern>
        </encoder>
    </appender>

    <appender name="OTEL" class="io.opentelemetry.instrumentation.logback.appender.v1_0.OpenTelemetryAppender">
        <captureExperimentalAttributes>true</captureExperimentalAttributes>
        <captureKeyValuePairAttributes>true</captureKeyValuePairAttributes>
    </appender>

    <springProfile name="dev,development,docker">
        <root level="DEBUG">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="OTEL"/>
        </root>
    </springProfile>

    <springProfile name="prod,production">
        <root level="INFO">
            <appender-ref ref="OTEL"/>
        </root>
    </springProfile>

    <springProfile name="default">
        <root level="INFO">
            <appender-ref ref="CONSOLE"/>
            <appender-ref ref="OTEL"/>
        </root>
    </springProfile>
</configuration>
```

---

# 4. Uso de Logging no Codigo

## Em Controllers

```java
@RestController
@RequestMapping("/api/evaluations")
public class EvaluationController {

    private static final Logger logger = LoggerFactory.getLogger(EvaluationController.class);
    private final EvaluationService evaluationService;
    private final Tracer tracer;

    public EvaluationController(EvaluationService evaluationService, Tracer tracer) {
        this.evaluationService = evaluationService;
        this.tracer = tracer;
    }

    @PostMapping
    public ResponseEntity<Evaluation> createEvaluation(@RequestBody EvaluationDto dto) {
        Span span = tracer.spanBuilder("create-evaluation").startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("evaluation.vehicle_plate", dto.getPlate());
            span.setAttribute("evaluation.type", dto.getType());

            logger.info("Criando avaliacao para veiculo: placa={}, tipo={}",
                dto.getPlate(), dto.getType());

            Evaluation evaluation = evaluationService.create(dto);

            span.setAttribute("evaluation.id", evaluation.getId().toString());
            logger.info("Avaliacao criada com sucesso: id={}", evaluation.getId());

            return ResponseEntity.ok(evaluation);

        } catch (ValidationException e) {
            logger.warn("Erro de validacao ao criar avaliacao: {}", e.getMessage());
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            return ResponseEntity.badRequest().build();

        } catch (Exception e) {
            logger.error("Erro ao criar avaliacao", e);
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            throw e;

        } finally {
            span.end();
        }
    }
}
```

## Em Services

```java
@Service
public class EvaluationService {

    private static final Logger logger = LoggerFactory.getLogger(EvaluationService.class);
    private final EvaluationRepository repository;
    private final Tracer tracer;

    public Evaluation process(Long evaluationId) {
        Span span = tracer.spanBuilder("process-evaluation").startSpan();

        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("evaluation.id", evaluationId);
            logger.debug("Iniciando processamento da avaliacao {}", evaluationId);

            Evaluation evaluation = repository.findById(evaluationId)
                .orElseThrow(() -> {
                    logger.warn("Avaliacao {} nao encontrada", evaluationId);
                    return new NotFoundException("Avaliacao nao encontrada: " + evaluationId);
                });

            evaluation.setStatus(EvaluationStatus.COMPLETED);
            repository.save(evaluation);

            logger.info("Avaliacao {} processada com sucesso. Status: {}",
                evaluationId, evaluation.getStatus());

            return evaluation;
        } finally {
            span.end();
        }
    }
}
```

## MDC (Mapped Diagnostic Context)

```java
public void processarLote(List<Evaluation> evaluations) {
    String batchId = UUID.randomUUID().toString();
    MDC.put("batchId", batchId);
    MDC.put("totalItems", String.valueOf(evaluations.size()));

    try {
        logger.info("Iniciando processamento de lote");
        for (Evaluation evaluation : evaluations) {
            MDC.put("evaluationId", evaluation.getId().toString());
            logger.debug("Processando avaliacao");
        }
        logger.info("Lote processado com sucesso");
    } finally {
        MDC.remove("batchId");
        MDC.remove("totalItems");
        MDC.remove("evaluationId");
    }
}
```

---

# 5. Boas Praticas de Logging

## Faca

```java
logger.info("Pedido {} criado para cliente {}", pedidoId, clienteId);
logger.error("Erro ao processar pedido {}", pedidoId, ex);
span.setAttribute("operacao.tipo", "criacao");
span.recordException(ex);
MDC.put("userId", userId);
try { /* ... */ } finally { MDC.remove("userId"); }
```

## NAO Faca

```java
logger.info("Pedido " + pedidoId + " criado");       // concatenacao
logger.info("Usuario: {}", usuario);                   // objeto inteiro
System.out.println("Debug...");                        // System.out
for (Item item : milhares) { logger.debug("..."); }   // loop intensivo
```

---

# 6. O que NAO Logar (LGPD / PCI-DSS)

| Tipo | Exemplos | Motivo |
|------|----------|--------|
| Credenciais | Senhas, API keys, tokens JWT | Seguranca |
| Dados pessoais | CPF, RG, endereco completo | LGPD |
| Dados financeiros | Numero cartao, CVV, conta bancaria | PCI-DSS |
| Dados de saude | Prontuarios, diagnosticos | LGPD |
| Tokens de sessao | Session IDs, refresh tokens | Seguranca |

## Sanitizacao

```java
public class LogSanitizer {
    public static String maskCpf(String cpf) {
        if (cpf == null || cpf.length() < 11) return "***";
        return cpf.substring(0, 3) + ".***.***-" + cpf.substring(9);
    }

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        String[] parts = email.split("@");
        return parts[0].substring(0, 2) + "***@" + parts[1];
    }
}
```

---

# 7. Niveis de Log por Ambiente

| Ambiente | root | Spring Web | Hibernate SQL |
|----------|------|------------|---------------|
| Development | DEBUG | INFO | DEBUG |
| Docker | DEBUG | INFO | WARN |
| Production | INFO | WARN | WARN |

---

# PARTE 2 — HEALTH CHECKS

---

# 8. Health Checks com Actuator

## Configuracao

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
```

## Health Indicators Customizados

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseHealthIndicator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Health health() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            return Health.up()
                    .withDetail("database", "reachable")
                    .withDetail("status", "operational")
                    .build();
        } catch (Exception ex) {
            return Health.down(ex)
                    .withDetail("database", "unreachable")
                    .withDetail("reason", ex.getMessage())
                    .build();
        }
    }
}
```

## Kubernetes Probes

```yaml
# deployment.yaml
spec:
  containers:
  - name: app
    livenessProbe:
      httpGet:
        path: /actuator/health/liveness
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 30
      failureThreshold: 3

    readinessProbe:
      httpGet:
        path: /actuator/health/readiness
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 10
      failureThreshold: 1

    startupProbe:
      httpGet:
        path: /actuator/health
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 30
```

---

# PARTE 3 — METRICAS

---

# 9. Metricas com Micrometer

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

---

# PARTE 4 — TRACING DISTRIBUIDO

---

# 10. OpenTelemetry + Jaeger

## Instrumentacao Manual

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

---

# 11. Correlation IDs

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

---

# 12. Checklist de Observabilidade

## Logging
- [ ] Logs estruturados em JSON
- [ ] trace_id e span_id incluidos
- [ ] service.name configurado corretamente
- [ ] Nenhum dado sensivel logado
- [ ] Sanitizacao implementada (CPF, email, telefone)
- [ ] SLF4J placeholders (sem concatenacao)
- [ ] Niveis de log por ambiente configurados
- [ ] MDC usado para contexto

## Health Checks
- [ ] Actuator configurado
- [ ] Health indicators customizados
- [ ] Liveness probe para Kubernetes
- [ ] Readiness probe para Kubernetes
- [ ] Startup probe se aplicavel

## Metricas
- [ ] Micrometer + Prometheus configurado
- [ ] Metricas customizadas por servico
- [ ] Percentis configurados para latencia
- [ ] Gauges para estado
- [ ] Counters para eventos
- [ ] Timers para operacoes

## Tracing
- [ ] OpenTelemetry configurado
- [ ] Spans customizados para operacoes criticas
- [ ] Atributos em spans para context
- [ ] Correlation IDs propagados
