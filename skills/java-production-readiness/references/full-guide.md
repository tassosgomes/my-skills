# Referência completa — Production Readiness Java

> Leia sob demanda para o checklist detalhado de release, segurança, Docker e Kubernetes.

Skill agregadora para validacao pre-producao.
Usada antes de: merge, deploy, geracao de build final.

Esta skill consolida verificacoes de todas as outras skills Java em um checklist unificado.

---

# 1. Logging

- [ ] Logs estruturados em JSON
- [ ] trace_id e span_id incluidos em todos os logs
- [ ] service.name configurado (= nome da pasta do servico)
- [ ] Nenhum dado sensivel logado (CPF, senhas, tokens, cartoes)
- [ ] Sanitizacao implementada (LogSanitizer)
- [ ] SLF4J placeholders (sem concatenacao de string)
- [ ] Niveis de log configurados por ambiente (dev/prod)
- [ ] Sem System.out.println no codigo
- [ ] MDC usado para contexto de requisicao

---

# 2. Observabilidade

- [ ] OpenTelemetry configurado (tracing + logging)
- [ ] Spans customizados em operacoes criticas
- [ ] Atributos relevantes nos spans
- [ ] Correlation IDs propagados (X-Correlation-ID)
- [ ] Metricas customizadas com Micrometer
  - [ ] Counters para eventos de negocio
  - [ ] Timers para operacoes criticas
  - [ ] Gauges para estado

---

# 3. Health Checks

- [ ] Actuator configurado e exposto
- [ ] Health indicators customizados (database, servicos externos)
- [ ] Liveness probe configurada
- [ ] Readiness probe configurada
- [ ] Startup probe configurada (se tempo de startup > 30s)
- [ ] Endpoints expostos: health, info, metrics, prometheus

---

# 4. Cache

- [ ] Spring Cache habilitado (@EnableCaching)
- [ ] Caffeine configurado para cache local
- [ ] TTL definido para cada cache
- [ ] @CacheEvict configurado em operacoes de escrita
- [ ] Redis configurado para cache distribuido (se multi-instancia)

---

# 5. Database/JPA

- [ ] open-in-view: false
- [ ] HikariCP pool configurado (max-pool, min-idle, timeouts)
- [ ] ddl-auto: validate em producao
- [ ] batch_size e fetch_size configurados
- [ ] Flyway migrations versionadas
- [ ] Sem problemas N+1 (fetch join usado)
- [ ] Projecoes usadas quando aplicavel
- [ ] Paginacao implementada em listagens

---

# 6. Profiles

- [ ] application.yml (base) configurado
- [ ] application-dev.yml com configuracoes de desenvolvimento
- [ ] application-test.yml com H2 ou Testcontainers
- [ ] application-prod.yml com:
  - [ ] Secrets via variaveis de ambiente (${DB_URL}, ${DB_PASSWORD})
  - [ ] ddl-auto: validate
  - [ ] Logging level: INFO/WARN
  - [ ] Pool de conexoes otimizado

---

# 7. Seguranca Minima

- [ ] Bean Validation em todos os endpoints (@Valid)
- [ ] Queries parametrizadas (sem SQL injection)
- [ ] Secrets nao hardcoded (usar env vars)
- [ ] Headers de seguranca configurados
- [ ] ProblemDetail RFC 7807 (sem stacktrace exposto)
- [ ] DomainException como base para erros de negocio

---

# 8. Testes

- [ ] Testes unitarios com cobertura > 70%
- [ ] Testes de integracao para fluxos criticos
- [ ] Testcontainers configurado (skip quando Docker indisponivel)
- [ ] Naming convention respeitada
- [ ] AAA Pattern em todos os testes
- [ ] Regras de negocio testadas no domain

---

# 9. Arquitetura

- [ ] Clean Architecture respeitada
- [ ] Domain sem dependencias de framework
- [ ] Controllers finos (sem logica de negocio)
- [ ] MapStruct para mapeamentos
- [ ] Entidades JPA nunca expostas fora do infra
- [ ] CQRS type-safe (sem reflection)
- [ ] @Transactional em use cases de escrita
- [ ] @Transactional(readOnly = true) em queries

---

# 10. DevOps / Kubernetes

- [ ] Dockerfile multi-stage otimizado
- [ ] Liveness probe configurada
- [ ] Readiness probe configurada
- [ ] Startup probe se aplicavel
- [ ] Logging para stdout/stderr
- [ ] Graceful shutdown implementado
- [ ] Resource requests/limits definidos

## Dockerfile Padrao

```dockerfile
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jdk-alpine
COPY --from=builder /app/api/target/financeiro-api-*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Graceful Shutdown

```yaml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s
```

---

# 11. Codigo

- [ ] Todo codigo em Ingles
- [ ] Sem field injection
- [ ] Sem null returns (usar Optional)
- [ ] Sem generic exceptions
- [ ] Sem flag parameters
- [ ] Constructor injection em todos os services
- [ ] Records usados para DTOs
- [ ] Modern Java features (17+)

---

# Resumo de Validacao

Antes de aprovar para producao, TODAS as secoes acima devem estar com checklist completo.

Prioridade de correcao:
1. **Critico**: Seguranca, Health Checks, Logging (dados sensiveis)
2. **Alto**: Observabilidade, Profiles, Database
3. **Medio**: Cache, Performance, Testes
4. **Baixo**: Code style, Arquitetura (se ja funcional)
