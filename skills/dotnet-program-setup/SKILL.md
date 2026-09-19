---
name: dotnet-program-setup
description: "Use quando uma tarefa .NET adiciona, altera ou revisa o bootstrap em Program.cs: CORS, autenticação/autorização, OpenAPI/Scalar, health checks, mapeamento de endpoints, middlewares, registro de DI por concern. Não use para regra de negócio, endpoint ou arquitetura de camadas — isso é dotnet-architecture."
metadata:
  group: dotnet
---

# Organização do Program.cs

**`Program.cs` só encadeia métodos de extensão; nunca contém configuração.**

## Estrutura

```text
ProjectName.Api/
├── Program.cs                          # ~15-30 linhas
└── Extensions/
    ├── ErrorHandlingExtensions.cs      # AddErrorHandlingConfiguration
    ├── UseCasesExtensions.cs           # AddUseCasesConfiguration
    ├── CorsExtensions.cs               # AddCorsConfiguration / UseCorsConfiguration
    ├── AuthenticationExtensions.cs     # AddAuthenticationConfiguration (policies com Policies/Roles)
    ├── OpenApiExtensions.cs            # AddOpenApiConfiguration / MapOpenApiConfiguration
    ├── HealthCheckExtensions.cs        # AddHealthCheckConfiguration / MapHealthCheckConfiguration
    ├── PersistenceExtensions.cs        # AddPersistenceConfiguration
    ├── MessagingExtensions.cs          # AddMessagingConfiguration
    ├── ObservabilityExtensions.cs      # AddObservabilityConfiguration
    └── MiddlewarePipelineExtensions.cs # UseApplicationPipeline
```

Os endpoints ficam em `Endpoints/` (`dotnet-architecture/examples/api-layer.md`) e entram no
pipeline por `MapApiEndpoints()`.

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services
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

app.UseApplicationPipeline();

app.Run();

public partial class Program;   // exposed to WebApplicationFactory
```

## Regras

1. Um arquivo e um método por concern; sem `ServiceExtensions.cs` genérico.
2. Registro: `AddXxxConfiguration(this IServiceCollection services, ...)` retornando
   `IServiceCollection`. Pipeline: `UseXxx`/`MapXxx`.
3. Método acima de ~30 linhas ou misturando concerns é dividido.
4. A extensão lê a `IConfiguration` recebida; `Program.cs` não lê configuração nem segredo.
5. `Program.cs` não tem `if` de ambiente; a extensão recebe `IHostEnvironment` e decide.
6. A ordem do pipeline vive só em `UseApplicationPipeline`.
7. Middleware custom tem seu `UseXxx` e aparece explicitamente nessa ordem.
8. `AddControllers`/`MapControllers` não são usados.

## Pipeline

```csharp
// Extensions/MiddlewarePipelineExtensions.cs
public static WebApplication UseApplicationPipeline(this WebApplication app)
{
    app.UseExceptionHandler();
    app.UseHttpsRedirection();
    app.UseCorsConfiguration();
    app.UseAuthentication();
    app.UseAuthorization();

    app.MapApiEndpoints();
    app.MapHealthCheckConfiguration();
    app.MapOpenApiConfiguration(app.Environment);

    return app;
}
```

## Documentação da API

- OpenAPI nativo (`Microsoft.AspNetCore.OpenApi`, OpenAPI 3.1) com Scalar (`Scalar.AspNetCore`).
- Documento e Scalar mapeados só em Development: `/openapi/v1.json`, `/openapi/v1.yaml`, `/scalar`.
- Esquema JWT declarado por `IOpenApiDocumentTransformer` (`BearerSecuritySchemeTransformer`).
- Swashbuckle e NSwag não são usados.
- Para versionar o contrato gerado, `Microsoft.Extensions.ApiDescription.Server` grava o documento
  no build; Spectral valida na CI com o ruleset único em
  `tsg-flow-contract-creator/rulesets/openapi.yaml`.

## Referência

`examples/program-organization.md`: implementação de cada extensão.

## Checklist do diff

- [ ] `Program.cs` só encadeia extensões.
- [ ] Concern novo tem arquivo próprio em `Extensions/` com nome `AddXxxConfiguration`/`UseXxx`/`MapXxx`.
- [ ] Nenhuma configuração ou segredo lido em `Program.cs`.
- [ ] Ordem do pipeline só em `UseApplicationPipeline`.
- [ ] Policies registradas com `Policies.*`/`Roles.*`, sem strings soltas.
