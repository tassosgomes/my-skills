# Logging Estruturado — Configuracao e Uso

Configuracao OpenTelemetry (Maven, application.yml, Logback) e uso de logging com tracing/MDC no codigo.

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

## Uso em Controllers

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
