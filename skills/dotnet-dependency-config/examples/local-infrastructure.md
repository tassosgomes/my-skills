# Infraestrutura Local — Baseline de Containers

Um `docker-compose.yml` de referência por repositório, com versões fixas. O objetivo é que todo
serviço novo reutilize as mesmas tags de imagem — sem isso, cada tarefa gerada escolhe uma versão
diferente e a máquina do desenvolvedor acumula dezenas de containers/imagens redundantes para a
mesma ferramenta.

## Versões padrão (revisar a cada 6-12 meses, não a cada projeto)

| Ferramenta | Imagem | Uso |
|---|---|---|
| PostgreSQL | `postgres:18` | banco relacional padrão (ver `dotnet-dependency-config/SKILL.md`) |
| MongoDB | `mongo:8` | documento, só quando o requisito pedir NoSQL orientado a documento |
| Cache | `valkey/valkey:8.1-alpine` | cache distribuído — fork BSD-3 do Redis, mesmo protocolo (ver nota de licença abaixo) |
| RabbitMQ | `rabbitmq:4.3-management-alpine` | mensageria (ver `examples/messaging-rabbitmq.md`) |

Use a tag de major fixa (`postgres:18`, não `postgres:latest`) para receber patches de segurança
automaticamente sem trocar de major sem querer. Não fixe o patch exato (`postgres:18.4`) a menos
que o time tenha um motivo explícito de reprodutibilidade — isso é o que gera divergência de
versão entre máquinas ao longo do tempo.

### Nota sobre Valkey vs. Redis

A Redis Inc. mudou a licença do Redis em 2024 (RSALv2/SSPLv1, com AGPLv3 adicionada na versão 8).
Valkey é o fork mantido pela Linux Foundation sob BSD-3-Clause, com o mesmo protocolo e os mesmos
comandos — troca de imagem sem troca de client (`StackExchange.Redis` funciona normalmente contra
Valkey). Esse é o padrão deste catálogo para não depender da licença do Redis Inc. em
infraestrutura local nem em produção.

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
    ports:
      - "5432:5432"
    volumes:
      - projectname-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U projectname"]
      interval: 5s
      timeout: 5s
      retries: 10

  valkey:
    image: valkey/valkey:8.1-alpine
    container_name: projectname-valkey
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 10

  rabbitmq:
    image: rabbitmq:4.3-management-alpine
    container_name: projectname-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: projectname
      RABBITMQ_DEFAULT_PASS: projectname
    ports:
      - "5672:5672"   # protocolo AMQP
      - "15672:15672" # UI de management
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 10

  # mongo:
  #   image: mongo:8
  #   container_name: projectname-mongo
  #   environment:
  #     MONGO_INITDB_ROOT_USERNAME: projectname
  #     MONGO_INITDB_ROOT_PASSWORD: projectname
  #   ports:
  #     - "27017:27017"
  #   volumes:
  #     - projectname-mongo-data:/data/db

volumes:
  projectname-postgres-data:
  # projectname-mongo-data:
```

## Convenção de nomes

- `name:` no topo do compose e prefixo `container_name` usam o nome do projeto — evita colisão
  quando dois repositórios sobem containers na mesma máquina (`orders-postgres` vs.
  `billing-postgres`, não `postgres` duas vezes).
- Portas publicadas seguem a porta default da ferramenta; se dois projetos precisam rodar em
  paralelo na mesma máquina, mude a porta publicada (`"5433:5432"`) em vez da imagem ou versão.
- Comente/remova serviços não usados pelo projeto (ex.: Mongo acima) em vez de manter containers
  parados — o compose de referência lista o baseline disponível, não uma obrigação de subir tudo.

## Relação com testes de integração

Testes de integração usam Testcontainers, que sobe/derruba containers efêmeros por execução
(`dotnet-testing/examples/integration-tests.md` e `dev-containers.md`) — não o `docker-compose.yml`
deste arquivo, que é para desenvolvimento local interativo. As duas pontas devem usar a mesma tag
de imagem (`postgres:18`, `rabbitmq:4.3-management-alpine`) para que um bug que só aparece em uma
versão específica do banco não passe despercebido em um ambiente e quebre no outro.

## Checklist

- [ ] O projeto tem um único `docker-compose.yml` versionado como fonte da infraestrutura local.
- [ ] As tags de imagem batem com a tabela de versões padrão deste arquivo.
- [ ] Testcontainers (testes de integração) usa a mesma major de imagem do compose local.
- [ ] Nenhuma credencial do compose de desenvolvimento é reaproveitada em produção.
- [ ] Serviços não usados pelo projeto estão comentados/removidos, não rodando ociosos.
