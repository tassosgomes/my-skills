---
name: dotnet-dependency-config
description: "Dependencias e configuracoes padrao para projetos .NET C# / ASP.NET Core: pacotes NuGet base, Entity Framework Core com PostgreSQL (padrao oficial) e Oracle (alternativa suportada), Mapster para mapeamento, FluentValidation, CQRS nativo, Polly para resiliencia, RabbitMQ com Rmq.CloudEvents, configuration patterns (appsettings, options, DI), Unit of Work, migrations, interceptors, criacao de bibliotecas profissionais NuGet. Usar quando: criar projeto .NET; adicionar infra (DB, cache, messaging); configurar EF Core; alterar baseline de libs; criar ou publicar class library NuGet."
---

# Dependencias e Configuracoes .NET C# e ASP.NET Core

Documento normativo para padronizacao de dependencias, configuracoes e infraestrutura.
Acionada quando: criar projeto, adicionar nova integracao, alterar infraestrutura.

> **Politica de Banco de Dados**
> - **PostgreSQL e o padrao oficial** para novos servicos
> - **Oracle e alternativa suportada** apenas para: legado, integracoes existentes, ou aprovacao explicita
> - Exemplos nesta skill usam PostgreSQL como caminho principal e Oracle como alternativa

---

## Indice

1. [Bibliotecas Recomendadas](#bibliotecas-recomendadas)
2. [Entity Framework Core](#entity-framework-core)
3. [Mapeamento](#mapeamento)
4. [Configuracao e DI Patterns](#configuracao-e-di-patterns)
5. [Mensageria — RabbitMQ com Rmq.CloudEvents](#mensageria--rabbitmq-com-rmqcloudevents)
6. [Criacao de Bibliotecas Profissionais](#criacao-de-bibliotecas-profissionais)
7. [Checklist de Configuracao](#checklist-de-configuracao)

> **Exemplos de codigo completos** ficam em `examples/` e devem ser abertos sob demanda conforme a tarefa:
> - `examples/entity-framework-core.md` — DbContext, Fluent API, DI (PostgreSQL/Oracle), Unit of Work, repositorios, migrations, connection strings, interceptors de auditoria
> - `examples/di-patterns.md` — uso de Unit of Work + Mapster em controller
> - `examples/messaging-rabbitmq.md` — Rmq.CloudEvents: configuracao, consumers, publishers, retry/DLQ
> - `examples/nuget-library.md` — criacao e publicacao de biblioteca profissional NuGet

---

# 1. Bibliotecas Recomendadas

> **Politica de Versionamento**: Sempre utilize a **ultima versao stable** disponivel de cada pacote.
> Nao fixe versoes nesta documentacao para evitar que fique desatualizada.
> Use `dotnet outdated` ou o NuGet Package Manager para verificar atualizacoes.

### Core Libraries
```xml
<PackageReference Include="Microsoft.Extensions.DependencyInjection" />
<PackageReference Include="Microsoft.Extensions.Logging" />
<PackageReference Include="Microsoft.Extensions.Configuration" />
<PackageReference Include="Microsoft.Extensions.Options" />
```

### Web Development (ASP.NET Core)
```xml
<PackageReference Include="Microsoft.AspNetCore.OpenApi" />
<PackageReference Include="Swashbuckle.AspNetCore" />
<PackageReference Include="FluentValidation.AspNetCore" />
<!-- AutoMapper removido por questoes de licenciamento -->
<!-- Use Mapster ou mapeamento manual conforme secao de mapeamento -->
```

### Database — PostgreSQL (Padrao Oficial)
```xml
<PackageReference Include="Microsoft.EntityFrameworkCore" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Design" />
<PackageReference Include="Microsoft.EntityFrameworkCore.Tools" />
<PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />
<PackageReference Include="Microsoft.Extensions.Configuration" />
```

### Database — Oracle (Alternativa Suportada)
```xml
<!-- Usar APENAS quando aprovado: legado, integracoes existentes -->
<PackageReference Include="Oracle.EntityFrameworkCore" />
```

### HTTP Client
```xml
<PackageReference Include="Microsoft.Extensions.Http" />
<PackageReference Include="RestSharp" />
<PackageReference Include="System.Net.Http.Json" />
```

### Serialization
```xml
<PackageReference Include="System.Text.Json" />
<PackageReference Include="Newtonsoft.Json" />
```

### Observabilidade (OpenTelemetry — Padrao Oficial)
```xml
<PackageReference Include="OpenTelemetry.Exporter.OpenTelemetryProtocol" />
<PackageReference Include="OpenTelemetry.Extensions.Hosting" />
<PackageReference Include="OpenTelemetry.Instrumentation.AspNetCore" />
<PackageReference Include="OpenTelemetry.Instrumentation.Http" />
<PackageReference Include="OpenTelemetry.Instrumentation.EntityFrameworkCore" />
```

### Mensageria — RabbitMQ
```xml
<PackageReference Include="Rmq.CloudEvents" />
```

### Resilience
```xml
<PackageReference Include="Polly" />
<PackageReference Include="Polly.Extensions.Http" />
```

### Utilities
```xml
<PackageReference Include="FluentValidation" />
<PackageReference Include="Mapster" />
```

---

# 2. Entity Framework Core

EF Core e o ORM padrao: LINQ, migrations, change tracking, eager/lazy loading e multi-provider (PostgreSQL padrao, Oracle por excecao). A configuracao segue:

- **DbContext** com `ApplyConfigurationsFromAssembly` + entidades configuradas via `IEntityTypeConfiguration<T>` (Fluent API)
- **Registro no DI** via `AddDbContext` ou `AddDbContextPool` (PostgreSQL com `UseNpgsql`, Oracle com `UseOracle`)
- **Unit of Work** expondo repositorios + `CommitAsync`/`RollbackAsync`
- **Repository Pattern** generico (`IBaseRepository<T>`) + repositorios especificos com queries complexas (`AsNoTracking` em leitura, `Include` para grafos)
- **Migrations** via `dotnet ef`; **interceptors** (`SaveChangesInterceptor`) para auditoria

→ DbContext, Fluent API, DI (PG/Oracle), Unit of Work, repositorios, comandos de migrations, connection strings e interceptors completos em `examples/entity-framework-core.md`.

---

# 3. Mapeamento

> **AutoMapper removido por questoes de licenciamento**

### Mapster (Recomendado)
```csharp
// Basic configuration
TypeAdapterConfig<User, UserDto>.NewConfig();

// DI registration
builder.Services.AddMapster();

// Usage
var dto = user.Adapt<UserDto>();
var list = users.Adapt<IEnumerable<UserDto>>();
```

### Alternativa: Extension Methods
```csharp
public static class UserExtensions
{
    public static UserDto ToDto(this User user) => new()
    {
        Id = user.Id,
        Name = user.Name,
        Email = user.Email
    };
}
```

---

# 4. Configuracao e DI Patterns

Padrao de injecao de `IUnitOfWork` + mapeamento (Mapster) em controllers, com logging estruturado e `CancellationToken` propagado.

→ Exemplo completo de controller em `examples/di-patterns.md`.

---

# 5. Mensageria — RabbitMQ com Rmq.CloudEvents

**Rmq.CloudEvents** e a biblioteca padrao para mensageria com RabbitMQ ([NuGet](https://www.nuget.org/packages/Rmq.CloudEvents) · [GitHub](https://github.com/tassosgomes/dotnet-rabbimq-lib)). Entrega:

- **Quorum queues** com DLQ (`<queue>.dlq`) e DLX automaticos
- **CloudEvents** JSON (`application/cloudevents+json`) com wrap/unwrap transparente
- **Retry exponencial** (Polly) em publish e consumer handler
- **DI-first**: `AddRmqCloudEvents`, `AddRmqConsumer<T, THandler>`, `IRmqPublisher`
- **Pipeline de consumer**: ACK em sucesso, NACK (`requeue: false`) → DLQ em falha final

Requisitos: .NET SDK 8.0+ e RabbitMQ 3.8+ (quorum queues).

→ Configuracao (codigo e appsettings), modelo `RmqOptions`, registro de consumer/publisher, comportamento em runtime e fluxo de retry/DLX em `examples/messaging-rabbitmq.md`.

---

# 6. Criacao de Bibliotecas Profissionais

Diretrizes para class libraries NuGet: SDK-style projects, multi-target (`netstandard2.0;net8.0`), `Nullable` + `TreatWarningsAsErrors`, design de API publica (scenario-driven, async com `CancellationToken`, tipos imutaveis, excecoes em vez de codigos de erro), empacotamento com metadata completa, SemVer 2.0.0 e estrategia de evolucao com `[Obsolete]`.

→ Templates de `.csproj`, comandos `dotnet pack`/`nuget push`, estrutura de solucao e regras de SemVer em `examples/nuget-library.md`.

---

## Checklist de Configuracao

### Bibliotecas Essenciais
- [ ] Microsoft.Extensions.* (DI, Logging, Configuration)
- [ ] Microsoft.EntityFrameworkCore + Npgsql.EntityFrameworkCore.PostgreSQL (padrao)
- [ ] OpenTelemetry para observabilidade (padrao oficial)
- [ ] FluentValidation para validacoes
- [ ] CQRS nativo (implementacao propria sem MediatR)
- [ ] Mapster ou mapeamento manual (alternativa ao AutoMapper)
- [ ] Rmq.CloudEvents para mensageria RabbitMQ

### Entity Framework Core
- [ ] DbContext configurado com DbContextOptions
- [ ] Entidades configuradas via Fluent API (IEntityTypeConfiguration)
- [ ] DbContext registrado no DI (AddDbContext ou AddDbContextPool)
- [ ] Unit of Work implementado
- [ ] Repositorios genericos e especificos implementados
- [ ] Migrations configuradas e aplicadas
- [ ] Interceptors de auditoria configurados (opcional)
- [ ] Connection string configurada (PostgreSQL ou Oracle)

### Mapeamento
- [ ] Mapster configurado (opcao recomendada)
- [ ] Extension methods implementados (opcao manual)
- [ ] Mapper patterns registrados no DI
- [ ] Configuracoes de mapeamento centralizadas

### Mensageria (RabbitMQ)
- [ ] Rmq.CloudEvents adicionado ao projeto
- [ ] AddRmqCloudEvents configurado no DI
- [ ] Connection options definidas (appsettings ou codigo)
- [ ] CloudEvents source e type configurados
- [ ] Consumers registrados com AddRmqConsumer<T, THandler>
- [ ] Handlers implementando IRmqMessageHandler<T>
- [ ] Publisher injetado via IRmqPublisher
- [ ] Retry e DLQ configurados conforme necessidade

### Criacao de Bibliotecas
- [ ] SDK-style project configurado
- [ ] Multi-target quando necessario
- [ ] Nullable e TreatWarningsAsErrors habilitados
- [ ] Metadata de pacote NuGet preenchida
- [ ] SemVer aplicado
- [ ] SourceLink e simbolos configurados
- [ ] README e CHANGELOG documentados
