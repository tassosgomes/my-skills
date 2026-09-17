---
name: dotnet-performance
description: "Use somente quando houver objetivo explícito de performance .NET: latência, throughput, escala, gargalo, query lenta, N+1, cache, paginação, streaming ou tuning de HttpClient. Não use para uma implementação funcional sem requisito de performance."
metadata:
  group: dotnet
---

# Performance .NET

Só com medição ou hipótese declarada. Otimização que muda semântica, consistência ou contrato é
regressão.

## Método

1. Registre o baseline (p95/p99, queries por request, alocação) no mesmo ambiente do resultado.
2. Declare a hipótese no PR.
3. Uma mudança por vez; compare com o baseline.
4. Registre ganho, custo e como reverter.

Ferramentas: spans de EF Core no OpenTelemetry, `dotnet-counters`, `dotnet-trace`; BenchmarkDotNet só
para código isolado.

## Leitura

| Consulta | Retorna | Onde |
|---|---|---|
| Carregar para alterar | Agregado rastreado | Repositório do agregado |
| Listagem ou tela só de leitura | Projeção (Output) | `Application/Interfaces/I{Agregado}Queries`, implementada em `Infra.Data/Queries` |

- Projeção com `Select` direto para o Output; contagem de relação vira subconsulta SQL.
- Ordenação sempre determinística, com desempate por Id.
- `AsSplitQuery`, compiled query e `AddDbContextPool` só onde a medição mostrou o problema.
- Relatório com SQL explícito usa `Database.SqlQuery<T>($"...")` interpolado (parametrizado),
  nunca concatenação.
- Exportação grande devolve `IAsyncEnumerable<T>`.

## Escrita em lote

| Situação | Abordagem |
|---|---|
| Tem regra de negócio ou evento | Carregar em blocos de ~500, alterar pelo agregado, `CommitAsync` por bloco, `DbContext` novo por bloco |
| Manutenção técnica sem regra nem evento (limpeza, backfill) | `ExecuteUpdateAsync`/`ExecuteDeleteAsync` |

`ExecuteUpdateAsync`/`ExecuteDeleteAsync` não passam pelo agregado: não validam, não levantam evento,
não gravam outbox.

## Paginação

- Contrato HTTP fixo: `_page`/`_size` com `data`/`pagination` e limite máximo de `_size` (ex.: 100).
- Implementação padrão: offset (`Skip`/`Take` + `CountAsync`) com índice cobrindo filtro e ordem.
- Páginas profundas ou tabelas grandes: keyset por `(coluna, id)` na implementação; mudar o
  contrato só com acordo dos consumidores.
- `Count` caro: índice → cache curto do total → total estimado documentado, nessa ordem.

## Cache

| Cache | Quando |
|---|---|
| `IMemoryCache` | Uma instância, ou divergência de segundos entre pods aceitável |
| `IDistributedCache` com Valkey (`StackExchange.Redis`) | Várias instâncias precisam da mesma entrada ou da mesma invalidação |
| `HybridCache` (`Microsoft.Extensions.Caching.Hybrid`) | Stampede medido em cache miss sob carga |

- Cache fica no caso de uso de leitura e guarda o **Output**, nunca o agregado.
- Chave: `{servico}:{agregado}:{id}:v{n}`, exposta como `static string CacheKey(...)` no caso de uso
  de leitura; mudar o Output incrementa `v{n}`.
- Todo item tem TTL absoluto; sliding só junto de um absoluto.
- Invalidação no caso de uso de escrita, depois do `CommitAsync`, com `CancellationToken.None`.
  Dado alterado por outro serviço invalida pelo evento, não por TTL longo.
- Dado por usuário inclui o usuário na chave.
- A Application depende só da abstração; o registro fica em `Api/Extensions/CacheExtensions.cs`.

## HttpClient

- Cliente tipado atrás de porta em `Application/Interfaces` (`IEncoderClient`), implementação em
  `Infra.{Sistema}`.
- Registro em `Api/Extensions/HttpClientsExtensions.cs` com `BaseAddress` da configuração e
  `AddStandardResilienceHandler`: `AttemptTimeout` 5 s, `TotalRequestTimeout` 20 s,
  `MaxRetryAttempts` 3 e `Retry.DisableForUnsafeHttpMethods()`.
- `Microsoft.Extensions.Http.Polly`/`HttpPolicyExtensions` não são usados.
- 404 do sistema externo vira `null`; outras falhas propagam exceção. Nunca devolver `default`
  engolindo erro.
- Retry em método não idempotente só com chave de idempotência aceita pelo servidor.

## Checklist do diff

- [ ] Baseline e resultado medidos no mesmo ambiente.
- [ ] Leitura com projeção em `IXxxQueries`; alteração continua pelo repositório rastreado.
- [ ] Índice cobre filtro e ordenação alterados.
- [ ] `ExecuteUpdate/Delete` só sem regra nem evento.
- [ ] Cache guarda Output, chave versionada, TTL e invalidação pós-commit.
- [ ] HttpClient com resilience handler, timeouts e retry só em método seguro.
- [ ] Sem mudança silenciosa de contrato ou consistência.
