# Estrutura da Solution — API simples

## Árvore

```text
ProjectName.slnx
global.json                             # SDK .NET 10 fixado
Directory.Build.props                   # net10.0, nullable, warnings como erro, BannedSymbols
Directory.Packages.props                # Central Package Management
BannedSymbols.txt                       # APIs proibidas (Guid.NewGuid, DateTime.Now)
.editorconfig
.config/dotnet-tools.json               # dotnet-ef na mesma versão do EF Core
docker-compose.yml                      # dotnet-dependency-config/examples/local-infrastructure.md
src/
├── ProjectName.Domain/
│   ├── SeedWork/                       # Entity, AggregateRoot, ValueObject, DomainEvent, IUnitOfWork, contratos de repositório
│   ├── Entities/
│   ├── ValueObjects/
│   ├── Events/
│   ├── Enums/
│   ├── Exceptions/                     # EntityValidationException
│   ├── Repositories/                   # ICategoryRepository
│   └── Validation/
├── ProjectName.Application/
│   ├── Common/                         # IUseCase, PaginatedListInput, PaginatedListOutput
│   ├── Exceptions/                     # UseCaseException, NotFoundException, RelatedAggregateException
│   ├── Interfaces/                     # portas técnicas: IStorageService, IXxxQueries
│   └── UseCases/
│       └── Categories/
│           ├── Common/                 # CategoryModelOutput
│           └── CreateCategory/         # ICreateCategory, CreateCategory, CreateCategoryInput, CreateCategoryInputValidator
├── ProjectName.Infra.Data/
│   ├── ProjectNameDbContext.cs
│   ├── UnitOfWork.cs
│   ├── Configurations/
│   ├── Repositories/
│   ├── Queries/                        # implementações de IXxxQueries
│   ├── Outbox/
│   ├── Inbox/
│   └── Migrations/
├── ProjectName.Infra.Messaging/
│   ├── Configuration/
│   ├── Connection/
│   ├── Topology/
│   ├── Publishing/
│   └── Consuming/
└── ProjectName.Api/
    ├── Program.cs
    ├── Extensions/                     # um arquivo por concern (dotnet-program-setup)
    ├── Endpoints/
    │   ├── EndpointsExtensions.cs      # MapApiEndpoints
    │   └── Categories/                 # CategoryEndpoints, UpdateCategoryApiInput
    ├── ApiModels/Responses/            # ApiResponse<T>, ApiResponseList<T>, PaginationMeta
    ├── Authorization/                  # Policies, Roles
    ├── ExceptionHandlers/              # GlobalExceptionHandler
    └── MessageHandlers/                # IMessageHandler<T> que chamam casos de uso
tests/
├── ProjectName.Tests.Common/           # BaseFixture e geradores de dados
├── ProjectName.ArchitectureTests/      # regras ArchUnitNET
├── ProjectName.UnitTests/
├── ProjectName.IntegrationTests/
└── ProjectName.EndToEndTests/
```

- Pastas em PascalCase; cada pasta é um segmento do namespace.
- Pastas que agrupam tipos ficam no plural (`Entities`, `UseCases/Categories`) para o namespace não
  colidir com o nome da classe.
- Projetos de teste espelham a árvore de `src/`.

## Arquivos da raiz

`.csproj` não declara `TargetFramework` nem versão de pacote.

```json
// global.json
{ "sdk": { "version": "10.0.100", "rollForward": "latestFeature" } }
```

```xml
<!-- Directory.Build.props -->
<Project>
  <PropertyGroup>
    <TargetFramework>net10.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>
  <ItemGroup>
    <AdditionalFiles Include="$(MSBuildThisFileDirectory)BannedSymbols.txt" />
  </ItemGroup>
</Project>
```

```xml
<!-- Directory.Packages.props — versions are illustrative: use the latest stable patch -->
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <!-- Applied to every project: turns BannedSymbols.txt into build errors (RS0030) -->
    <GlobalPackageReference Include="Microsoft.CodeAnalysis.BannedApiAnalyzers" Version="3.3.4" />
  </ItemGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.AspNetCore.OpenApi" Version="10.0.0" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore.Design" Version="10.0.0" />
    <PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="10.0.0" />
    <PackageVersion Include="Microsoft.AspNetCore.Mvc.Testing" Version="10.0.0" />
  </ItemGroup>
</Project>
```

```text
# BannedSymbols.txt
M:System.Guid.NewGuid;Use Guid.CreateVersion7() (UUIDv7)
P:System.DateTime.Now;Use DateTime.UtcNow
```

## Referências entre projetos

| Projeto | Referencia |
|---|---|
| `Application` | `Domain` |
| `Infra.Data` | `Domain` (+ `Application` só para implementar `Application/Interfaces`) |
| `Infra.Messaging` | `Infra.Data` |
| `Api` | `Application`, `Infra.Data`, `Infra.Messaging` |
| `Tests.Common` | `Domain` |
| `UnitTests` | `Application`, `Tests.Common` |
| `IntegrationTests` | `Application`, `Infra.Data`, `Tests.Common` |
| `EndToEndTests` | `Api`, `Tests.Common` |
| `ArchitectureTests` | `Api` (carrega transitivamente todas as camadas) |

A `Api` usa tipos de `Infra.*` apenas em `Extensions/`; endpoints nunca.
