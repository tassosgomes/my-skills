# Dev Containers

O Dev Container dá a todos o mesmo SDK, ferramentas e serviços. Os testes não mudam; muda só a
origem do PostgreSQL.

| Ambiente | PostgreSQL dos testes |
|---|---|
| Máquina com Docker | Testcontainers |
| Dev Container | Serviço `postgres` do compose, via `TEST_POSTGRES_CONNECTION` |
| CI | Testcontainers |

## Estrutura

```text
.devcontainer/
├── devcontainer.json
└── docker-compose.yml
```

Fica na raiz do repositório, nunca dentro de um projeto de teste.

## devcontainer.json

```json
{
  "name": "projectname",
  "dockerComposeFile": "docker-compose.yml",
  "service": "workspace",
  "workspaceFolder": "/workspaces/projectname",
  "features": { "ghcr.io/devcontainers/features/docker-outside-of-docker:1": {} },
  "customizations": { "vscode": { "extensions": ["ms-dotnettools.csdevkit"] } },
  "postCreateCommand": "dotnet tool restore && dotnet restore"
}
```

## docker-compose.yml

```yaml
name: projectname-devcontainer

services:
  workspace:
    image: mcr.microsoft.com/devcontainers/dotnet:10.0
    volumes: ["..:/workspaces/projectname:cached"]
    command: sleep infinity
    environment:
      ConnectionStrings__DefaultConnection: Host=postgres;Port=5432;Database=projectname;Username=projectname;Password=projectname
      TEST_POSTGRES_CONNECTION: Host=postgres;Port=5432;Database=projectname_tests;Username=projectname;Password=projectname
      RabbitMQ__HostName: rabbitmq
      RabbitMQ__UserName: projectname
      RabbitMQ__Password: projectname
    depends_on:
      postgres: { condition: service_healthy }
      rabbitmq: { condition: service_healthy }

  postgres:
    image: postgres:18
    environment:
      POSTGRES_USER: projectname
      POSTGRES_PASSWORD: projectname
      POSTGRES_DB: projectname
    tmpfs: [/var/lib/postgresql]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U projectname"]
      interval: 5s
      retries: 10

  rabbitmq:
    image: rabbitmq:4.3-management-alpine
    environment:
      RABBITMQ_DEFAULT_USER: projectname
      RABBITMQ_DEFAULT_PASS: projectname
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      retries: 10
```

## Fixture nos dois ambientes

`DatabaseFixture` (`integration-tests.md`) lê `TEST_POSTGRES_CONNECTION`: se existir, usa a
connection string e não cria container; senão, sobe o Testcontainer. Nos dois casos aplica as
migrations e limpa por `TRUNCATE`.

## Regras

- Banco de testes separado do de desenvolvimento (`projectname_tests`).
- Schema só por migrations; nada de script em `docker-entrypoint-initdb.d`.
- Dados criados pelo próprio teste (geradores de `Tests.Common`), nunca seed compartilhado.
- Tags iguais às de `dotnet-dependency-config/examples/local-infrastructure.md`.
- Credenciais só do ambiente descartável.
