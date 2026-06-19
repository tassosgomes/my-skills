---
name: dotnet-observability
description: "Observabilidade completa para .NET C# / ASP.NET Core: Health Checks com AspNetCore.Diagnostics.HealthChecks (liveness/readiness/startup probes para Kubernetes), health checks customizados para regras de negocio, logging estruturado com OpenTelemetry integrado a tracing, scopes de log para correlacao, metricas e telemetria, CancellationToken aplicado corretamente, configuracao por ambiente. Usar quando: implementar health checks; configurar probes Kubernetes; integrar logging com tracing; auditar observabilidade; adicionar metricas; configurar monitoramento."
---

# Observabilidade e Monitoramento .NET C# e ASP.NET Core

Documento normativo para health checks, logging integrado e estrategias de monitoramento.
Skill critica — deve ser executada como auditoria automatica.

> **Politica de Banco de Dados nos exemplos**
> - **PostgreSQL e o padrao oficial** — exemplos principais usam PostgreSQL
> - **Oracle e alternativa suportada** — apenas para servicos oficialmente Oracle

---

## Indice

1. [Health Checks](#health-checks)
2. [Logging Integrado com Tracing](#logging-integrado-com-tracing)

---

# 1. Health Checks

> **Por que Health Checks sao essenciais?**
> - **Monitoramento proativo**: Detectam problemas antes que afetem usuarios finais
> - **Orquestracao de containers**: Kubernetes e Docker usam health checks para tomada de decisoes automaticas
> - **Load balancers inteligentes**: Direcionam trafego apenas para instancias saudaveis
> - **Alertas automaticos**: Sistemas de monitoramento podem gerar alertas baseados em health checks
> - **Diagnostico rapido**: Identificam rapidamente qual componente esta falhando
> - **SLA e SLI**: Fundamentais para medir disponibilidade e performance do sistema

### Biblioteca Recomendada: AspNetCore.Diagnostics.HealthChecks

```xml
<!-- Pacotes principais -->
<PackageReference Include="Microsoft.Extensions.Diagnostics.HealthChecks" Version="8.0.0" />
<PackageReference Include="Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore" Version="8.0.0" />

<!-- AspNetCore.HealthChecks - Extensoes especificas -->
<PackageReference Include="AspNetCore.HealthChecks.UI.Client" Version="7.1.0" />

<!-- Health checks especificos -->
<PackageReference Include="AspNetCore.HealthChecks.NpgSql" Version="7.0.0" />
<PackageReference Include="AspNetCore.HealthChecks.Redis" Version="7.0.0" />
<PackageReference Include="AspNetCore.HealthChecks.RabbitMQ" Version="7.0.0" />
<PackageReference Include="AspNetCore.HealthChecks.Elasticsearch" Version="7.0.0" />
<PackageReference Include="AspNetCore.HealthChecks.Network" Version="7.0.0" />

<!-- Alternativa Oracle (quando servico usa Oracle) -->
<!-- <PackageReference Include="AspNetCore.HealthChecks.Oracle" Version="7.0.0" /> -->
```

### Configuracao Basica — PostgreSQL (Padrao)

```csharp
// Program.cs
using HealthChecks.UI.Client;
using Microsoft.Extensions.Diagnostics.HealthChecks;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHealthChecks()
    // Health check basico da aplicacao
    .AddCheck("aplicacao", () => HealthCheckResult.Healthy("Aplicacao esta funcionando"))
    
    // Health check de banco de dados PostgreSQL (padrao)
    .AddNpgSql(
        connectionString: builder.Configuration.GetConnectionString("DefaultConnection")!,
        name: "banco-postgresql",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "banco", "postgresql" })
    
    // Health check de Entity Framework
    .AddDbContextCheck<AppDbContext>(
        name: "contexto-ef",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "banco", "ef-core" })
    
    // Health check de servico HTTP externo
    .AddUrlGroup(
        uri: new Uri("https://api.externa.com/health"),
        name: "api-externa",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "externo", "api" })
    
    // Health check de Redis
    .AddRedis(
        connectionString: builder.Configuration.GetConnectionString("Redis")!,
        name: "cache-redis",
        failureStatus: HealthStatus.Degraded,
        tags: new[] { "cache", "redis" })
    
    // Health check customizado com dependency injection
    .AddCheck<VerificadorServicoCustomizado>(
        name: "servico-customizado",
        failureStatus: HealthStatus.Unhealthy,
        tags: new[] { "negocio", "customizado" });

var app = builder.Build();

// Endpoint basico de health check
app.MapHealthChecks("/health", new HealthCheckOptions
{
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse,
    ResultStatusCodes =
    {
        [HealthStatus.Healthy] = StatusCodes.Status200OK,
        [HealthStatus.Degraded] = StatusCodes.Status200OK,
        [HealthStatus.Unhealthy] = StatusCodes.Status503ServiceUnavailable
    }
});

// Endpoint filtrado por tags
app.MapHealthChecks("/health/banco", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("banco"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.MapHealthChecks("/health/externos", new HealthCheckOptions
{
    Predicate = check => check.Tags.Contains("externo"),
    ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
});

app.Run();
```

### Health Check Customizado

```csharp
public class VerificadorServicoCustomizado : IHealthCheck
{
    private readonly IServicoNegocio _servicoNegocio;
    private readonly ILogger<VerificadorServicoCustomizado> _logger;

    public VerificadorServicoCustomizado(
        IServicoNegocio servicoNegocio,
        ILogger<VerificadorServicoCustomizado> logger)
    {
        _servicoNegocio = servicoNegocio;
        _logger = logger;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var statusServico = await _servicoNegocio.VerificarStatusAsync(cancellationToken);
            
            if (!statusServico.EstaOperacional)
            {
                return HealthCheckResult.Unhealthy(
                    description: $"Servico de negocio nao operacional: {statusServico.Motivo}",
                    data: new Dictionary<string, object>
                    {
                        ["ultimaVerificacao"] = DateTime.UtcNow,
                        ["motivoFalha"] = statusServico.Motivo,
                        ["tentativasReconexao"] = statusServico.TentativasReconexao
                    });
            }

            if (statusServico.PerformanceDegradada)
            {
                return HealthCheckResult.Degraded(
                    description: "Servico operacional mas com performance degradada",
                    data: new Dictionary<string, object>
                    {
                        ["tempoResposta"] = statusServico.TempoResposta.TotalMilliseconds,
                        ["limitePerformance"] = statusServico.LimitePerformance.TotalMilliseconds
                    });
            }

            return HealthCheckResult.Healthy(
                description: "Servico de negocio operacional",
                data: new Dictionary<string, object>
                {
                    ["tempoResposta"] = statusServico.TempoResposta.TotalMilliseconds,
                    ["ultimaVerificacao"] = DateTime.UtcNow,
                    ["versaoServico"] = statusServico.Versao
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao verificar health check do servico customizado");
            
            return HealthCheckResult.Unhealthy(
                description: $"Erro inesperado: {ex.Message}",
                exception: ex,
                data: new Dictionary<string, object>
                {
                    ["tipoErro"] = ex.GetType().Name,
                    ["stackTrace"] = ex.StackTrace ?? "N/A"
                });
        }
    }
}
```

### Health Checks em Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: minha-aplicacao
spec:
  template:
    spec:
      containers:
      - name: app
        image: minha-aplicacao:latest
        ports:
        - containerPort: 8080
        
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 30
          timeoutSeconds: 5
          failureThreshold: 3
          
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 1
          
        startupProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30
```

### Melhores Praticas

#### 1. Categorizacao por Tags
```csharp
.AddCheck("banco", () => HealthCheckResult.Healthy(), tags: new[] { "critico", "infraestrutura" })
.AddCheck("cache", () => HealthCheckResult.Healthy(), tags: new[] { "performance", "cache" })
.AddCheck("negocio", () => HealthCheckResult.Healthy(), tags: new[] { "negocio", "funcional" })
```

#### 2. Timeouts Apropriados
```csharp
.AddNpgSql(connectionString, timeout: TimeSpan.FromSeconds(5))   // Critico: rapido
.AddRedis(connectionString, timeout: TimeSpan.FromSeconds(10))    // Cache: moderado
.AddUrlGroup(uri, timeout: TimeSpan.FromSeconds(30))              // Externo: generoso
```

#### 3. Status Granular
```csharp
// Healthy: Tudo funcionando perfeitamente
// Degraded: Funcionando mas com limitacoes (cache offline, replica indisponivel)
// Unhealthy: Nao funcionando (banco principal offline, servico critico down)
```

#### 4. Dados Contextuais
```csharp
return HealthCheckResult.Healthy("Conectado ao banco", new Dictionary<string, object>
{
    ["servidor"] = "server01.empresa.com",
    ["versao"] = "16.2",
    ["tempoResposta"] = "15ms",
    ["conexoesAtivas"] = 25,
    ["ultimaVerificacao"] = DateTime.UtcNow
});
```

---

# 2. Logging Integrado com Tracing

### Logging com Scopes para Correlacao

```csharp
public async Task ProcessarLoteAsync(IEnumerable<Lead> leads)
{
    var loteId = Guid.NewGuid();
    
    // Scope adiciona contexto a todos os logs dentro do bloco
    using (_logger.BeginScope(new Dictionary<string, object>
    {
        ["LoteId"] = loteId,
        ["TotalLeads"] = leads.Count()
    }))
    {
        _logger.LogInformation("Iniciando processamento de lote");
        
        foreach (var lead in leads)
        {
            _logger.LogDebug("Processando lead {LeadId}", lead.Id);
        }
        
        _logger.LogInformation("Lote processado com sucesso");
    }
}
```

### Logging em Controllers com Spans OpenTelemetry

```csharp
using System.Diagnostics;

[ApiController]
[Route("api/[controller]")]
public class LeadsController : ControllerBase
{
    private readonly ILogger<LeadsController> _logger;
    private readonly ILeadService _leadService;
    private static readonly ActivitySource ActivitySource = new("GestAuto.Commercial");

    [HttpPost]
    public async Task<IActionResult> CriarLead([FromBody] LeadDto lead)
    {
        using var activity = ActivitySource.StartActivity("CriarLead");
        activity?.SetTag("lead.nome", lead.Nome);
        activity?.SetTag("lead.origem", lead.Origem);

        _logger.LogInformation(
            "Criando lead para {Nome} via {Origem}", 
            lead.Nome, lead.Origem);

        try
        {
            var resultado = await _leadService.CriarAsync(lead);
            
            _logger.LogInformation(
                "Lead {LeadId} criado com sucesso para {Nome}",
                resultado.Id, lead.Nome);
            
            activity?.SetTag("lead.id", resultado.Id);
            
            return CreatedAtAction(nameof(ObterLead), new { id = resultado.Id }, resultado);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex,
                "Validacao falhou ao criar lead para {Nome}: {Mensagem}",
                lead.Nome, ex.Message);
            
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao criar lead para {Nome}", lead.Nome);
            
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            throw;
        }
    }
}
```

### Logging em Services com Spans

```csharp
public class LeadService : ILeadService
{
    private readonly ILogger<LeadService> _logger;
    private readonly ILeadRepository _repository;
    private static readonly ActivitySource ActivitySource = new("GestAuto.Commercial");

    public async Task<Lead> ProcessarLeadAsync(Guid leadId, CancellationToken ct)
    {
        using var activity = ActivitySource.StartActivity("ProcessarLead");
        activity?.SetTag("lead.id", leadId);

        _logger.LogDebug("Iniciando processamento do lead {LeadId}", leadId);

        var lead = await _repository.ObterPorIdAsync(leadId, ct);
        
        if (lead is null)
        {
            _logger.LogWarning("Lead {LeadId} nao encontrado", leadId);
            throw new NotFoundException($"Lead {leadId} nao encontrado");
        }

        _logger.LogInformation(
            "Lead {LeadId} processado com sucesso. Status: {Status}",
            leadId, lead.Status);

        return lead;
    }
}
```

### Integracao de Health Check com Logging Estruturado

```csharp
public class HealthCheckComLogging : IHealthCheck
{
    private readonly ILogger<HealthCheckComLogging> _logger;

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context, 
        CancellationToken cancellationToken = default)
    {
        using var escopo = _logger.BeginScope(new Dictionary<string, object>
        {
            ["healthCheck.nome"] = context.Registration.Name,
            ["healthCheck.tags"] = string.Join(",", context.Registration.Tags),
            ["event.action"] = "health.check"
        });

        var cronometro = Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Iniciando health check {HealthCheckNome}", context.Registration.Name);
            
            // Verificacao real...
            
            cronometro.Stop();
            
            _logger.LogInformation(
                "Health check {HealthCheckNome} concluido com sucesso em {Duracao}ms",
                context.Registration.Name, cronometro.ElapsedMilliseconds);
                
            return HealthCheckResult.Healthy(
                description: "Conexao com banco de dados bem-sucedida",
                data: new Dictionary<string, object>
                {
                    ["duracao"] = cronometro.ElapsedMilliseconds,
                    ["timestamp"] = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            cronometro.Stop();
            
            _logger.LogError(ex, 
                "Health check {HealthCheckNome} falhou apos {Duracao}ms: {ErroMensagem}",
                context.Registration.Name, cronometro.ElapsedMilliseconds, ex.Message);
                
            return HealthCheckResult.Unhealthy(
                description: $"Falha na conexao: {ex.Message}",
                exception: ex,
                data: new Dictionary<string, object>
                {
                    ["duracao"] = cronometro.ElapsedMilliseconds,
                    ["tipoErro"] = ex.GetType().Name
                });
        }
    }
}
```

---

## Checklist de Observabilidade

### Health Checks
- [ ] AspNetCore.Diagnostics.HealthChecks configurado
- [ ] Health checks por categoria (tags)
- [ ] Endpoints basicos (/health) e filtrados
- [ ] Health checks customizados para regras de negocio
- [ ] Timeouts apropriados por criticidade
- [ ] Logging estruturado integrado
- [ ] Kubernetes probes configurados (liveness/readiness/startup)
- [ ] Dados contextuais uteis
- [ ] Status granular (Healthy/Degraded/Unhealthy)
- [ ] PostgreSQL como exemplo principal nos health checks

### Logging Integrado
- [ ] Scopes de log para correlacao de contexto
- [ ] ActivitySource com spans customizados
- [ ] Tags adicionadas aos spans
- [ ] Excecoes registradas nos spans
- [ ] Log levels apropriados por camada

### Monitoramento
- [ ] Metricas de performance de health checks
- [ ] Correlation IDs para rastreamento
- [ ] Dashboard para visualizacao
- [ ] Alertas automaticos baseados em status
- [ ] SLI/SLO definidos e medidos