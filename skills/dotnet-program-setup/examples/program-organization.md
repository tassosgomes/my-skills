# Program.cs — Antes / Depois

## Antes (o que aparece na prática depois de algumas sprints)

```csharp
// Program.cs — ~150 lines, everything inline, order hard to audit
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        policy.WithOrigins(builder.Configuration["Cors:AllowedOrigins"]!.Split(','))
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = builder.Configuration["Auth:Authority"];
        options.Audience = builder.Configuration["Auth:Audience"];
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
});

builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
});

builder.Services.AddDbContext<ProjectNameDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history"));
});
builder.Services.AddScoped<IOrderRepository, OrderRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();

builder.Services.AddSingleton<IConnectionFactory>(_ => new ConnectionFactory
{
    Uri = new Uri(builder.Configuration["RabbitMQ:ConnectionString"]!)
});
builder.Services.AddHostedService<OrderCreatedConsumer>();

builder.Services.AddOpenTelemetry()
    .WithTracing(tracing => tracing
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddOtlpExporter());

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection")!)
    .AddRabbitMQ();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseCors("Default");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.Run();
```

Nenhuma linha individual está "errada" — o problema é que tudo está no mesmo arquivo, sem
separação por concern, e a ordem de leitura não corresponde à ordem de execução do pipeline.

## Depois

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddControllersConfiguration()
    .AddErrorHandlingConfiguration()
    .AddUseCasesConfiguration()
    .AddCorsConfiguration(builder.Configuration)
    .AddAuthenticationConfiguration(builder.Configuration)
    .AddOpenApiConfiguration()
    .AddPersistenceConfiguration(builder.Configuration)
    .AddMessagingConfiguration(builder.Configuration)
    .AddObservabilityConfiguration(builder.Configuration, builder.Environment)
    .AddHealthCheckConfiguration(builder.Configuration);

var app = builder.Build();

app.UseApplicationPipeline(app.Environment);

app.Run();
```

```csharp
// Extensions/ControllersExtensions.cs
public static class ControllersExtensions
{
    // camelCase JSON is the System.Text.Json default: do not configure another naming policy.
    public static IServiceCollection AddControllersConfiguration(this IServiceCollection services)
    {
        services.AddControllers();
        return services;
    }
}
```

```csharp
// Extensions/UseCasesExtensions.cs — implementation in dotnet-architecture/examples/use-cases.md
// Extensions/ErrorHandlingExtensions.cs — implementation in dotnet-architecture/examples/error-handling.md
```

```csharp
// Extensions/CorsExtensions.cs
public static class CorsExtensions
{
    private const string DefaultPolicy = "Default";

    public static IServiceCollection AddCorsConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? throw new InvalidOperationException("Cors:AllowedOrigins is not configured.");

        services.AddCors(options =>
        {
            options.AddPolicy(DefaultPolicy, policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            });
        });

        return services;
    }

    public static IApplicationBuilder UseCorsConfiguration(this IApplicationBuilder app)
        => app.UseCors(DefaultPolicy);
}
```

```csharp
// Extensions/AuthenticationExtensions.cs
public static class AuthenticationExtensions
{
    public static IServiceCollection AddAuthenticationConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = configuration["Auth:Authority"];
                options.Audience = configuration["Auth:Audience"];
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30)
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy("AdminOnly", policy => policy.RequireRole("admin"));
        });

        return services;
    }
}
```

```csharp
// Extensions/OpenApiExtensions.cs
// Native OpenAPI (Microsoft.AspNetCore.OpenApi) + Scalar UI (Scalar.AspNetCore); no Swashbuckle.
public static class OpenApiExtensions
{
    public static IServiceCollection AddOpenApiConfiguration(this IServiceCollection services)
    {
        services.AddOpenApi("v1", options =>
        {
            options.AddDocumentTransformer<BearerSecuritySchemeTransformer>();
        });

        return services;
    }

    public static IEndpointRouteBuilder MapOpenApiConfiguration(this IEndpointRouteBuilder endpoints, IWebHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
            return endpoints;

        endpoints.MapOpenApi();                                  // /openapi/v1.json
        endpoints.MapOpenApi("/openapi/{documentName}.yaml");    // same document as YAML
        endpoints.MapScalarApiReference();                       // /scalar

        return endpoints;
    }
}
```

```csharp
// OpenApi/BearerSecuritySchemeTransformer.cs
// Declares the JWT scheme so the document and Scalar offer authentication.
internal sealed class BearerSecuritySchemeTransformer : IOpenApiDocumentTransformer
{
    private readonly IAuthenticationSchemeProvider _authenticationSchemeProvider;

    public BearerSecuritySchemeTransformer(IAuthenticationSchemeProvider authenticationSchemeProvider)
        => _authenticationSchemeProvider = authenticationSchemeProvider;

    public async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        var schemes = await _authenticationSchemeProvider.GetAllSchemesAsync();
        if (schemes.All(scheme => scheme.Name != JwtBearerDefaults.AuthenticationScheme))
            return;

        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes[JwtBearerDefaults.AuthenticationScheme] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            In = ParameterLocation.Header
        };
    }
}
```

O .NET 10 gera OpenAPI 3.1 com `Microsoft.OpenApi` 2.x; exemplos antigos baseados em
`Microsoft.OpenApi.Models` e Swashbuckle não se aplicam. Para versionar o contrato gerado (fluxo
code-first da `restful-api`), adicione `Microsoft.Extensions.ApiDescription.Server` ao projeto da
Api: o documento é gravado no build e pode ser validado com Spectral no CI.

```csharp
// Extensions/PersistenceExtensions.cs
public static class PersistenceExtensions
{
    public static IServiceCollection AddPersistenceConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<ProjectNameDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history"));
        });

        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IOrderRepository, OrderRepository>();

        return services;
    }
}
```

```csharp
// Extensions/MessagingExtensions.cs
public static class MessagingExtensions
{
    public static IServiceCollection AddMessagingConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<RabbitMqOptions>()
            .Bind(configuration.GetSection(RabbitMqOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton<RabbitMqConnectionProvider>();
        services.AddSingleton<RabbitMqPublisher>();

        // Order matters: topology before the outbox worker and the consumers.
        services.AddHostedService<RabbitMqTopologyInitializer>();
        services.AddHostedService<OutboxPublisherWorker>();

        // Consumers: see dotnet-dependency-config/examples/messaging-rabbitmq.md
        return services;
    }
}
```

```csharp
// Extensions/ObservabilityExtensions.cs — full implementation in dotnet-production-readiness/references/full-guide.md
public static class ObservabilityExtensions
{
    public static IServiceCollection AddObservabilityConfiguration(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(configuration["OpenTelemetry:ServiceName"]!))
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation())
            .UseOtlpExporter();

        return services;
    }
}
```

```csharp
// Extensions/HealthCheckExtensions.cs — full implementation (live/ready tags, custom checks) in
// dotnet-observability/references/full-guide.md
public static class HealthCheckExtensions
{
    public static IServiceCollection AddHealthCheckConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHealthChecks()
            .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live"])
            .AddNpgSql(configuration.GetConnectionString("DefaultConnection")!, name: "postgresql", tags: ["ready"]);

        return services;
    }

    public static IEndpointRouteBuilder MapHealthCheckConfiguration(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = check => check.Tags.Contains("live") });
        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains("ready") });
        return endpoints;
    }
}
```

```csharp
// Extensions/MiddlewarePipelineExtensions.cs
// Composes the real execution order — the only place to read when auditing the pipeline.
public static class MiddlewarePipelineExtensions
{
    public static WebApplication UseApplicationPipeline(this WebApplication app, IWebHostEnvironment environment)
    {
        app.UseExceptionHandler();
        app.UseHttpsRedirection();
        app.UseCorsConfiguration();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();
        app.MapHealthCheckConfiguration();
        app.MapOpenApiConfiguration(environment);

        return app;
    }
}
```

## Resultado

- `Program.cs` passa de ~150 para ~15 linhas e vira um índice legível do que o serviço faz no boot.
- Cada concern é revisável isoladamente: uma mudança em CORS só toca `CorsExtensions.cs`.
- A ordem do pipeline fica centralizada em `MiddlewarePipelineExtensions.UseApplicationPipeline`,
  em vez de espalhada implicitamente pela ordem de linhas em `Program.cs`.
- Testar a composição de DI fica mais simples: é possível chamar `AddPersistenceConfiguration`
  isoladamente em um teste de integração sem precisar montar o host inteiro.
