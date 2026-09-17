# Referência completa — Observabilidade .NET

> Leia sob demanda para configurações detalhadas de health checks, logging, tracing, métricas e
> probes.

Os exemplos seguem as demais skills .NET: bootstrap em `Api/Extensions/` (`dotnet-program-setup`),
casos de uso na Application (`dotnet-architecture`), PostgreSQL como banco padrão, Valkey como
cache e RabbitMQ com outbox (`dotnet-dependency-config`). Código, nomes de métricas, tags e
mensagens de log ficam em inglês.

## Índice

1. [Health checks](#1-health-checks)
2. [Kubernetes probes](#2-kubernetes-probes)
3. [Tracing e métricas da aplicação](#3-tracing-e-métricas-da-aplicação)
4. [Logging estruturado e correlação](#4-logging-estruturado-e-correlação)
5. [Checklist](#checklist-de-observabilidade)

---

## 1. Health checks

Separe por intenção com tags:

| Tag | Endpoint | Pergunta | Pode depender de serviço externo? |
|---|---|---|---|
| `live` | `/health/live` | O processo está vivo e não travado? | **Não** — falha reinicia o pod |
| `ready` | `/health/ready` | O pod pode receber tráfego agora? | Sim, só dependências obrigatórias |

Dependência opcional (cache, API de terceiros) retorna `Degraded`, nunca `Unhealthy` na
readiness: tirar todos os pods do balanceador porque o cache caiu transforma degradação em
indisponibilidade.

### Pacotes

```bash
dotnet add src/ProjectName.Api package AspNetCore.HealthChecks.NpgSql
dotnet add src/ProjectName.Api package AspNetCore.HealthChecks.Redis   # works with Valkey
```

Oracle, só para serviços que o utilizam: `AspNetCore.HealthChecks.Oracle`.

### Registro

```csharp
// Api/Extensions/HealthCheckExtensions.cs
public static class HealthCheckExtensions
{
    private const string LiveTag = "live";
    private const string ReadyTag = "ready";

    public static IServiceCollection AddHealthCheckConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), tags: [LiveTag])
            .AddNpgSql(
                configuration.GetConnectionString("DefaultConnection")!,
                name: "postgresql",
                failureStatus: HealthStatus.Unhealthy,
                tags: [ReadyTag],
                timeout: TimeSpan.FromSeconds(5))
            .AddCheck<RabbitMqHealthCheck>(
                "rabbitmq",
                failureStatus: HealthStatus.Unhealthy,
                tags: [ReadyTag],
                timeout: TimeSpan.FromSeconds(5))
            .AddRedis(
                configuration.GetConnectionString("Cache")!,
                name: "valkey",
                failureStatus: HealthStatus.Degraded,
                tags: [ReadyTag],
                timeout: TimeSpan.FromSeconds(3))
            .AddCheck<OutboxHealthCheck>(
                "outbox",
                failureStatus: HealthStatus.Degraded,
                tags: [ReadyTag]);

        return services;
    }

    public static IEndpointRouteBuilder MapHealthCheckConfiguration(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains(LiveTag)
        });

        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains(ReadyTag)
        });

        return endpoints;
    }
}
```

O writer padrão responde só `Healthy`/`Degraded`/`Unhealthy`. Não publique o detalhe de cada
check (descrição, exceção, host) em endpoint acessível de fora do cluster.

### Check customizado — RabbitMQ

```csharp
// Infra.Messaging/HealthChecks/RabbitMqHealthCheck.cs
public sealed class RabbitMqHealthCheck : IHealthCheck
{
    private readonly RabbitMqConnectionProvider _connectionProvider;

    public RabbitMqHealthCheck(RabbitMqConnectionProvider connectionProvider) => _connectionProvider = connectionProvider;

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var connection = await _connectionProvider.GetConnectionAsync(cancellationToken);
            return connection.IsOpen
                ? HealthCheckResult.Healthy()
                : new HealthCheckResult(context.Registration.FailureStatus, "RabbitMQ connection is closed");
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return new HealthCheckResult(context.Registration.FailureStatus, "RabbitMQ is unreachable", ex);
        }
    }
}
```

### Check customizado — outbox

Mensagem presa no outbox é evento de negócio que não saiu. O check degrada o serviço e expõe os
números em `data` para o monitoramento.

```csharp
// Infra.Data/HealthChecks/OutboxHealthCheck.cs
public sealed class OutboxHealthCheck : IHealthCheck
{
    private static readonly TimeSpan MaxPendingAge = TimeSpan.FromMinutes(5);

    private readonly ProjectNameDbContext _context;
    private readonly OutboxOptions _options;

    public OutboxHealthCheck(ProjectNameDbContext context, IOptions<OutboxOptions> options)
    {
        _context = context;
        _options = options.Value;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var exhaustedCount = await _context.OutboxMessages
            .CountAsync(m => m.ProcessedOn == null && m.Attempts >= _options.MaxAttempts, cancellationToken);

        var oldestPending = await _context.OutboxMessages
            .Where(m => m.ProcessedOn == null)
            .MinAsync(m => (DateTime?)m.OccurredOn, cancellationToken);

        var oldestPendingAge = oldestPending is null ? TimeSpan.Zero : DateTime.UtcNow - oldestPending.Value;

        var data = new Dictionary<string, object>
        {
            ["exhaustedMessages"] = exhaustedCount,
            ["oldestPendingAgeSeconds"] = (int)oldestPendingAge.TotalSeconds
        };

        if (exhaustedCount > 0)
            return new HealthCheckResult(context.Registration.FailureStatus, "Outbox has messages with exhausted attempts", data: data);

        if (oldestPendingAge > MaxPendingAge)
            return new HealthCheckResult(context.Registration.FailureStatus, "Outbox publishing is lagging", data: data);

        return HealthCheckResult.Healthy(data: data);
    }
}
```

Regras para checks customizados:

- Retorne `context.Registration.FailureStatus` em vez de fixar `Unhealthy`: quem decide a
  severidade é o registro.
- Nunca coloque stack trace, connection string ou dado pessoal em `description` ou `data`.
- Todo check tem timeout; um check lento derruba a probe inteira.

---

## 2. Kubernetes probes

```yaml
# deployment.yaml (trecho)
containers:
  - name: api
    image: registry.example.com/projectname-api:1.4.0
    ports:
      - containerPort: 8080
    startupProbe:
      httpGet:
        path: /health/live
        port: 8080
      periodSeconds: 5
      failureThreshold: 30        # up to 150 s to start
    livenessProbe:
      httpGet:
        path: /health/live
        port: 8080
      periodSeconds: 20
      timeoutSeconds: 3
      failureThreshold: 3
    readinessProbe:
      httpGet:
        path: /health/ready
        port: 8080
      periodSeconds: 10
      timeoutSeconds: 5
      failureThreshold: 3
```

- Liveness nunca aponta para `/health/ready`: banco fora do ar reiniciaria todos os pods em loop.
- Enquanto a startup probe não passa, liveness e readiness não rodam.
- Migrations não rodam no boot (`dotnet-dependency-config`); a startup probe não precisa esperar
  por elas.

---

## 3. Tracing e métricas da aplicação

A instrumentação de ASP.NET Core, HttpClient e EF Core já gera os spans de borda. Crie spans e
métricas próprios só para operações de negócio que precisam ser observadas separadamente.

### Fonte única por serviço

```csharp
// Application/Common/ProjectNameTelemetry.cs
public static class ProjectNameTelemetry
{
    public const string SourceName = "ProjectName.Application";

    public static readonly ActivitySource ActivitySource = new(SourceName);

    public static readonly Meter Meter = new(SourceName);

    public static readonly Counter<long> CategoriesCreated =
        Meter.CreateCounter<long>("catalog.categories.created", unit: "{category}", description: "Categories created");
}
```

`ActivitySource` e `Meter` pertencem a `System.Diagnostics`, sem dependência de OpenTelemetry na
Application. O registro dos exportadores fica em `Api/Extensions/ObservabilityExtensions.cs`
(`dotnet-production-readiness`), com `.AddSource(ProjectNameTelemetry.SourceName)` e
`.AddMeter(ProjectNameTelemetry.SourceName)`.

### Span e métrica em um caso de uso

```csharp
public sealed class CreateCategory : ICreateCategory
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateCategory> _logger;

    public CreateCategory(ICategoryRepository categoryRepository, IUnitOfWork unitOfWork, ILogger<CreateCategory> logger)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<CategoryModelOutput> ExecuteAsync(CreateCategoryInput input, CancellationToken cancellationToken)
    {
        using var activity = ProjectNameTelemetry.ActivitySource.StartActivity("CreateCategory");

        try
        {
            var category = Category.Create(input.Name, input.Description ?? string.Empty, input.IsActive);

            await _categoryRepository.InsertAsync(category, cancellationToken);
            await _unitOfWork.CommitAsync(cancellationToken);

            activity?.SetTag("catalog.category.id", category.Id);
            ProjectNameTelemetry.CategoriesCreated.Add(1);
            _logger.LogInformation("Category {CategoryId} created", category.Id);

            return CategoryModelOutput.FromCategory(category);
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.GetType().Name);
            activity?.AddException(ex); // .NET 9+; on .NET 8 use RecordException from OpenTelemetry.Api
            throw;
        }
    }
}
```

- O controller continua fino: sem `try/catch`, sem span manual. A falha HTTP é registrada pela
  instrumentação de ASP.NET Core e respondida pelo `GlobalExceptionHandler`.
- Tags de span e dimensões de métrica não recebem dado pessoal (nome, e-mail, documento).
- Dimensão de métrica tem cardinalidade baixa: nunca Id de entidade como dimensão.

---

## 4. Logging estruturado e correlação

### Templates

```csharp
// Correct: structured template, values become queryable fields
_logger.LogInformation("Category {CategoryId} updated by {UserId}", category.Id, userId);

// Wrong: interpolation loses the fields and allocates even when the level is disabled
_logger.LogInformation($"Category {category.Id} updated by {userId}");
```

### Scopes

O scope adiciona campos a todos os logs dentro do bloco. Com `IncludeScopes = true` no exportador
OpenTelemetry, eles chegam como atributos do log, junto com `TraceId` e `SpanId`.

```csharp
// Infra.Messaging/Consuming/RabbitMqConsumerWorker.cs (trecho)
using var scope = _logger.BeginScope(new Dictionary<string, object?>
{
    ["messaging.system"] = "rabbitmq",
    ["messaging.destination.name"] = _queue,
    ["messaging.message.id"] = context.MessageId
});

_logger.LogDebug("Handling message");
```

Use os nomes das convenções semânticas do OpenTelemetry quando existirem (`messaging.*`,
`http.*`, `db.*`); para atributos de negócio, prefixe com o domínio (`catalog.category.id`).

### Níveis por camada

| Onde | Nível típico |
|---|---|
| Caso de uso concluído (evento de negócio) | `Information` |
| Rejeição esperada (validação, 404, 422) | `Information` no `GlobalExceptionHandler` |
| Retry acionado, dependência opcional degradada | `Warning` |
| Falha não tratada, mensagem enviada para DLQ | `Error` |
| Detalhe de fluxo para diagnóstico | `Debug` |

Health checks já registram falhas na categoria `Microsoft.Extensions.Diagnostics.HealthChecks`;
não duplique log dentro do check.

---

## Checklist de observabilidade

### Health checks
- [ ] `/health/live` só com checks locais; `/health/ready` com dependências obrigatórias.
- [ ] Dependências opcionais retornam `Degraded`.
- [ ] Todo check tem timeout e usa `context.Registration.FailureStatus`.
- [ ] Outbox e broker têm check próprio.
- [ ] Resposta pública sem detalhes internos.
- [ ] Probes do Kubernetes apontam para os endpoints corretos.

### Tracing e métricas
- [ ] Uma `ActivitySource` e um `Meter` por serviço, registrados no OpenTelemetry.
- [ ] Spans manuais só em operações de negócio relevantes, com status de erro e exceção registrados.
- [ ] Tags e dimensões sem dado pessoal e com cardinalidade controlada.

### Logging
- [ ] Templates estruturados, sem interpolação.
- [ ] Scopes com convenções semânticas em consumidores e workers.
- [ ] Níveis coerentes com a tabela acima.
