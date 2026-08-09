---
name: java-production-readiness
description: "Use somente antes de merge/release/deploy, em auditoria pré-produção ou quando o usuário pedir um readiness gate completo para Java/Spring Boot. Não acione para configurar um único log, health check, teste ou query."
metadata:
  group: java
---

# Production Readiness Java

Esta skill é o gate agregado de prontidão. Ela verifica a integração dos controles e não substitui
as skills de observabilidade, performance, testes ou arquitetura.

## Gate mínimo

- **Observabilidade:** logs JSON com correlação, OpenTelemetry/Micrometer e Actuator/probes.
- **Dados e cache:** `open-in-view: false`, HikariCP, `ddl-auto: validate`, Flyway, ausência de
  N+1 e cache com TTL/invalidação quando aplicável.
- **Profiles e secrets:** dev/test/prod separados, secrets fora do repositório e configuração
  adequada ao ambiente alvo.
- **Segurança:** Bean Validation, queries parametrizadas, headers, ProblemDetail RFC 7807 e
  nenhuma stack trace exposta.
- **Testes:** unitários e integração para fluxos críticos, Testcontainers quando necessário,
  cobertura de negócio conforme o baseline do projeto.
- **Arquitetura:** Domain sem framework, controllers finos, MapStruct, CQRS type-safe e transações
  nos use cases corretos.
- **Entrega:** build/test, Dockerfile multi-stage, logging em stdout/stderr, graceful shutdown,
  resource limits, probes e rollback definidos.

## Limites com outras skills

- Use `java-observability` para implementar ou corrigir um sinal.
- Use `java-performance` para investigar gargalos.
- Use `java-testing` para escrever ou diagnosticar testes.
- Use `java-architecture` para corrigir limites estruturais.
- Aqui, verifique apenas se esses controles necessários ao release estão integrados.

## Referência sob demanda

Leia [a referência completa de readiness](references/full-guide.md) durante um gate de release,
auditoria ou revisão pré-produção.

## Checklist de saída

- [ ] Build, testes e verificações do pipeline passaram.
- [ ] Logs, traces, métricas, Actuator e probes estão configurados para o ambiente alvo.
- [ ] Secrets e dados sensíveis não são versionados ou logados.
- [ ] Migrations, profiles, resiliência, shutdown e rollback estão definidos.
- [ ] Falhas bloqueantes possuem evidência e responsável.
