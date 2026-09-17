# Referência completa — Production Readiness .NET

> Leia sob demanda durante um gate de release, auditoria ou revisão pré-produção.

Documento normativo e checklist consolidado. Bloqueia deploy que não atenda aos requisitos
mínimos. A implementação de cada item fica na skill de origem; aqui está o que precisa existir e
como verificar.

## Índice

1. [OpenTelemetry](#1-opentelemetry)
2. [Formato e boas práticas de log](#2-formato-e-boas-práticas-de-log)
3. [Sanitização de dados sensíveis](#3-sanitização-de-dados-sensíveis)
4. [Níveis de log por ambiente](#4-níveis-de-log-por-ambiente)
5. [Checklist de produção](#5-checklist-de-produção)

---

## 1. OpenTelemetry

OpenTelemetry com exportação OTLP é o padrão. Não use Serilog + ECS em serviços novos.

### Pacotes

```bash
dotnet add src/ProjectName.Api package OpenTelemetry.Extensions.Hosting
dotnet add src/ProjectName.Api package OpenTelemetry.Instrumentation.AspNetCore
dotnet add src/ProjectName.Api package OpenTelemetry.Instrumentation.Http
dotnet add src/ProjectName.Api package OpenTelemetry.Instrumentation.EntityFrameworkCore
dotnet add src/ProjectName.Api package OpenTelemetry.Exporter.OpenTelemetryProtocol
```

Use a versão estável mais recente e a mesma versão em todos os pacotes `OpenTelemetry.*`
(`UseOtlpExporter` e `WithLogging` exigem 1.9 ou superior).

### Registro

```csharp
// Api/Extensions/ObservabilityExtensions.cs
public static class ObservabilityExtensions
{
    public static IServiceCollection AddObservabilityConfiguration(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var serviceName = configuration["OpenTelemetry:ServiceName"]
            ?? throw new InvalidOperationException("OpenTelemetry:ServiceName is not configured.");

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(serviceName, serviceVersion: typeof(ObservabilityExtensions).Assembly.GetName().Version?.ToString())
                .AddAttributes(new Dictionary<string, object>
                {
                    ["deployment.environment.name"] = environment.EnvironmentName
                }))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation(options =>
                    options.Filter = context => !context.Request.Path.StartsWithSegments("/health"))
                .AddHttpClientInstrumentation()
                .AddEntityFrameworkCoreInstrumentation()
                .AddSource(ProjectNameTelemetry.SourceName)
                .AddSource(RabbitMqTelemetry.SourceName))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddRuntimeInstrumentation()
                .AddMeter(ProjectNameTelemetry.SourceName))
            .WithLogging(logging => { }, options =>
            {
                options.IncludeScopes = true;
                options.IncludeFormattedMessage = true;
            })
            .UseOtlpExporter(); // endpoint from OTEL_EXPORTER_OTLP_ENDPOINT

        return services;
    }
}
```

```json
// appsettings.json
{
  "OpenTelemetry": {
    "ServiceName": "catalog-api"
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

O endpoint do collector vem de variável de ambiente no deploy (`OTEL_EXPORTER_OTLP_ENDPOINT`), não
de arquivo versionado. `ActivitySource`, `Meter` e spans de negócio estão em
`dotnet-observability/references/full-guide.md`.

`RabbitMqTelemetry.SourceName` é a `ActivitySource` de `Infra.Messaging`: publisher e consumidor
criam spans `publish`/`process` e propagam o `traceparent` nos headers da mensagem, ligando o
request HTTP que gravou o outbox ao consumo no outro serviço.

---

## 2. Formato e boas práticas de log

### Registro exportado

O exportador OTLP envia cada log com os campos abaixo; o backend (Loki, Elastic, Datadog...) os
indexa sem parsing de texto.

```json
{
  "timestamp": "2026-01-15T10:30:00.000Z",
  "severityText": "Information",
  "body": "Category {CategoryId} created",
  "attributes": {
    "CategoryId": "0f8fad5b-d9cb-469f-a165-70867728950e",
    "messaging.message.id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  },
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "resource": {
    "service.name": "catalog-api",
    "deployment.environment.name": "production"
  }
}
```

### Templates estruturados (obrigatório)

```csharp
// Correct: structured template
_logger.LogInformation("Genre {GenreId} created with {CategoryCount} categories", genre.Id, genre.Categories.Count);

// Forbidden: string interpolation
_logger.LogInformation($"Genre {genre.Id} created with {genre.Categories.Count} categories");

// Forbidden: concatenation
_logger.LogInformation("Genre " + genre.Id + " created");
```

### Quando usar cada nível

| Nível | Quando usar | Exemplo |
|---|---|---|
| `Trace` | Detalhe interno para depuração profunda | Valores intermediários de cálculo |
| `Debug` | Fluxo de execução em desenvolvimento | "Handling message" no consumidor |
| `Information` | Evento de negócio ou rejeição esperada | Categoria criada; request rejeitado com 422 |
| `Warning` | Situação inesperada, não fatal | Retry acionado; outbox atrasado |
| `Error` | Falha que interrompeu a operação | Exceção não tratada (500); mensagem enviada para DLQ |
| `Critical` | Serviço não consegue operar | Configuração obrigatória ausente no boot |

### Regras

```csharp
// 1. Enough context to diagnose, without sensitive data
_logger.LogError(ex, "Failed to publish outbox message {MessageId} ({Type})", message.Id, message.Type);

// 2. Aggregate instead of logging inside loops
_logger.LogInformation("Published {PublishedCount} outbox messages, {FailedCount} failed", published, failed);

// 3. Exceptions go as the first argument so the stack trace is exported as a log attribute,
//    never in the HTTP response body
_logger.LogError(ex, "Unhandled exception for {Method} {Path}", request.Method, request.Path);
```

---

## 3. Sanitização de dados sensíveis

### Dados proibidos em logs, spans e métricas

| Dado | Tratamento | Exemplo |
|---|---|---|
| CPF | Mascarar | `***.***.***-34` |
| CNPJ | Mascarar | `**.***.***/****-34` |
| E-mail | Mascarar | `t***@e***.com` |
| Telefone | Mascarar | `(**) ****-5678` |
| Senha | Nunca registrar | — |
| Token, API key, connection string | Nunca registrar | — |
| Número de cartão | Nunca registrar | — |
| Dados de saúde | Nunca registrar | — |

### Sanitizador

```csharp
// Application/Common/LogSanitizer.cs
public static class LogSanitizer
{
    public static string MaskCpf(string? cpf)
        => string.IsNullOrEmpty(cpf) || cpf.Length < 11 ? "***" : $"***.***.***-{cpf[^2..]}";

    public static string MaskEmail(string? email)
    {
        var parts = email?.Split('@');
        if (parts is not { Length: 2 } || parts[0].Length == 0 || parts[1].Length == 0)
            return "***";

        return $"{parts[0][0]}***@{parts[1][0]}***.{parts[1].Split('.').Last()}";
    }

    public static string MaskPhone(string? phone)
        => string.IsNullOrEmpty(phone) || phone.Length < 8 ? "***" : $"(**) ****-{phone[^4..]}";
}
```

```csharp
_logger.LogInformation(
    "Customer registered with CPF {Cpf} and e-mail {Email}",
    LogSanitizer.MaskCpf(customer.Cpf),
    LogSanitizer.MaskEmail(customer.Email));
```

Prefira registrar o Id da entidade em vez do dado mascarado; mascarar é para quando o dado é
indispensável ao diagnóstico.

---

## 4. Níveis de log por ambiente

| Categoria | Development | Staging | Production |
|---|---|---|---|
| Default | `Debug` | `Information` | `Information` |
| `Microsoft.AspNetCore` | `Information` | `Warning` | `Warning` |
| `Microsoft.EntityFrameworkCore` | `Information` | `Warning` | `Warning` |
| `System.Net.Http.HttpClient` | `Information` | `Warning` | `Error` |
| `Microsoft.Extensions.Diagnostics.HealthChecks` | `Debug` | `Information` | `Warning` |

```json
// appsettings.Production.json
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

## 5. Checklist de produção

### Telemetria e logs
- [ ] OpenTelemetry configurado para tracing, métricas e logs, com `service.name`.
- [ ] Endpoint OTLP vem do ambiente de deploy.
- [ ] `ActivitySource` e `Meter` da aplicação e da mensageria registrados.
- [ ] Endpoints `/health/*` excluídos do tracing.
- [ ] Logs com templates estruturados e scopes; sem interpolação.
- [ ] Dados sensíveis ausentes de logs, spans, métricas e respostas de erro.
- [ ] Níveis de log ajustados por ambiente.

### Health e operação (`dotnet-observability`)
- [ ] `/health/live` sem dependências externas; `/health/ready` com as obrigatórias.
- [ ] Probes de startup, liveness e readiness configuradas no Kubernetes.
- [ ] Alerta para outbox atrasado ou com tentativas esgotadas.
- [ ] Alerta para mensagens em DLQ.
- [ ] Dashboards de latência, erro e saturação publicados.

### Resiliência
- [ ] Clientes HTTP com `AddStandardResilienceHandler`, timeouts explícitos e retry só em métodos idempotentes.
- [ ] Consumidores RabbitMQ com retry, DLQ e idempotência (inbox quando necessário).
- [ ] `CancellationToken` propagado em toda a cadeia assíncrona.
- [ ] Graceful shutdown: `HostOptions.ShutdownTimeout` maior que o tempo de um lote do outbox e de uma mensagem.

### Dados e performance
- [ ] Migrations aplicadas por step de deploy, nunca no boot (`dotnet-dependency-config`).
- [ ] Listagens paginadas com `_page`/`_size` e limite de `_size`.
- [ ] Índices revisados para as consultas novas.
- [ ] Cache com TTL e invalidação definidos, quando usado.

### Segurança
- [ ] Autenticação e policies de autorização aplicadas aos endpoints.
- [ ] CORS restrito às origens conhecidas.
- [ ] HTTPS obrigatório na borda.
- [ ] Segredos no orquestrador ou cofre (Kubernetes Secret, Vault); nenhum em `appsettings*.json` versionado.
- [ ] Rate limiting nos endpoints expostos.
- [ ] Documento OpenAPI e Scalar expostos só em Development.
- [ ] Input validado (FluentValidation e invariantes de domínio) e erros em `ProblemDetails` sem stack trace.

### Entrega
- [ ] Build, testes unitários, de integração e end-to-end passaram.
- [ ] .NET 10: `net10.0`, SDK do `global.json` e pacotes na major 10 (`Directory.Packages.props`).
- [ ] Dockerfile multi-stage com `mcr.microsoft.com/dotnet/sdk:10.0` no build e `mcr.microsoft.com/dotnet/aspnet:10.0` no runtime, usuário não root (`app`).
- [ ] Variáveis de ambiente documentadas.
- [ ] Estratégia de rollback definida, incluindo compatibilidade das migrations.
- [ ] Smoke test pós-deploy.
