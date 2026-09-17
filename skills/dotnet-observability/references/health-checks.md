# Health Checks — Registro e Checks Próprios

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
            .AddNpgSql(configuration.GetConnectionString("DefaultConnection")!, name: "postgresql",
                failureStatus: HealthStatus.Unhealthy, tags: [ReadyTag], timeout: TimeSpan.FromSeconds(5))
            .AddCheck<RabbitMqHealthCheck>("rabbitmq",
                failureStatus: HealthStatus.Unhealthy, tags: [ReadyTag], timeout: TimeSpan.FromSeconds(5))
            .AddRedis(configuration.GetConnectionString("Cache")!, name: "valkey",
                failureStatus: HealthStatus.Degraded, tags: [ReadyTag], timeout: TimeSpan.FromSeconds(3))
            .AddCheck<OutboxHealthCheck>("outbox",
                failureStatus: HealthStatus.Degraded, tags: [ReadyTag]);

        return services;
    }

    public static IEndpointRouteBuilder MapHealthCheckConfiguration(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = check => check.Tags.Contains(LiveTag) });
        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(ReadyTag) });
        return endpoints;
    }
}
```

```csharp
// Infra.Messaging/HealthChecks/RabbitMqHealthCheck.cs
public sealed class RabbitMqHealthCheck(RabbitMqConnectionProvider connectionProvider) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            var connection = await connectionProvider.GetConnectionAsync(cancellationToken);
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

```csharp
// Infra.Data/HealthChecks/OutboxHealthCheck.cs
public sealed class OutboxHealthCheck(ProjectNameDbContext dbContext, IOptions<OutboxOptions> options) : IHealthCheck
{
    private static readonly TimeSpan MaxPendingAge = TimeSpan.FromMinutes(5);

    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        var exhaustedCount = await dbContext.OutboxMessages
            .CountAsync(m => m.ProcessedOn == null && m.Attempts >= options.Value.MaxAttempts, cancellationToken);

        var oldestPending = await dbContext.OutboxMessages
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

        return oldestPendingAge > MaxPendingAge
            ? new HealthCheckResult(context.Registration.FailureStatus, "Outbox publishing is lagging", data: data)
            : HealthCheckResult.Healthy(data: data);
    }
}
```

```yaml
# deployment.yaml (excerpt)
startupProbe:   { httpGet: { path: /health/live,  port: 8080 }, periodSeconds: 5,  failureThreshold: 30 }
livenessProbe:  { httpGet: { path: /health/live,  port: 8080 }, periodSeconds: 20, timeoutSeconds: 3, failureThreshold: 3 }
readinessProbe: { httpGet: { path: /health/ready, port: 8080 }, periodSeconds: 10, timeoutSeconds: 5, failureThreshold: 3 }
```
