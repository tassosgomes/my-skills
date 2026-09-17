# Referência completa — Performance .NET

> Leia sob demanda para tuning de EF Core, paginação, caching e HttpClient.

Use este guia somente após identificar um objetivo ou gargalo mensurável. Os exemplos seguem a
arquitetura das demais skills .NET: agregados carregados por repositório
(`dotnet-architecture/examples/repository-pattern.md`), casos de uso na Application e bootstrap
em `Api/Extensions/`.

## Índice

1. [Método](#1-método)
2. [EF Core: leitura](#2-ef-core-leitura)
3. [EF Core: escrita em lote](#3-ef-core-escrita-em-lote)
4. [Paginação](#4-paginação)
5. [Caching](#5-caching)
6. [HttpClient](#6-httpclient)
7. [Checklist](#checklist-de-performance)

---

## 1. Método

1. Meça antes: tempo de resposta p95/p99, número de queries por request, alocação.
2. Formule a hipótese ("a listagem faz N+1 em categorias").
3. Aplique uma mudança por vez e compare com o baseline no mesmo ambiente.
4. Registre ganho e custo (complexidade, consistência, memória).

Ferramentas: spans de EF Core no OpenTelemetry (`dotnet-observability`), `dotnet-counters`,
`dotnet-trace` e BenchmarkDotNet para código isolado.

---

## 2. EF Core: leitura

### Onde cada tipo de consulta fica

| Consulta | Retorna | Onde |
|---|---|---|
| Carregar agregado para alterar | Agregado rastreado | Repositório do agregado (Domain → Infra.Data) |
| Listagem ou tela que só lê | Projeção (DTO) | Interface de consulta em `Application/Interfaces`, implementada em `Infra.Data` |

Projeção não é agregado: não passa pelo repositório do Domain. A interface de consulta é uma porta
técnica da Application, e a Infra a implementa sem conhecer casos de uso.

```csharp
// Application/Interfaces/IVideoQueries.cs
public interface IVideoQueries
{
    Task<IReadOnlyList<VideoSummaryOutput>> ListPublishedAsync(SearchInput input, CancellationToken cancellationToken);
}

// Application/UseCases/Videos/Common/VideoSummaryOutput.cs
public sealed record VideoSummaryOutput(Guid Id, string Title, int YearLaunched, int CategoryCount);
```

### Projeção com `AsNoTracking`

```csharp
// Infra.Data/Queries/VideoQueries.cs
public sealed class VideoQueries : IVideoQueries
{
    private readonly ProjectNameDbContext _context;

    public VideoQueries(ProjectNameDbContext context) => _context = context;

    public async Task<IReadOnlyList<VideoSummaryOutput>> ListPublishedAsync(SearchInput input, CancellationToken cancellationToken)
        => await _context.Videos
            .AsNoTracking()
            .Where(video => video.Published)
            .OrderBy(video => video.Title).ThenBy(video => video.Id)
            .Skip((input.Page - 1) * input.Size)
            .Take(input.Size)
            .Select(video => new VideoSummaryOutput(
                video.Id,
                video.Title,
                video.YearLaunched,
                _context.VideosCategories.Count(relation => relation.VideoId == video.Id)))
            .ToListAsync(cancellationToken);
}
```

- `Select` com o DTO final gera um único SELECT só com as colunas usadas; `AsNoTracking` é
  redundante em projeção pura, mas deixa a intenção explícita.
- A subconsulta de contagem vira SQL; não carregue a coleção para contar em memória.

### N+1 e `AsSplitQuery`

Dentro de um agregado com coleção própria (ex.: `Order` com `Items`), use `Include` no repositório.
Com duas ou mais coleções, avalie `AsSplitQuery` para evitar explosão cartesiana:

```csharp
// Infra.Data/Repositories/OrderRepository.cs
public Task<Order?> GetAsync(Guid id, CancellationToken cancellationToken)
    => _context.Orders
        .Include(order => order.Items)
        .Include(order => order.Payments)
        .AsSplitQuery()
        .FirstOrDefaultAsync(order => order.Id == id, cancellationToken);
```

`AsSplitQuery` troca uma query grande por várias menores; sem transação, as queries podem ver
estados diferentes do banco. Meça antes de aplicar globalmente.

### Streaming de grandes volumes

```csharp
public async IAsyncEnumerable<VideoExportRow> StreamForExportAsync([EnumeratorCancellation] CancellationToken cancellationToken)
{
    var rows = _context.Videos
        .AsNoTracking()
        .OrderBy(video => video.Id)
        .Select(video => new VideoExportRow(video.Id, video.Title, video.YearLaunched))
        .AsAsyncEnumerable()
        .WithCancellation(cancellationToken);

    await foreach (var row in rows)
        yield return row;
}
```

### Compiled query em hot path medido

```csharp
private static readonly Func<ProjectNameDbContext, Guid, CancellationToken, Task<CategoryModelOutput?>> GetCategoryOutputQuery =
    EF.CompileAsyncQuery((ProjectNameDbContext context, Guid id, CancellationToken cancellationToken) =>
        context.Categories
            .AsNoTracking()
            .Where(category => category.Id == id)
            .Select(category => new CategoryModelOutput(
                category.Id, category.Name, category.Description, category.IsActive, category.CreatedAt))
            .FirstOrDefault());
```

Só vale quando o profiling mostrar custo de compilação da query relevante no total.

### SQL explícito para relatórios

```csharp
public async Task<IReadOnlyList<CategoryUsageRow>> GetCategoryUsageAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    => await _context.Database
        .SqlQuery<CategoryUsageRow>($"""
            SELECT c.name AS CategoryName, COUNT(vc.video_id) AS VideoCount
            FROM categories c
            LEFT JOIN videos_categories vc ON vc.category_id = c.id
            LEFT JOIN videos v ON v.id = vc.video_id
            WHERE v.created_at BETWEEN {from} AND {to}
            GROUP BY c.name
            ORDER BY VideoCount DESC
            """)
        .ToListAsync(cancellationToken);
```

A string interpolada do `SqlQuery` vira parâmetros; nunca concatene valores no SQL.

---

## 3. EF Core: escrita em lote

`ExecuteUpdateAsync`/`ExecuteDeleteAsync` executam direto no banco e **não passam pelo agregado**:
não validam invariantes, não levantam eventos de domínio e não gravam outbox.

| Situação | Abordagem |
|---|---|
| A operação tem regra de negócio ou precisa publicar evento | Carregar agregados em lotes, alterar pelo método de domínio, `CommitAsync` por lote |
| Manutenção técnica sem regra nem evento (limpeza, backfill de coluna) | `ExecuteUpdateAsync`/`ExecuteDeleteAsync` no repositório ou em job |

```csharp
// Infra.Data/Outbox/OutboxCleanup.cs — maintenance, no domain rule involved
public Task<int> DeleteProcessedBeforeAsync(DateTime threshold, CancellationToken cancellationToken)
    => _context.OutboxMessages
        .Where(message => message.ProcessedOn != null && message.ProcessedOn < threshold)
        .ExecuteDeleteAsync(cancellationToken);
```

Para importar muitos agregados, faça `InsertAsync` + `CommitAsync` em blocos (ex.: 500) com um
`DbContext` novo por bloco; um `ChangeTracker` com dezenas de milhares de entidades degrada a cada
`SaveChanges`.

---

## 4. Paginação

O contrato HTTP é sempre `_page`/`_size` com resposta `data`/`pagination` (`restful-api`). A
implementação muda com o volume.

### Offset (padrão)

É a que está em `dotnet-architecture/examples/repository-pattern.md` (`Skip`/`Take` + `CountAsync`). Requisitos:

- Ordenação determinística com desempate por Id.
- Limite máximo de `_size` validado no input (ex.: 100).
- Índice que cubra filtro + ordenação.

### Keyset (volumes grandes ou páginas profundas)

`Skip` alto obriga o banco a ler e descartar todas as linhas anteriores. Com keyset, a consulta
começa depois da última linha vista:

```csharp
public async Task<IReadOnlyList<VideoSummaryOutput>> ListAfterAsync(
    string? afterTitle, Guid? afterId, int size, CancellationToken cancellationToken)
{
    var query = _context.Videos.AsNoTracking().Where(video => video.Published);

    // Npgsql row value comparison: (title, id) > (@afterTitle, @afterId), served by an index on (title, id)
    if (afterTitle is not null && afterId is not null)
        query = query.Where(video => EF.Functions.GreaterThan(
            ValueTuple.Create(video.Title, video.Id),
            ValueTuple.Create(afterTitle, afterId.Value)));

    return await query
        .OrderBy(video => video.Title).ThenBy(video => video.Id)
        .Take(size)
        .Select(video => new VideoSummaryOutput(video.Id, video.Title, video.YearLaunched, 0))
        .ToListAsync(cancellationToken);
}
```

Keyset não permite pular direto para a página N nem dá total barato. Quando o contrato exigir
`_page` com total, mantenha offset e otimize índice; mude o contrato só com acordo dos consumidores.

### `Count` caro

Em tabelas muito grandes, `CountAsync` pode custar mais que a página. Opções, na ordem: índice
adequado ao filtro; cache curto do total; total estimado (documentado no contrato).

---

## 5. Caching

Cache fica no caso de uso de leitura e guarda o **Output**, nunca o agregado: o agregado é para
alteração e deve vir rastreado do banco.

| Cache | Quando |
|---|---|
| `IMemoryCache` | Uma instância, ou dado que pode divergir entre pods por alguns segundos |
| `IDistributedCache` (Valkey via `StackExchange.Redis`) | Várias instâncias precisam enxergar a mesma entrada ou a mesma invalidação |

### Leitura com cache distribuído

```csharp
// Application/UseCases/Categories/GetCategory/GetCategory.cs
public sealed class GetCategory : IGetCategory
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly DistributedCacheEntryOptions CacheEntryOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
    };

    private readonly ICategoryRepository _categoryRepository;
    private readonly IDistributedCache _cache;

    public GetCategory(ICategoryRepository categoryRepository, IDistributedCache cache)
    {
        _categoryRepository = categoryRepository;
        _cache = cache;
    }

    public static string CacheKey(Guid id) => $"catalog:category:{id}:v1";

    public async Task<CategoryModelOutput> ExecuteAsync(GetCategoryInput input, CancellationToken cancellationToken)
    {
        var cached = await _cache.GetStringAsync(CacheKey(input.Id), cancellationToken);
        if (cached is not null)
            return JsonSerializer.Deserialize<CategoryModelOutput>(cached, SerializerOptions)!;

        var category = await _categoryRepository.GetAsync(input.Id, cancellationToken);
        NotFoundException.ThrowIfNull(category, $"Category '{input.Id}' not found");

        var output = CategoryModelOutput.FromCategory(category!);
        await _cache.SetStringAsync(CacheKey(input.Id), JsonSerializer.Serialize(output, SerializerOptions), CacheEntryOptions, cancellationToken);

        return output;
    }
}
```

`IDistributedCache` é uma abstração de `Microsoft.Extensions.Caching.Abstractions`; a Application não
depende de Valkey. O registro (`AddStackExchangeRedisCache`) fica em
`Api/Extensions/CacheExtensions.cs`.

### Invalidação depois do commit

```csharp
// Application/UseCases/Categories/UpdateCategory/UpdateCategory.cs (trecho)
await _categoryRepository.UpdateAsync(category, cancellationToken);
await _unitOfWork.CommitAsync(cancellationToken);

// Invalidate only after the commit succeeded; never cancel after persisting.
await _cache.RemoveAsync(GetCategory.CacheKey(category.Id), CancellationToken.None);
```

Regras:

- Chave com prefixo de serviço, tipo, Id e versão do formato (`catalog:category:{id}:v1`); mudar o
  Output muda a versão.
- Todo item tem TTL absoluto; sliding expiration só junto de um absoluto.
- Invalidação acontece depois do commit. Se outro serviço altera o mesmo dado, invalide pelo evento
  (consumidor do outbox), não por TTL longo.
- Cache miss sob carga pode gerar *stampede*; avalie `HybridCache` (`Microsoft.Extensions.Caching.Hybrid`), que serializa a
  recomputação por chave.
- Não cacheie respostas com dado por usuário sem incluir o usuário na chave.

---

## 6. HttpClient

Use cliente tipado com `IHttpClientFactory` e o pipeline de resiliência de
`Microsoft.Extensions.Http.Resilience` (Polly v8). `Microsoft.Extensions.Http.Polly` com
`HttpPolicyExtensions` é a API antiga e não deve ser usada em código novo.

```bash
dotnet add src/ProjectName.Infra.Encoder package Microsoft.Extensions.Http.Resilience
```

```csharp
// Application/Interfaces/IEncoderClient.cs — technical port
public interface IEncoderClient
{
    Task<EncoderJobStatus?> GetJobStatusAsync(Guid jobId, CancellationToken cancellationToken);
}

// Infra.Encoder/EncoderClient.cs
public sealed class EncoderClient : IEncoderClient
{
    private readonly HttpClient _httpClient;

    public EncoderClient(HttpClient httpClient) => _httpClient = httpClient;

    public async Task<EncoderJobStatus?> GetJobStatusAsync(Guid jobId, CancellationToken cancellationToken)
    {
        using var response = await _httpClient.GetAsync($"v1/jobs/{jobId}", cancellationToken);

        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<EncoderJobStatus>(cancellationToken);
    }
}
```

```csharp
// Api/Extensions/HttpClientsExtensions.cs
public static class HttpClientsExtensions
{
    public static IServiceCollection AddHttpClientsConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpClient<IEncoderClient, EncoderClient>(client =>
            {
                client.BaseAddress = new Uri(configuration["Services:Encoder:BaseUrl"]!);
            })
            .AddStandardResilienceHandler(options =>
            {
                options.AttemptTimeout.Timeout = TimeSpan.FromSeconds(5);
                options.TotalRequestTimeout.Timeout = TimeSpan.FromSeconds(20);
                options.Retry.MaxRetryAttempts = 3;
                options.Retry.DisableForUnsafeHttpMethods(); // POST/PUT/PATCH/DELETE are not retried
            });

        return services;
    }
}
```

- Configure `BaseAddress` e timeouts no registro, nunca no construtor do cliente tipado.
- O handler padrão combina rate limiter, timeout total, retry com backoff e jitter, circuit breaker
  e timeout por tentativa.
- Retry em método não idempotente só com chave de idempotência aceita pelo servidor.
- Não engula exceção devolvendo `default`: o chamador precisa distinguir "não existe" (`null` em
  404) de "falhou".

---

## Checklist de performance

### EF Core
- [ ] Existe medição antes e depois.
- [ ] Listagens usam projeção e ordenação determinística.
- [ ] Agregados para alteração continuam vindo do repositório, rastreados.
- [ ] `AsSplitQuery` aplicado só onde a explosão cartesiana foi medida.
- [ ] `ExecuteUpdateAsync`/`ExecuteDeleteAsync` só em operações sem regra de domínio nem evento.
- [ ] Índices cobrem filtro e ordenação das consultas alteradas.

### Paginação
- [ ] Contrato `_page`/`_size` com limite máximo de `_size`.
- [ ] Keyset avaliado para volumes grandes ou páginas profundas.

### Caching
- [ ] Cache guarda Output, não agregado.
- [ ] Chave versionada, TTL absoluto e invalidação depois do commit.
- [ ] `IDistributedCache` (Valkey) quando há várias instâncias.

### HttpClient
- [ ] Cliente tipado via `IHttpClientFactory`, atrás de porta da Application.
- [ ] `AddStandardResilienceHandler` com timeouts explícitos.
- [ ] Retry desabilitado para métodos não idempotentes.
