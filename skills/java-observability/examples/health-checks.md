# Health Checks com Actuator — Exemplos

Configuracao do Actuator, health indicators customizados e probes Kubernetes (liveness/readiness/startup).

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
