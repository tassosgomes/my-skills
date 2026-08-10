# Program.cs — Antes / Depois

## Antes (o que aparece na prática depois de algumas sprints)

```csharp
// Program.cs — ~150 linhas, tudo inline, ordem difícil de auditar
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

builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "ProjectName API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
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
    app.UseSwagger();
    app.UseSwaggerUI();
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
    .AddCorsConfiguration(builder.Configuration)
    .AddAuthenticationConfiguration(builder.Configuration)
    .AddSwaggerConfiguration()
    .AddPersistenceConfiguration(builder.Configuration)
    .AddMessagingConfiguration(builder.Configuration)
    .AddObservabilityConfiguration(builder.Configuration)
    .AddHealthCheckConfiguration(builder.Configuration);

var app = builder.Build();

app.UseApplicationPipeline(app.Environment);

app.Run();
```

```csharp
// Extensions/CorsExtensions.cs
public static class CorsExtensions
{
    private const string DefaultPolicy = "Default";

    public static IServiceCollection AddCorsConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? throw new InvalidOperationException("Cors:AllowedOrigins não configurado.");

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
// Extensions/SwaggerExtensions.cs
public static class SwaggerExtensions
{
    public static IServiceCollection AddSwaggerConfiguration(this IServiceCollection services)
    {
        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo { Title = "ProjectName API", Version = "v1" });
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT"
            });
        });

        return services;
    }

    public static IApplicationBuilder UseSwaggerConfiguration(this IApplicationBuilder app, IWebHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
            return app;

        app.UseSwagger();
        app.UseSwaggerUI();
        return app;
    }
}
```

```csharp
// Extensions/PersistenceExtensions.cs
public static class PersistenceExtensions
{
    public static IServiceCollection AddPersistenceConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            options.UseNpgsql(connectionString, npgsql => npgsql.MigrationsHistoryTable("__ef_migrations_history"));
        });

        services.AddScoped<IOrderRepository, OrderRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

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
        services.AddSingleton<IConnectionFactory>(_ => new ConnectionFactory
        {
            Uri = new Uri(configuration["RabbitMQ:ConnectionString"]!)
        });
        services.AddHostedService<OrderCreatedConsumer>();

        return services;
    }
}
```

```csharp
// Extensions/ObservabilityExtensions.cs
public static class ObservabilityExtensions
{
    public static IServiceCollection AddObservabilityConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOpenTelemetry()
            .WithTracing(tracing => tracing
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation()
                .AddOtlpExporter(opts =>
                {
                    opts.Endpoint = new Uri(configuration["OpenTelemetry:OtlpEndpoint"] ?? "http://localhost:4317");
                }));

        return services;
    }
}
```

```csharp
// Extensions/HealthCheckExtensions.cs
public static class HealthCheckExtensions
{
    public static IServiceCollection AddHealthCheckConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHealthChecks()
            .AddNpgSql(configuration.GetConnectionString("DefaultConnection")!)
            .AddRabbitMQ();

        return services;
    }

    public static IEndpointRouteBuilder MapHealthCheckConfiguration(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health/live");
        endpoints.MapHealthChecks("/health/ready");
        return endpoints;
    }
}
```

```csharp
// Extensions/MiddlewarePipelineExtensions.cs
// Compõe a ordem real de execução — o único lugar que precisa ser lido para auditar o pipeline.
public static class MiddlewarePipelineExtensions
{
    public static WebApplication UseApplicationPipeline(this WebApplication app, IWebHostEnvironment environment)
    {
        app.UseSwaggerConfiguration(environment);
        app.UseHttpsRedirection();
        app.UseCorsConfiguration();
        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();
        app.MapHealthCheckConfiguration();

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
