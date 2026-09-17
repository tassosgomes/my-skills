# Program.cs — Implementação das Extensões

`ErrorHandlingExtensions` está em `dotnet-architecture/examples/error-handling.md`,
`UseCasesExtensions` em `dotnet-architecture/examples/use-cases.md`, `PersistenceExtensions` em
`dotnet-dependency-config/examples/entity-framework-core.md`, `MessagingExtensions` em
`dotnet-dependency-config/examples/messaging-rabbitmq.md`, `ObservabilityExtensions` em
`dotnet-production-readiness` e `HealthCheckExtensions` em `dotnet-observability`.

## CORS

```csharp
public static class CorsExtensions
{
    private const string DefaultPolicy = "Default";

    public static IServiceCollection AddCorsConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? throw new InvalidOperationException("Cors:AllowedOrigins is not configured.");

        services.AddCors(options => options.AddPolicy(DefaultPolicy, policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()));

        return services;
    }

    public static IApplicationBuilder UseCorsConfiguration(this IApplicationBuilder app) => app.UseCors(DefaultPolicy);
}
```

## Autenticação e autorização

```csharp
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

        services.AddAuthorizationBuilder()
            .AddPolicy(Policies.Admin, policy => policy.RequireRole(Roles.Admin))
            .AddPolicy(Policies.Classifiers, policy => policy.RequireRole(Roles.Admin, Roles.Categories));

        return services;
    }
}
```

## OpenAPI + Scalar

```csharp
public static class OpenApiExtensions
{
    public static IServiceCollection AddOpenApiConfiguration(this IServiceCollection services)
    {
        services.AddOpenApi("v1", options => options.AddDocumentTransformer<BearerSecuritySchemeTransformer>());
        return services;
    }

    public static IEndpointRouteBuilder MapOpenApiConfiguration(this IEndpointRouteBuilder endpoints, IHostEnvironment environment)
    {
        if (!environment.IsDevelopment())
            return endpoints;

        endpoints.MapOpenApi();                                  // /openapi/v1.json
        endpoints.MapOpenApi("/openapi/{documentName}.yaml");
        endpoints.MapScalarApiReference();                       // /scalar
        return endpoints;
    }
}
```

```csharp
// OpenApi/BearerSecuritySchemeTransformer.cs — Microsoft.OpenApi 2.x (OpenAPI 3.1)
internal sealed class BearerSecuritySchemeTransformer(IAuthenticationSchemeProvider schemeProvider) : IOpenApiDocumentTransformer
{
    public async Task TransformAsync(OpenApiDocument document, OpenApiDocumentTransformerContext context, CancellationToken cancellationToken)
    {
        var schemes = await schemeProvider.GetAllSchemesAsync();
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
