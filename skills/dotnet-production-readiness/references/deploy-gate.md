# Gate de Deploy — Registro de Telemetria e Checklist

## ObservabilityExtensions

```csharp
// Api/Extensions/ObservabilityExtensions.cs
public static class ObservabilityExtensions
{
    public static IServiceCollection AddObservabilityConfiguration(
        this IServiceCollection services, IConfiguration configuration, IHostEnvironment environment)
    {
        var serviceName = configuration["OpenTelemetry:ServiceName"]
            ?? throw new InvalidOperationException("OpenTelemetry:ServiceName is not configured.");

        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource
                .AddService(serviceName, serviceVersion: typeof(ObservabilityExtensions).Assembly.GetName().Version?.ToString())
                .AddAttributes(new Dictionary<string, object> { ["deployment.environment.name"] = environment.EnvironmentName }))
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
            .UseOtlpExporter();

        return services;
    }
}
```

Pacotes `OpenTelemetry.Extensions.Hosting`, `OpenTelemetry.Instrumentation.AspNetCore`,
`OpenTelemetry.Instrumentation.Http`, `OpenTelemetry.Instrumentation.EntityFrameworkCore`,
`OpenTelemetry.Instrumentation.Runtime` e `OpenTelemetry.Exporter.OpenTelemetryProtocol`, todos na
mesma versão.

## Checklist detalhado

### Telemetria e logs
- [ ] `service.name`, versão e ambiente no resource.
- [ ] Endpoint OTLP vindo do ambiente.
- [ ] Fontes e meters da aplicação e da mensageria registrados.
- [ ] `/health/*` fora do tracing.
- [ ] Níveis de log conforme a tabela de ambiente.

### Health e operação
- [ ] Probes startup/liveness/readiness apontando para os endpoints corretos.
- [ ] Alerta para outbox esgotado ou atrasado e para mensagens em DLQ.
- [ ] Dashboards de latência, erro e saturação.

### Resiliência
- [ ] HttpClient com `AddStandardResilienceHandler`, timeouts e retry só em método seguro.
- [ ] Consumidores com retry, DLQ e idempotência.
- [ ] `ShutdownTimeout` ajustado.

### Dados
- [ ] Migrations aplicadas por step de deploy e compatíveis com rollback.
- [ ] Listagens com limite de `_size`; índices revisados.
- [ ] Cache com TTL e invalidação, quando usado.

### Segurança
- [ ] Endpoints com policy (`RequireAuthorization(Policies.X)`); anônimos explícitos com `AllowAnonymous`.
- [ ] CORS restrito, HTTPS na borda, rate limiting nos endpoints expostos.
- [ ] OpenAPI e Scalar só em Development.
- [ ] Segredos no orquestrador ou cofre.
- [ ] Erros em ProblemDetails sem stack trace.

### Entrega
- [ ] .NET 10: `global.json`, `net10.0`, pacotes Microsoft na major 10.
- [ ] Nenhum pacote proibido (AutoMapper, MediatR, FluentAssertions, `Http.Polly`).
- [ ] Dockerfile multi-stage, usuário não root.
- [ ] Variáveis de ambiente documentadas.
- [ ] Smoke test pós-deploy e rollback definidos.
