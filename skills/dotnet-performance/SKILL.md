---
name: dotnet-performance
description: "Performance e otimizacao .NET C# / ASP.NET Core: consultas Entity Framework Core otimizadas (AsNoTracking, AsSplitQuery, Compiled Queries, projecoes, ExecuteUpdateAsync/ExecuteDeleteAsync), estrategias de caching (IMemoryCache local, IDistributedCache/Redis distribuido), HttpClient otimizado com IHttpClientFactory e Polly (retry, circuit breaker), paginacao eficiente, streaming com IAsyncEnumerable. Usar quando: otimizar queries EF Core; implementar caching; configurar HttpClient; code review de performance; pull request review; investigar lentidao."
---

# Performance e Otimizacao .NET C# e ASP.NET Core

Documento normativo para otimizacao de performance em projetos .NET.
Ideal para: code review automatico e pull request review.

---

## Indice
1. [Performance e Otimizacao](#performance-e-otimizacao)
2. [Entity Framework Core - Consultas Otimizadas](#entity-framework-core---consultas-otimizadas)
3. [Caching](#caching)
4. [HttpClient Otimizado](#httpclient-otimizado)

---

## Performance e Otimizacao

> **Por que performance importa?**
> - **Custo operacional**: Aplicacoes eficientes reduzem custos de infraestrutura em 30-50%
> - **Satisfacao do usuario**: Cada 100ms de latencia pode reduzir conversoes em 1%
> - **Escalabilidade**: Codigo otimizado suporta mais usuarios com mesmos recursos
> - **Sustentabilidade**: Menos CPU/memoria = menor pegada de carbono
> - **Competitive advantage**: Performance superior pode ser diferencial de mercado
> - **Developer experience**: Builds e testes rapidos aumentam produtividade da equipe

---

## Entity Framework Core - Consultas Otimizadas

```csharp
// Use AsNoTracking para consultas somente leitura
public async Task<IEnumerable<ResumoProduto>> ObterResumosProdutosAsync(CancellationToken cancellationToken)
{
    return await _context.Produtos
        .AsNoTracking()
        .Where(p => p.EstaAtivo)
        .Include(p => p.Categoria)
        .Select(p => new ResumoProduto
        {
            Id = p.Id,
            Nome = p.Nome,
            Preco = p.Preco,
            NomeCategoria = p.Categoria.Nome
        })
        .ToListAsync(cancellationToken);
}

// Use projecao para evitar carregar entidades inteiras
public async Task<Produto?> ObterProdutoPorIdAsync(int idProduto, CancellationToken cancellationToken)
{
    return await _context.Produtos
        .AsNoTracking()
        .FirstOrDefaultAsync(p => p.Id == idProduto && p.EstaAtivo, cancellationToken);
}

// Use Include/ThenInclude com criterio para relacionamentos
public async Task<DetalhesPedido?> ObterPedidoComItensAsync(int idPedido, CancellationToken cancellationToken)
{
    var pedido = await _context.Pedidos
        .AsNoTracking()
        .Include(p => p.Itens)
            .ThenInclude(i => i.Produto)
        .FirstOrDefaultAsync(p => p.Id == idPedido, cancellationToken);
    
    if (pedido is null) return null;
    
    return new DetalhesPedido 
    { 
        Pedido = pedido, 
        Itens = pedido.Itens.ToList() 
    };
}

// Use AsSplitQuery para evitar cartesian explosion com multiplos Includes
public async Task<Pedido?> ObterPedidoCompletoAsync(int idPedido, CancellationToken cancellationToken)
{
    return await _context.Pedidos
        .AsNoTracking()
        .AsSplitQuery()
        .Include(p => p.Itens)
            .ThenInclude(i => i.Produto)
        .Include(p => p.Cliente)
        .Include(p => p.Endereco)
        .FirstOrDefaultAsync(p => p.Id == idPedido, cancellationToken);
}

// Streaming para grandes datasets com AsAsyncEnumerable
public async IAsyncEnumerable<Produto> ObterTodosProdutosAsync(
    [EnumeratorCancellation] CancellationToken cancellationToken)
{
    await foreach (var produto in _context.Produtos
        .AsNoTracking()
        .Where(p => p.EstaAtivo)
        .AsAsyncEnumerable()
        .WithCancellation(cancellationToken))
    {
        yield return produto;
    }
}

// Bulk insert com AddRangeAsync
public async Task InserirProdutosEmLoteAsync(
    IEnumerable<Produto> produtos, 
    CancellationToken cancellationToken)
{
    await _context.Produtos.AddRangeAsync(produtos, cancellationToken);
    await _context.SaveChangesAsync(cancellationToken);
}

// ExecuteUpdateAsync para atualizacoes em lote (EF Core 7+)
public async Task AtualizarStatusProdutosEmLoteAsync(
    IEnumerable<int> idsProdutos, 
    bool novoStatus, 
    CancellationToken cancellationToken)
{
    await _context.Produtos
        .Where(p => idsProdutos.Contains(p.Id))
        .ExecuteUpdateAsync(setters => setters
            .SetProperty(p => p.EstaAtivo, novoStatus)
            .SetProperty(p => p.AtualizadoEm, DateTime.UtcNow),
            cancellationToken);
}

// ExecuteDeleteAsync para delecoes em lote (EF Core 7+)
public async Task RemoverProdutosInativosAsync(CancellationToken cancellationToken)
{
    await _context.Produtos
        .Where(p => !p.EstaAtivo && p.AtualizadoEm < DateTime.UtcNow.AddYears(-1))
        .ExecuteDeleteAsync(cancellationToken);
}

// Paginacao eficiente com Skip/Take
public async Task<PaginatedResult<Produto>> ObterProdutosPaginadosAsync(
    int pagina, int tamanhoPagina, CancellationToken cancellationToken)
{
    var query = _context.Produtos
        .AsNoTracking()
        .Where(p => p.EstaAtivo)
        .OrderBy(p => p.Nome);

    var totalItens = await query.CountAsync(cancellationToken);
    
    var produtos = await query
        .Skip((pagina - 1) * tamanhoPagina)
        .Take(tamanhoPagina)
        .ToListAsync(cancellationToken);

    return new PaginatedResult<Produto>
    {
        Items = produtos,
        TotalItens = totalItens,
        Pagina = pagina,
        TamanhoPagina = tamanhoPagina
    };
}

// Raw SQL quando necessario para queries complexas
public async Task<IEnumerable<RelatorioVendas>> ObterRelatorioVendasAsync(
    DateTime dataInicio,
    DateTime dataFim,
    CancellationToken cancellationToken)
{
    return await _context.Database
        .SqlQuery<RelatorioVendas>($"""
            SELECT 
                c.nome AS NomeCategoria,
                COUNT(ip.id) AS QuantidadeVendida,
                SUM(ip.quantidade * ip.preco_unitario) AS ValorTotal
            FROM itens_pedido ip
            INNER JOIN produtos p ON ip.id_produto = p.id
            INNER JOIN categorias c ON p.id_categoria = c.id
            INNER JOIN pedidos ped ON ip.id_pedido = ped.id
            WHERE ped.criado_em BETWEEN {dataInicio} AND {dataFim}
            GROUP BY c.nome
            ORDER BY ValorTotal DESC
            """)
        .ToListAsync(cancellationToken);
}

// Compiled Queries para consultas frequentes
private static readonly Func<AppDbContext, int, CancellationToken, Task<Produto?>> 
    _obterProdutoPorIdCompilado = EF.CompileAsyncQuery(
        (AppDbContext context, int id, CancellationToken ct) =>
            context.Produtos
                .AsNoTracking()
                .FirstOrDefault(p => p.Id == id && p.EstaAtivo));

public async Task<Produto?> ObterProdutoRapidoAsync(int id, CancellationToken cancellationToken)
{
    return await _obterProdutoPorIdCompilado(_context, id, cancellationToken);
}
```

---

## Caching

```csharp
public class ServicoProduto
{
    private readonly IMemoryCache _cache;
    private readonly IRepositorioProduto _repositorio;
    private readonly ILogger<ServicoProduto> _logger;
    private static readonly TimeSpan ExpiracaoCache = TimeSpan.FromMinutes(30);

    public async Task<Produto?> ObterProdutoAsync(int id, CancellationToken cancellationToken)
    {
        return await _cache.GetOrCreateAsync($"produto_{id}", async entrada =>
        {
            entrada.AbsoluteExpirationRelativeToNow = ExpiracaoCache;
            entrada.SetPriority(CacheItemPriority.High);
            
            _logger.LogDebug("Cache miss para produto {IdProduto}", id);
            return await _repositorio.ObterPorIdAsync(id, cancellationToken);
        });
    }

    public async Task<Produto> AtualizarProdutoAsync(Produto produto, CancellationToken cancellationToken)
    {
        var produtoAtualizado = await _repositorio.AtualizarAsync(produto, cancellationToken);
        
        // Invalidar cache especifico
        _cache.Remove($"produto_{produto.Id}");
        _cache.Remove($"produtos_categoria_{produto.IdCategoria}");
        
        return produtoAtualizado;
    }

    // Cache com sliding expiration para dados acessados frequentemente
    public async Task<IEnumerable<Categoria>> ObterCategoriasPopularesAsync(CancellationToken cancellationToken)
    {
        return await _cache.GetOrCreateAsync("categorias_populares", async entrada =>
        {
            entrada.SlidingExpiration = TimeSpan.FromHours(2);
            entrada.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(12);
            
            return await _repositorio.ObterCategoriasPopularesAsync(cancellationToken);
        });
    }
}

// Cache distribuido com Redis para multiplas instancias
public class ServicoProdutoDistribuido
{
    private readonly IDistributedCache _cache;
    private readonly IRepositorioProduto _repositorio;
    private readonly JsonSerializerOptions _jsonOptions;

    public ServicoProdutoDistribuido(IDistributedCache cache, IRepositorioProduto repositorio)
    {
        _cache = cache;
        _repositorio = repositorio;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    public async Task<Produto?> ObterProdutoAsync(int id, CancellationToken cancellationToken)
    {
        var chaveCache = $"produto_{id}";
        var produtoJson = await _cache.GetStringAsync(chaveCache, cancellationToken);

        if (produtoJson != null)
        {
            return JsonSerializer.Deserialize<Produto>(produtoJson, _jsonOptions);
        }

        var produto = await _repositorio.ObterPorIdAsync(id, cancellationToken);
        if (produto != null)
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
                SlidingExpiration = TimeSpan.FromMinutes(5)
            };

            var json = JsonSerializer.Serialize(produto, _jsonOptions);
            await _cache.SetStringAsync(chaveCache, json, options, cancellationToken);
        }

        return produto;
    }
}
```

---

## HttpClient Otimizado

```csharp
public class ServicoApiExterna
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<ServicoApiExterna> _logger;
    private readonly IMemoryCache _cache;

    public ServicoApiExterna(HttpClient httpClient, ILogger<ServicoApiExterna> logger, IMemoryCache cache)
    {
        _httpClient = httpClient;
        _logger = logger;
        _cache = cache;
        
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", "MeuApp/1.0");
        _httpClient.DefaultRequestHeaders.Add("Accept", "application/json");
    }

    public async Task<T?> ObterAsync<T>(string endpoint, CancellationToken cancellationToken = default)
    {
        var chaveCache = $"api_cache_{endpoint}";
        
        if (_cache.TryGetValue(chaveCache, out T? resultadoCache))
        {
            _logger.LogDebug("Cache hit para endpoint {Endpoint}", endpoint);
            return resultadoCache;
        }

        try
        {
            var resposta = await _httpClient.GetAsync(endpoint, cancellationToken);
            resposta.EnsureSuccessStatusCode();
            
            var resultado = await resposta.Content.ReadFromJsonAsync<T>(cancellationToken: cancellationToken);
            
            if (resultado != null)
            {
                _cache.Set(chaveCache, resultado, TimeSpan.FromMinutes(15));
            }
            
            return resultado;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Requisicao HTTP falhou para endpoint {Endpoint}", endpoint);
            return default;
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            _logger.LogWarning("Timeout da requisicao para endpoint {Endpoint}", endpoint);
            return default;
        }
    }
}

// Registro no DI com configuracao otimizada
builder.Services.AddHttpClient<ServicoApiExterna>(client =>
{
    client.BaseAddress = new Uri("https://api.externa.com/");
    client.DefaultRequestHeaders.Add("Accept", "application/json");
    client.Timeout = TimeSpan.FromSeconds(30);
})
.ConfigurePrimaryHttpMessageHandler(() =>
{
    return new HttpClientHandler()
    {
        MaxConnectionsPerServer = 20,
        UseCookies = false
    };
})
.AddPolicyHandler(GetRetryPolicy())
.AddPolicyHandler(GetCircuitBreakerPolicy());

static IAsyncPolicy<HttpResponseMessage> GetRetryPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .WaitAndRetryAsync(
            retryCount: 3,
            sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)));
}

static IAsyncPolicy<HttpResponseMessage> GetCircuitBreakerPolicy()
{
    return HttpPolicyExtensions
        .HandleTransientHttpError()
        .CircuitBreakerAsync(
            handledEventsAllowedBeforeBreaking: 5,
            durationOfBreak: TimeSpan.FromSeconds(30));
}
```

---

## Checklist de Performance

### Entity Framework Core
- [ ] AsNoTracking para consultas somente leitura
- [ ] Projecoes (Select) ao inves de carregar entidades inteiras
- [ ] AsSplitQuery para multiplos Includes
- [ ] ExecuteUpdateAsync/ExecuteDeleteAsync para operacoes em lote
- [ ] Compiled Queries para consultas frequentes
- [ ] Paginacao eficiente implementada
- [ ] Connection pooling otimizado (DbContextPool)

### Caching
- [ ] IMemoryCache para cache local
- [ ] IDistributedCache/Redis para multiplas instancias
- [ ] Invalidacao de cache em operacoes de escrita
- [ ] Sliding e absolute expiration configurados
- [ ] Cache dependencies quando aplicavel

### HttpClient
- [ ] HttpClient configurado via DI (IHttpClientFactory)
- [ ] Retry policies com Polly implementadas
- [ ] Circuit breaker configurado
- [ ] Timeouts apropriados
- [ ] Connection pooling otimizado