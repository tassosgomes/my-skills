---
name: java-performance
description: "Use somente quando houver objetivo explícito de performance Java/Spring: latência, throughput, escala, N+1, query lenta, paginação, cache, batch, WebClient ou pool HikariCP. Não use para uma implementação funcional sem requisito de performance."
metadata:
  group: java
---

# Performance Java / Spring Boot

Acione por evidência ou objetivo de performance. Primeiro defina a métrica e a hipótese; não
aplique tuning por checklist sem gargalo observável.

## Regras normativas

- JPA: evite N+1 com fetch join/entity graph, use projeções quando não precisa da entidade completa
  e pagine listagens.
- Para queries dinâmicas, use QueryDSL ou Specification; não concatene SQL.
- Use cursor/keyset em grandes volumes e batch processing para operações em lote.
- Cache local usa Caffeine; cache distribuído usa Redis. Toda entrada precisa de TTL, chave,
  invalidação e comportamento de miss.
- Use WebClient com pool, timeout explícito e Resilience4j para retry/backoff quando a operação for
  idempotente.
- Dimensione HikariCP e mantenha `open-in-view: false`; valide índices e planos de execução.
- Compare baseline e resultado com métrica reproduzível; otimização que altera correção ou
  consistência é regressão.

## Referência sob demanda

Leia [o guia completo de performance](references/full-guide.md) somente depois de identificar o
componente investigado. Ele contém receitas de JPA, QueryDSL/Specification, batch, cache,
WebClient e HikariCP.

## Checklist do diff

- [ ] Há evidência do gargalo e baseline mensurável.
- [ ] Não há N+1, carga excessiva de entidade ou paginação inadequada.
- [ ] Cache tem TTL e invalidação coerentes.
- [ ] HTTP tem timeout e retry compatível com idempotência.
- [ ] Pool, índices e queries foram avaliados conforme o volume.
- [ ] O resultado foi comparado sem mudar o contrato funcional.
