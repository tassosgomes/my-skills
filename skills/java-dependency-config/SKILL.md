---
name: java-dependency-config
description: "Use quando uma tarefa Java/Spring adiciona ou altera dependências, Maven/Gradle, JPA/Hibernate, HikariCP, Flyway, MapStruct, OpenAPI, cache, WebClient, Resilience4j, profiles ou configuração de infraestrutura. Não use para criar apenas um endpoint ou revisar estilo."
metadata:
  group: java
---

# Dependências e Configuração Java

Esta skill define o baseline de infraestrutura. Consulte a referência completa somente para o
componente alterado; não carregue Maven, JPA, profiles e todas as integrações em uma tarefa local.

## Baseline oficial

- Spring Boot 3+ com Web, Validation, Actuator e configuração por profiles.
- Spring Data JPA/Hibernate com HikariCP; PostgreSQL é o banco padrão.
- Flyway para migrations versionadas; `open-in-view: false`; `ddl-auto: validate` em produção.
- MapStruct para mapeamento, Spring Cache para cache, WebClient para HTTP e Resilience4j para
  retry/circuit breaker.
- Micrometer/Prometheus para métricas e springdoc/OpenAPI para contrato.
- Spotless para formatação; secrets e connection strings vêm do ambiente/vault.

## Regras por componente

### JPA e banco

- Configure entidades explicitamente e evite expor entidades JPA nos contratos.
- Dimensione HikariCP e defina timeouts; não dependa de defaults em produção.
- Versione migrations e mantenha compatibilidade entre schema e aplicação.

### HTTP, cache e resiliência

- Use WebClient com pool e timeouts explícitos.
- Retry precisa de backoff, limite e compatibilidade com idempotência.
- Toda entrada de cache precisa de TTL, chave e invalidação para escritas.

### Profiles

- Separe dev/test/prod sem duplicar secrets.
- Testes de persistência devem considerar Testcontainers PostgreSQL quando o dialeto importa.

## Referência sob demanda

Leia [o guia completo de dependências](references/full-guide.md) para receitas Maven/Gradle,
JPA, HikariCP, profiles e configurações de integração.

## Checklist do diff

- [ ] A dependência é necessária e compatível com o baseline.
- [ ] Versões e escopo foram verificados no build existente.
- [ ] Banco, pool, migrations e `open-in-view` estão corretos.
- [ ] Profiles não introduzem secrets versionados.
- [ ] Retry, timeout, cache e idempotência foram definidos quando aplicáveis.
- [ ] Não houve upgrade amplo como efeito colateral de uma alteração localizada.
