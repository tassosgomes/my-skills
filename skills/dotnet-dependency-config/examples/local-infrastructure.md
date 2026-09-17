# Infraestrutura Local — Containers com Versão Fixa

Um `docker-compose.yml` versionado por repositório. Testcontainers usa as mesmas tags.

## Versões padrão (revisar a cada 6–12 meses, não a cada projeto)

| Ferramenta | Imagem | Uso |
|---|---|---|
| PostgreSQL | `postgres:18` | Banco relacional padrão |
| MongoDB | `mongo:8` | Só quando o requisito pedir documento |
| Valkey | `valkey/valkey:8.1-alpine` | Cache distribuído (fork BSD-3 do Redis; Redis 7.4+ mudou para RSAL/SSPL/AGPL) |
| RabbitMQ | `rabbitmq:4.3-management-alpine` | Mensageria |

Tag de major fixa (`postgres:18`), nunca `latest` nem patch exato sem motivo registrado.

## docker-compose.yml de referência

```yaml
name: projectname-local

services:
  postgres:
    image: postgres:18
    container_name: projectname-postgres
    environment:
      POSTGRES_USER: projectname
      POSTGRES_PASSWORD: projectname
      POSTGRES_DB: projectname
    ports: ["5432:5432"]
    volumes: [projectname-postgres-data:/var/lib/postgresql]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U projectname"]
      interval: 5s
      retries: 10

  valkey:
    image: valkey/valkey:8.1-alpine
    container_name: projectname-valkey
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 5s
      retries: 10

  rabbitmq:
    image: rabbitmq:4.3-management-alpine
    container_name: projectname-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: projectname
      RABBITMQ_DEFAULT_PASS: projectname
    ports: ["5672:5672", "15672:15672"]
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      retries: 10

volumes:
  projectname-postgres-data:
```

## Convenções

- `name:` do compose e prefixo de `container_name` com o nome do projeto.
- Portas padrão da ferramenta; para dois projetos em paralelo, mude só a porta publicada
  (`"5433:5432"`).
- Serviço não usado pelo projeto é removido do compose.
- Credenciais do compose são só locais.
