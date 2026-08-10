---
name: dotnet-program-setup
description: "Use quando uma tarefa .NET adiciona, altera ou revisa configuração de bootstrap em Program.cs: CORS, autenticação/autorização, Swagger/OpenAPI, health checks, middlewares, registro de DI por concern. Não use para regra de negócio, endpoint ou arquitetura de camadas — isso é dotnet-architecture."
metadata:
  group: dotnet
---

# Organização do Program.cs — .NET / ASP.NET Core

Esta skill existe porque `Program.cs` cresce por acréscimo: cada feature nova adiciona mais um
bloco de `builder.Services.AddX()` ou `app.UseX()` até o arquivo virar ilegível e ninguém mais
enxergar a ordem real do pipeline. A regra é simples e não negociável: **`Program.cs` só orquestra
chamadas de extensão; nunca contém a configuração em si.**

## Regra central

Cada concern de bootstrap (CORS, autenticação, Swagger, health checks, persistência, mensageria,
observabilidade, rate limiting, versionamento de API) vira **um método de extensão em um arquivo
próprio**, agrupado em uma pasta `Extensions/` (ou `HostConfiguration/`) na raiz do projeto de
entrada (API/Host). `Program.cs` chama esses métodos em sequência e nada mais.

```text
ProjectName.API/
├── Program.cs                          # ~20-40 linhas: só chamadas de extensão, nunca configuração
├── Extensions/
│   ├── CorsExtensions.cs               # AddCorsConfiguration
│   ├── AuthenticationExtensions.cs     # AddAuthenticationConfiguration
│   ├── SwaggerExtensions.cs            # AddSwaggerConfiguration
│   ├── HealthCheckExtensions.cs        # AddHealthCheckConfiguration
│   ├── PersistenceExtensions.cs        # AddPersistenceConfiguration (DbContext, repositórios)
│   ├── MessagingExtensions.cs          # AddMessagingConfiguration (RabbitMQ)
│   ├── ObservabilityExtensions.cs      # AddObservabilityConfiguration (OpenTelemetry)
│   └── MiddlewarePipelineExtensions.cs # UseApplicationPipeline (ordem do app.UseX())
```

## Convenção de nomes

- Métodos que registram serviços no container: `AddXxxConfiguration(this IServiceCollection services, IConfiguration configuration)`, retornando `IServiceCollection` para permitir chaining.
- Métodos que configuram o pipeline de middlewares: `UseXxx(this IApplicationBuilder app)` ou `UseApplicationPipeline(this WebApplication app)` quando precisam compor vários em ordem.
- Um método por concern. Se um método passa de ~30 linhas ou mistura dois concerns (ex.: CORS +
  autenticação no mesmo método), separe.
- A ordem de chamada em `Program.cs` é a documentação viva do pipeline — mantenha `Add*` antes de
  `builder.Build()` e `Use*`/`Map*` depois, na ordem real de execução do middleware.

## Antes / Depois

Ver `examples/program-organization.md` para o exemplo completo lado a lado (Program.cs monolítico
de ~150 linhas vs. a versão organizada). O núcleo da transformação:

```csharp
// Program.cs — depois
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddCorsConfiguration(builder.Configuration)
    .AddAuthenticationConfiguration(builder.Configuration)
    .AddSwaggerConfiguration()
    .AddPersistenceConfiguration(builder.Configuration)
    .AddMessagingConfiguration(builder.Configuration)
    .AddObservabilityConfiguration(builder.Configuration, builder.Environment)
    .AddHealthCheckConfiguration(builder.Configuration);

var app = builder.Build();

app.UseApplicationPipeline(builder.Environment);

app.Run();
```

## Regras não negociáveis

1. Nenhuma configuração de CORS, autenticação, Swagger, DbContext, mensageria ou observabilidade
   fica inline em `Program.cs` — sempre em um método de extensão nomeado pelo concern.
2. Um arquivo de extensão cobre um concern só; não crie um `ServiceExtensions.cs` genérico que
   acumula tudo — isso apenas move o problema de arquivo, sem resolvê-lo.
3. Segredos e valores de ambiente não são lidos direto em `Program.cs`; a extensão do concern lê
   da `IConfiguration` recebida como parâmetro (ver `dotnet-dependency-config` para o padrão de
   configuração e segredos).
4. Middlewares custom (exception handler global, correlation id, etc.) recebem seu próprio método
   `UseXxx` e são citados explicitamente na ordem do pipeline — nunca adicionados via lambda anônima
   solta em `Program.cs`.
5. `Program.cs` não contém `if`/`switch` de ambiente espalhados; a extensão recebe
   `IWebHostEnvironment` e decide internamente (ex.: `AddSwaggerConfiguration` só mapeia UI se
   `environment.IsDevelopment()`).

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| Program.cs completo antes/depois, cada extensão implementada | `examples/program-organization.md` |

## Checklist do diff

- [ ] `Program.cs` não ultrapassa ~40 linhas e só encadeia chamadas de extensão.
- [ ] Cada concern novo (CORS, auth, Swagger, health checks, etc.) tem seu próprio arquivo em `Extensions/`.
- [ ] Nomes seguem `AddXxxConfiguration` / `UseXxx`.
- [ ] Nenhum segredo ou connection string é lido/hardcoded direto em `Program.cs`.
- [ ] A ordem de `Use*`/`Map*` no pipeline reflete a ordem real de execução.
- [ ] Nenhum arquivo de extensão mistura mais de um concern.
