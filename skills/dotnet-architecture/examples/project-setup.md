# Estrutura da Solution — API simples

Layout `src/` + `tests/`, um projeto por camada e um projeto de infraestrutura por tecnologia.
Os testes espelham a árvore de `src/`.

## Árvore

```text
ProjectName.sln
docker-compose.yml                      # infraestrutura local (dotnet-dependency-config)
.config/dotnet-tools.json               # dotnet-ef fixado
src/
├── ProjectName.Domain/
│   ├── SeedWork/                       # Entity, AggregateRoot, ValueObject, DomainEvent, IUnitOfWork, repositórios genéricos
│   ├── Entities/                       # Category.cs, Genre.cs
│   ├── ValueObjects/
│   ├── Events/                         # CategoryCreatedEvent.cs
│   ├── Enums/
│   ├── Exceptions/                     # EntityValidationException.cs
│   ├── Repositories/                   # ICategoryRepository.cs
│   └── Validation/                     # DomainValidation, ValidationHandler, validators por notificação
├── ProjectName.Application/
│   ├── Common/                         # PaginatedListInput, PaginatedListOutput, IUseCase
│   ├── Exceptions/                     # NotFoundException, RelatedAggregateException
│   ├── Interfaces/                     # portas técnicas: IStorageService, IEmailSender
│   └── UseCases/
│       └── Categories/
│           ├── Common/                 # CategoryModelOutput.cs
│           ├── CreateCategory/         # ICreateCategory, CreateCategory, CreateCategoryInput, CreateCategoryInputValidator
│           └── ListCategories/         # IListCategories, ListCategories, ListCategoriesInput, ListCategoriesOutput
├── ProjectName.Infra.Data/
│   ├── ProjectNameDbContext.cs
│   ├── UnitOfWork.cs
│   ├── Configurations/                 # IEntityTypeConfiguration<T>
│   ├── Repositories/
│   ├── Outbox/                         # OutboxMessage + configuração
│   ├── Inbox/                          # ProcessedMessage + configuração
│   └── Migrations/
├── ProjectName.Infra.Messaging/
│   ├── Configuration/                  # RabbitMqOptions, EventRoutes
│   ├── Connection/                     # RabbitMqConnectionProvider
│   ├── Topology/                       # RabbitMqTopologyInitializer
│   ├── Publishing/                     # RabbitMqPublisher, OutboxPublisherWorker
│   └── Consuming/                      # RabbitMqConsumerWorker<T>, IMessageHandler<T>
└── ProjectName.Api/
    ├── Program.cs
    ├── Extensions/                     # um arquivo por concern (dotnet-program-setup)
    ├── Controllers/
    ├── ApiModels/
    │   ├── Responses/                  # ApiResponse<T>, ApiResponseList<T>, PaginationMeta
    │   └── Categories/                 # UpdateCategoryApiInput.cs
    ├── Authorization/                  # Policies.cs, Roles.cs
    ├── ExceptionHandlers/              # GlobalExceptionHandler.cs
    └── MessageHandlers/                # IMessageHandler<T> que chamam casos de uso
tests/
├── ProjectName.Tests.Common/           # BaseFixture e geradores de dados compartilhados
├── ProjectName.UnitTests/
│   ├── Domain/Entities/Categories/
│   └── Application/UseCases/Categories/CreateCategory/
├── ProjectName.IntegrationTests/
│   ├── Application/UseCases/Categories/CreateCategory/
│   └── Infra.Data/Repositories/CategoryRepository/
└── ProjectName.EndToEndTests/
    ├── Base/                           # ProjectNameWebApplicationFactory, ApiClient
    └── Api/Categories/CreateCategory/
```

Regras de nomes das pastas:

- PascalCase, cada pasta é um segmento do namespace (`ProjectName.Application.UseCases.Categories.CreateCategory`).
- Pastas que agrupam tipos ficam no plural (`Entities`, `UseCases/Categories`). Isso evita que o
  namespace `...UseCases.Category` colida com a classe `Category` e obrigue alias como
  `using DomainEntity = ...`.

## Comandos

```bash
dotnet new sln -n ProjectName

dotnet new classlib -n ProjectName.Domain -o src/ProjectName.Domain
dotnet new classlib -n ProjectName.Application -o src/ProjectName.Application
dotnet new classlib -n ProjectName.Infra.Data -o src/ProjectName.Infra.Data
dotnet new classlib -n ProjectName.Infra.Messaging -o src/ProjectName.Infra.Messaging
dotnet new webapi --use-controllers -n ProjectName.Api -o src/ProjectName.Api

dotnet new classlib -n ProjectName.Tests.Common -o tests/ProjectName.Tests.Common
dotnet new xunit -n ProjectName.UnitTests -o tests/ProjectName.UnitTests
dotnet new xunit -n ProjectName.IntegrationTests -o tests/ProjectName.IntegrationTests
dotnet new xunit -n ProjectName.EndToEndTests -o tests/ProjectName.EndToEndTests

dotnet sln add src/*/*.csproj tests/*/*.csproj
```

## Referências

```bash
# Application → Domain
dotnet add src/ProjectName.Application reference src/ProjectName.Domain

# Infra.Data → Domain (+ Application only to implement a technical port from Application/Interfaces)
dotnet add src/ProjectName.Infra.Data reference src/ProjectName.Domain

# Infra.Messaging → Infra.Data (reads the outbox, writes the inbox)
dotnet add src/ProjectName.Infra.Messaging reference src/ProjectName.Infra.Data

# Api → Application + Infra.* (composition root)
dotnet add src/ProjectName.Api reference src/ProjectName.Application
dotnet add src/ProjectName.Api reference src/ProjectName.Infra.Data
dotnet add src/ProjectName.Api reference src/ProjectName.Infra.Messaging

# Tests
dotnet add tests/ProjectName.Tests.Common reference src/ProjectName.Domain
dotnet add tests/ProjectName.UnitTests reference src/ProjectName.Application tests/ProjectName.Tests.Common
dotnet add tests/ProjectName.IntegrationTests reference src/ProjectName.Application src/ProjectName.Infra.Data tests/ProjectName.Tests.Common
dotnet add tests/ProjectName.EndToEndTests reference src/ProjectName.Api tests/ProjectName.Tests.Common
```

A `Api` referencia `Infra.*` apenas para registrar implementações na DI; controllers nunca usam
tipos de `Infra.*` diretamente.
