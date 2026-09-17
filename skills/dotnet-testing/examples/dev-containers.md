# Dev Containers — Ambiente de Desenvolvimento e Testes

O Dev Container dá a todo desenvolvedor (e ao Codespaces) o mesmo SDK, as mesmas ferramentas e os
mesmos serviços de apoio. Os testes continuam os mesmos de `integration-tests.md` e
`e2e-tests.md`; o que muda é de onde vem o PostgreSQL:

| Ambiente | PostgreSQL dos testes |
|---|---|
| Máquina com Docker | Testcontainers sobe um container por execução |
| Dev Container | Serviço `postgres` do compose do Dev Container, indicado por variável de ambiente |
| CI | Testcontainers (padrão) |

As tags de imagem seguem `dotnet-dependency-config/examples/local-infrastructure.md`.

## Estrutura

```text
.devcontainer/
├── devcontainer.json
└── docker-compose.yml
tests/
└── ProjectName.IntegrationTests/
    └── Base/
        └── DatabaseFixture.cs          # usa o serviço do compose se a variável existir
```

O Dev Container fica na raiz do repositório, não dentro de um projeto de teste: ele é o ambiente
de trabalho da solution inteira.

## devcontainer.json

```json
{
  "name": "projectname",
  "dockerComposeFile": "docker-compose.yml",
  "service": "workspace",
  "workspaceFolder": "/workspaces/projectname",
  "features": {
    "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {}
  },
  "customizations": {
    "vscode": {
      "extensions": ["ms-dotnettools.csdevkit"]
    }
  },
  "postCreateCommand": "dotnet tool restore && dotnet restore"
}
```

`docker-outside-of-docker` permite rodar Testcontainers de dentro do Dev Container quando alguém
quiser o mesmo comportamento da CI.

## docker-compose.yml

```yaml
name: projectname-devcontainer

services:
  workspace:
    image: mcr.microsoft.com/devcontainers/dotnet:9.0
    volumes:
      - ..:/workspaces/projectname:cached
    command: sleep infinity
    environment:
      ConnectionStrings__DefaultConnection: Host=postgres;Port=5432;Database=projectname;Username=projectname;Password=projectname
      TEST_POSTGRES_CONNECTION: Host=postgres;Port=5432;Database=projectname_tests;Username=projectname;Password=projectname
      RabbitMQ__HostName: rabbitmq
      RabbitMQ__UserName: projectname
      RabbitMQ__Password: projectname
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy

  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: projectname
      POSTGRES_PASSWORD: projectname
      POSTGRES_DB: projectname
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U projectname"]
      interval: 5s
      timeout: 5s
      retries: 10
    tmpfs:
      - /var/lib/postgresql/data

  rabbitmq:
    image: rabbitmq:4.3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: projectname
      RABBITMQ_DEFAULT_PASS: projectname
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10
```

Credenciais aqui são só do ambiente descartável de desenvolvimento; nunca as reutilize em outro
ambiente.

## Fixture que funciona nos dois ambientes

A `DatabaseFixture` de `integration-tests.md` ganha um desvio: se `TEST_POSTGRES_CONNECTION`
existir, usa o serviço do compose; senão, sobe o Testcontainer. Nos dois casos o schema vem das
migrations e a limpeza é por `TRUNCATE`.

```csharp
// tests/ProjectName.IntegrationTests/Base/DatabaseFixture.cs
public sealed class DatabaseFixture : IAsyncLifetime
{
    private const string ExternalConnectionVariable = "TEST_POSTGRES_CONNECTION";

    private readonly PostgreSqlContainer? _container;

    public DatabaseFixture()
    {
        var externalConnection = Environment.GetEnvironmentVariable(ExternalConnectionVariable);

        if (string.IsNullOrWhiteSpace(externalConnection))
            _container = new PostgreSqlBuilder().WithImage("postgres:18").Build();
        else
            ConnectionString = externalConnection;
    }

    public string ConnectionString { get; private set; } = string.Empty;

    public async Task InitializeAsync()
    {
        if (_container is not null)
        {
            await _container.StartAsync();
            ConnectionString = _container.GetConnectionString();
        }

        await using var context = CreateDbContext();
        await context.Database.MigrateAsync(); // creates the test database if it does not exist
    }

    public async Task DisposeAsync()
    {
        if (_container is not null)
            await _container.DisposeAsync();
    }

    public ProjectNameDbContext CreateDbContext()
        => new(new DbContextOptionsBuilder<ProjectNameDbContext>().UseNpgsql(ConnectionString).Options);

    public async Task ResetDatabaseAsync()
    {
        await using var context = CreateDbContext();
        var tables = context.Model.GetEntityTypes()
            .Select(entityType => entityType.GetTableName())
            .Where(tableName => tableName is not null)
            .Distinct()
            .Select(tableName => $"\"{tableName}\"");

        await context.Database.ExecuteSqlRawAsync($"TRUNCATE TABLE {string.Join(", ", tables)} CASCADE");
    }
}
```

Os testes não mudam: continuam na `DatabaseCollection`, chamam `ResetDatabaseAsync` no
`InitializeAsync` e seguem `DisplayName` + `Trait` (`integration-tests.md`).

## Regras

- Banco de testes separado do banco de desenvolvimento (`projectname_tests`): `TRUNCATE` nunca
  pode apagar dados com que o desenvolvedor está trabalhando.
- Schema sempre por migrations; nada de scripts SQL em `docker-entrypoint-initdb.d` que divergem do
  modelo EF.
- Dados de teste criados pelo próprio teste (geradores de `Tests.Common`), nunca seed fixo
  compartilhado.
- Tags de imagem iguais às de `dotnet-dependency-config/examples/local-infrastructure.md`.
