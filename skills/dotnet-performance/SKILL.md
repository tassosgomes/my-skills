---
name: dotnet-performance
description: "Use somente quando houver objetivo explícito de performance .NET: latência, throughput, escala, gargalo, query lenta, N+1, cache, paginação, streaming ou tuning de HttpClient. Não use para uma implementação funcional sem requisito de performance."
metadata:
  group: dotnet
---

# Performance .NET

Acione esta skill por evidência ou objetivo de performance. Primeiro identifique a medição ou
hipótese; não aplique otimizações por checklist quando não há gargalo.

## Regras normativas

### EF Core

- Projete apenas as colunas necessárias e use `AsNoTracking` em leitura.
- Evite N+1 e múltiplos `Include` sem avaliar `AsSplitQuery`.
- Use `ExecuteUpdateAsync`/`ExecuteDeleteAsync` para operações em lote quando o comportamento
  permitir.
- Considere compiled queries somente em hot paths medidos.
- Prefira paginação por cursor/keyset em grandes volumes e evite `Count()` desnecessário.

### Cache e HTTP

- Escolha `IMemoryCache` para processo local e `IDistributedCache`/Redis para múltiplas instâncias.
- Toda entrada de cache precisa de chave, TTL, política de invalidação e comportamento de miss.
- Use `IHttpClientFactory`, timeout explícito e Polly para retry/circuit breaker quando a chamada
  externa for resiliente.
- Não adicione retry a operações não idempotentes sem definir idempotência.

### Método de trabalho

- Compare baseline e resultado com métrica reproduzível.
- Preserve correção, consistência e observabilidade; otimização que muda semântica é regressão.
- Documente a hipótese, o impacto esperado e o limite de rollback.

## Referência sob demanda

Leia [a referência completa de performance](references/full-guide.md) somente após definir o
componente investigado. Ela contém receitas detalhadas para EF Core, caching, HttpClient e
paginação.

## Checklist do diff

- [ ] Existe métrica ou evidência do gargalo.
- [ ] A query usa projeção/paginação adequadas ao volume.
- [ ] Cache tem TTL, invalidação e escopo corretos.
- [ ] HTTP tem timeout e política de retry compatível com idempotência.
- [ ] O resultado foi comparado com o baseline.
- [ ] Não houve mudança silenciosa de contrato ou consistência.
