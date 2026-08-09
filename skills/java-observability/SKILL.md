---
name: java-observability
description: "Use quando a tarefa implementa ou altera logging estruturado, MDC/correlação, OpenTelemetry/Jaeger, Micrometer/Prometheus, Actuator, health checks ou probes Kubernetes em Java/Spring. Não use para o readiness gate completo nem para tuning de performance isolado."
metadata:
  group: java
---

# Observabilidade Java / Spring Boot

Esta skill trata dos sinais operacionais e da instrumentação. O gate agregado de release fica em
`java-production-readiness`; performance e cache ficam em `java-performance`.

## Regras normativas

- Logs devem ser JSON estruturado com `timestamp`, `level`, `message`, `service.name` e, quando
  disponíveis, `trace_id`/`span_id`.
- Use SLF4J placeholders e MDC para contexto; nunca registre senhas, tokens, cartões, CPF, dados
  médicos ou outras informações sensíveis.
- Use OpenTelemetry/Jaeger para tracing, spans em operações críticas e propagação de correlation
  IDs; registre atributos e exceções com segurança.
- Use Actuator para endpoints de health, info, metrics e Prometheus quando aplicável.
- Separe liveness, readiness e startup; readiness pode verificar dependências, liveness não deve
  derrubar instâncias saudáveis por dependência externa.
- Use Micrometer para counters, timers, gauges e percentis alinhados a perguntas operacionais.
- Ajuste Logback, níveis e exportadores por profile; não copie configuração de desenvolvimento
  para produção sem revisão.

## Referências por tópico

| Necessidade | Recurso |
|---|---|
| JSON, Logback, MDC e sanitização | `examples/logging.md` |
| Actuator e probes Kubernetes | `examples/health-checks.md` |
| Micrometer e Prometheus | `examples/metrics.md` |
| OpenTelemetry, Jaeger e correlation ID | `examples/tracing.md` |

Leia apenas o exemplo correspondente ao diff.

## Checklist do diff

- [ ] Cada sinal responde a uma necessidade operacional clara.
- [ ] Logs têm correlação e não expõem dados sensíveis.
- [ ] Liveness, readiness e startup têm dependências e timeouts corretos.
- [ ] Spans, atributos e exceções são encerrados/registrados com segurança.
- [ ] Métricas têm unidade, cardinalidade e janela adequadas.
- [ ] Profiles mantêm dev/test/prod separados.
