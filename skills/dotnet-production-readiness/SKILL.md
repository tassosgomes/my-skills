---
name: dotnet-production-readiness
description: "Checklist de prontidao para producao .NET C# / ASP.NET Core: configuracao de logging/tracing com OpenTelemetry (OTLP padrao oficial), formato de logs estruturados JSON, sanitizacao de dados sensiveis (CPF, email, telefone), niveis de log por ambiente, correlacao via TraceId, exportacao OTLP, checklist consolidado de deploy. Usar quando: preparar servico para producao; configurar OpenTelemetry; revisar logs; sanitizar dados; validar deploy; garantir observabilidade completa."
---

# Prontidao para Producao — .NET C# / ASP.NET Core

Documento normativo e checklist consolidado.
Bloqueia deploy que nao atenda aos requisitos minimos.

---

## Indice
1. [Logging e Tracing com OpenTelemetry](#logging-e-tracing-com-opentelemetry)
2. [Formato de Logs](#formato-de-logs)
3. [Boas Praticas de Logging](#boas-praticas-de-logging)
4. [Sanitizacao de Dados Sensiveis](#sanitizacao-de-dados-sensiveis)
5. [Niveis de Log por Ambiente](#niveis-de-log-por-ambiente)
6. [Checklist de Producao](#checklist-de-producao)

---

## Logging e Tracing com OpenTelemetry

> **OpenTelemetry (OTLP) e o padrao oficial.**
> Nao usar Serilog + ECS em novos servicos.

### Pacotes Necessarios
```xml
<PackageReference Include="OpenTelemetry" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Api" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" Version="1.7.0" />
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" Version="1.7.0" />
```

### Configuracao em Program.cs
```csharp
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// ── Recurso compartilhado ──
var serviceName = builder.Configuration["ServiceName"] ?? "meu-servico";
var serviceVersion = typeof(Program).Assembly.GetName().Version?.ToString() ?? "1.0.0";

var resourceBuilder = ResourceBuilder.CreateDefault()
    .AddService(serviceName, serviceVersion: serviceVersion)
    .AddAttributes(new Dictionary<string, object>
    {
        ["deployment.environment"] = builder.Environment.EnvironmentName,
        ["host.name"] = Environment.MachineName
    });

// ── Tracing ──
builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .SetResourceBuilder(resourceBuilder)
        .AddAspNetCoreInstrumentation(opts =>
        {
            opts.RecordException = true;
            opts.Filter = ctx => !ctx.Request.Path.StartsWithSegments("/health");
        })
        .AddHttpClientInstrumentation(opts =>
        {
            opts.RecordException = true;
        })
        .AddSource(serviceName)
        .AddOtlpExporter(opts =>
        {
            opts.Endpoint = new Uri(
                builder.Configuration["OpenTelemetry:OtlpEndpoint"] ?? "http://localhost:4317");
        }));

// ── Metrics ──
builder.Services.AddOpenTelemetry()
    .WithMetrics(metrics => metrics
        .SetResourceBuilder(resourceBuilder)
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter());

// ── Logging ──
builder.Logging.ClearProviders();
builder.Logging.AddOpenTelemetry(logging =>
{
    logging.SetResourceBuilder(resourceBuilder);
    logging.IncludeFormattedMessage = true;
    logging.IncludeScopes = true;
    logging.AddOtlpExporter(opts =>
    {
        opts.Endpoint = new Uri(
            builder.Configuration["OpenTelemetry:OtlpEndpoint"] ?? "http://localhost:4317");
    });
});
```

### Configuracao em appsettings.json
```json
{
  "ServiceName": "meu-servico-api",
  "OpenTelemetry": {
    "OtlpEndpoint": "http://otel-collector:4317"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning",
      "System.Net.Http.HttpClient": "Warning"
    }
  }
}
```

### ActivitySource para Tracing Manual
```csharp
using System.Diagnostics;

public class ServicoPedido
{
    private static readonly ActivitySource ActivitySource = new("meu-servico");
    private readonly ILogger<ServicoPedido> _logger;

    public ServicoPedido(ILogger<ServicoPedido> logger)
    {
        _logger = logger;
    }

    public async Task<Pedido> CriarPedidoAsync(SolicitacaoCriarPedido solicitacao, CancellationToken cancellationToken)
    {
        using var activity = ActivitySource.StartActivity("CriarPedido");
        activity?.SetTag("pedido.cliente_id", solicitacao.IdCliente);
        activity?.SetTag("pedido.total_itens", solicitacao.Itens.Count);

        _logger.LogInformation(
            "Criando pedido para cliente {ClienteId} com {TotalItens} itens",
            solicitacao.IdCliente,
            solicitacao.Itens.Count);

        try
        {
            var pedido = await ProcessarPedidoAsync(solicitacao, cancellationToken);
            
            activity?.SetTag("pedido.id", pedido.Id);
            activity?.SetStatus(ActivityStatusCode.Ok);
            
            _logger.LogInformation(
                "Pedido {PedidoId} criado com sucesso para cliente {ClienteId}",
                pedido.Id,
                solicitacao.IdCliente);

            return pedido;
        }
        catch (Exception ex)
        {
            activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
            activity?.RecordException(ex);
            
            _logger.LogError(ex,
                "Erro ao criar pedido para cliente {ClienteId}",
                solicitacao.IdCliente);
            
            throw;
        }
    }
}
```

---

## Formato de Logs

### Estrutura JSON Padrao
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "Information",
  "message": "Pedido criado com sucesso",
  "service": "pedidos-api",
  "traceId": "abc123def456",
  "spanId": "789ghi012",
  "context": {
    "pedidoId": 12345,
    "clienteId": 67890,
    "totalItens": 3
  },
  "error": null
}
```

### Templates Estruturados (OBRIGATORIO)
```csharp
// ✅ CORRETO — Structured logging com templates
_logger.LogInformation(
    "Pedido {PedidoId} criado para cliente {ClienteId} com valor {Valor:C}",
    pedido.Id, pedido.ClienteId, pedido.Valor);

// ❌ PROIBIDO — Interpolacao de strings
_logger.LogInformation($"Pedido {pedido.Id} criado para cliente {pedido.ClienteId}");

// ❌ PROIBIDO — Concatenacao
_logger.LogInformation("Pedido " + pedido.Id + " criado");
```

### Log Scopes para Correlacao
```csharp
public async Task ProcessarPedidoAsync(int pedidoId, CancellationToken cancellationToken)
{
    using (_logger.BeginScope(new Dictionary<string, object>
    {
        ["PedidoId"] = pedidoId,
        ["Operacao"] = "ProcessamentoPedido",
        ["CorrelationId"] = Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString()
    }))
    {
        _logger.LogInformation("Inicio do processamento");
        
        await ValidarEstoqueAsync(pedidoId, cancellationToken);
        await ProcessarPagamentoAsync(pedidoId, cancellationToken);
        await EnviarConfirmacaoAsync(pedidoId, cancellationToken);
        
        _logger.LogInformation("Processamento concluido");
    }
}
```

---

## Boas Praticas de Logging

### Niveis de Log — Quando Usar
| Nivel | Quando Usar | Exemplo |
|-------|-------------|---------|
| `Trace` | Detalhes internos (debug profundo) | Valores de variaveis internas |
| `Debug` | Fluxo de desenvolvimento | Entrada/saida de metodos |
| `Information` | Eventos de negocio relevantes | Pedido criado, usuario logou |
| `Warning` | Situacao inesperada nao-fatal | Retry acionado, cache miss |
| `Error` | Erro tratavel | Falha de validacao, timeout de API |
| `Critical` | Falha irrecuperavel | Banco indisponivel, corrupcao de dados |

### Regras de Ouro
```csharp
// 1. SEMPRE usar templates estruturados
_logger.LogInformation("Processado {Quantidade} itens em {Duracao}ms", qtd, ms);

// 2. NUNCA logar dados sensiveis (ver secao Sanitizacao)

// 3. SEMPRE incluir contexto suficiente para diagnostico
_logger.LogError(ex, "Falha ao processar pedido {PedidoId} do cliente {ClienteId}", pedidoId, clienteId);

// 4. SEMPRE usar CancellationToken em operacoes async
public async Task ProcessarAsync(int id, CancellationToken cancellationToken)
{
    cancellationToken.ThrowIfCancellationRequested();
    // ...
}

// 5. Nao logar em loops — agregar
_logger.LogInformation("Processados {Total} registros com {Erros} erros", total, erros);
```

---

## Sanitizacao de Dados Sensiveis

### Dados Proibidos em Logs
| Dado | Tratamento | Exemplo |
|------|-----------|---------|
| CPF | Mascarar | `***.***.***-34` |
| CNPJ | Mascarar | `**.***.***/**34-**` |
| Email | Mascarar | `t***@e***.com` |
| Telefone | Mascarar | `(**) ****-5678` |
| Senha | NUNCA logar | — |
| Token/API Key | NUNCA logar | — |
| Numero cartao | NUNCA logar | — |
| Dados medicos | NUNCA logar | — |

### Implementacao de Sanitizador
```csharp
public static class LogSanitizer
{
    public static string MaskCpf(string cpf)
    {
        if (string.IsNullOrEmpty(cpf) || cpf.Length < 11)
            return "***";
        return $"***.***.***-{cpf[^2..]}";
    }

    public static string MaskEmail(string email)
    {
        if (string.IsNullOrEmpty(email))
            return "***";
        var parts = email.Split('@');
        if (parts.Length != 2) return "***";
        return $"{parts[0][0]}***@{parts[1][0]}***.{parts[1].Split('.').Last()}";
    }

    public static string MaskPhone(string phone)
    {
        if (string.IsNullOrEmpty(phone) || phone.Length < 8)
            return "***";
        return $"(***) ****-{phone[^4..]}";
    }
}

// Uso
_logger.LogInformation(
    "Cadastro do cliente CPF {Cpf} email {Email}",
    LogSanitizer.MaskCpf(cliente.Cpf),
    LogSanitizer.MaskEmail(cliente.Email));
```

---

## Niveis de Log por Ambiente

### Configuracao Recomendada
| Namespace | Development | Staging | Production |
|-----------|-------------|---------|------------|
| Default | `Debug` | `Information` | `Information` |
| Microsoft.AspNetCore | `Information` | `Warning` | `Warning` |
| Microsoft.EFCore | `Information` | `Warning` | `Warning` |
| System.Net.Http | `Information` | `Warning` | `Error` |
| HealthChecks | `Debug` | `Information` | `Warning` |

### appsettings.Production.json
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning",
      "System.Net.Http.HttpClient": "Error",
      "Microsoft.Extensions.Diagnostics.HealthChecks": "Warning"
    }
  }
}
```

---

## Checklist de Producao

### Logging e Tracing
- [ ] OpenTelemetry configurado (tracing + metrics + logging)
- [ ] OTLP exporter apontando para o collector
- [ ] Structured logging com templates (sem interpolacao)
- [ ] Log scopes com CorrelationId / TraceId
- [ ] Dados sensiveis sanitizados (CPF, email, tokens)
- [ ] Niveis de log ajustados por ambiente
- [ ] Excecoes logadas com stack trace completo
- [ ] Health check endpoints excluidos do tracing

### Observabilidade
- [ ] Health checks configurados (liveness + readiness)
- [ ] Health check de banco de dados ativo
- [ ] Kubernetes probes apontando para /health/*
- [ ] Metricas customizadas de negocio expostas
- [ ] ActivitySource configurado para tracing manual
- [ ] Dashboards/alertas criados no observability stack

### Resiliencia
- [ ] Retry policies configuradas (Polly)
- [ ] Circuit breaker para dependencias externas
- [ ] Timeouts definidos em chamadas HTTP
- [ ] CancellationToken propagado em toda cadeia async
- [ ] Graceful shutdown configurado

### Performance
- [ ] AsNoTracking em queries de leitura
- [ ] Paginacao implementada em endpoints de lista
- [ ] Cache configurado (Memory e/ou Redis)
- [ ] Connection pooling de banco ativo
- [ ] Indices de banco revisados

### Seguranca
- [ ] Autenticacao/autorizacao configurada
- [ ] CORS policy definida
- [ ] HTTPS obrigatorio
- [ ] Secrets em vault (nao em appsettings)
- [ ] Rate limiting configurado
- [ ] Validacao de input (FluentValidation)

### Deploy
- [ ] Dockerfile otimizado (multi-stage build)
- [ ] Container health check configurado
- [ ] Variaveis de ambiente documentadas
- [ ] Migrations automatizadas no pipeline
- [ ] Rollback strategy definida
- [ ] Smoke tests pos-deploy