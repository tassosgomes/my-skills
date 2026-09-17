---
name: dotnet-dependency-config
description: "Use quando uma tarefa .NET adiciona ou altera pacotes, versão do SDK, EF Core, banco, migrations, cache, mensageria (RabbitMQ, outbox, inbox), configuração, segredos, registro na DI ou containers locais. Não use para criar apenas um endpoint ou revisar estilo."
metadata:
  group: dotnet
---

# Dependências e Configuração .NET

Baseline de infraestrutura. Leia só a referência do componente alterado.

## Baseline

| Tema | Decisão | Motivo |
|---|---|---|
| Plataforma | .NET 10 (LTS), `net10.0`, C# 14; SDK em `global.json`, TFM em `Directory.Build.props`, versões em `Directory.Packages.props` | Nenhum projeto diverge por esquecimento; .NET 8/9 perdem suporte em 10/11/2026 e migram direto para o 10 |
| Pacotes Microsoft | `Microsoft.*`, EF Core, provider e `dotnet-ef` na major 10 | Descompasso de major é a principal causa de migration quebrada |
| Banco | PostgreSQL; Oracle só para legado, integração existente ou aprovação explícita | — |
| ORM | EF Core com Fluent API (`IEntityTypeConfiguration<T>`) | — |
| Identificadores | Coluna `uuid` com `ValueGeneratedNever()`; o domínio gera UUIDv7 | Id definido antes do insert, índice ordenado |
| Mapeamento | Manual (`From{Entidade}`); AutoMapper proibido; Mapster só com justificativa de volume | Licença comercial do AutoMapper |
| Validação | FluentValidation | — |
| DI por convenção | Scrutor (`AsMatchingInterface`) | MIT |
| HTTP de saída | `IHttpClientFactory` + `Microsoft.Extensions.Http.Resilience` (`AddStandardResilienceHandler`); `Microsoft.Extensions.Http.Polly` não é usado | API atual baseada em Polly v8 |
| Mensageria | `RabbitMQ.Client` 7.x direto, sem wrapper (MassTransit, Wolverine...); outbox obrigatório no produtor, consumidor idempotente ou com inbox | Sem licença comercial, sem abstração extra |
| Cache distribuído | Valkey via `StackExchange.Redis` / `IDistributedCache` | Fork BSD-3 do Redis, mesmo protocolo |
| Observabilidade | OpenTelemetry + OTLP; sem Serilog em serviço novo | `dotnet-production-readiness` |
| Configuração | `IOptions<T>` com `ValidateOnStart`; `appsettings*.json` só com config não sensível; env vars (`__`) no deploy; `dotnet user-secrets` em desenvolvimento | Nenhuma credencial versionada, nem chave vazia |
| Containers locais | Tags fixas por ferramenta (`examples/local-infrastructure.md`) | Mesma versão em todas as máquinas e nos Testcontainers |

Atualização de pacote é mudança própria: não suba versões não relacionadas junto de uma feature.

## EF Core

- Nomes no banco em `snake_case` explícito (`ToTable("categories")`, `HasColumnName("created_at")`).
- `ApplyConfigurationsFromAssembly`; um `DbContext` por serviço (ou por módulo no monolito modular).
- Migrations history table `__ef_migrations_history`.
- `dotnet-ef` fixado em `.config/dotnet-tools.json`, mesma versão do `Microsoft.EntityFrameworkCore.Design`.
- `dotnet ef migrations has-pending-model-changes` roda na CI e bloqueia merge.
- Migration nunca é aplicada no boot em produção: step de deploy (`database update` ou script
  `--idempotent`). Em Development, aceitável.
- `IUnitOfWork.CommitAsync` grava dados e outbox no mesmo `SaveChangesAsync`.
- `EnableSensitiveDataLogging`/`EnableDetailedErrors` só em Development.
- `AddDbContextPool` só após medir custo de criação do contexto.
- Colunas técnicas de auditoria (`updated_at`) como shadow property preenchida por interceptor, só
  quando o requisito pedir.

## DI e lifetimes

| Tipo | Lifetime |
|---|---|
| `DbContext`, repositórios, `IUnitOfWork`, `IXxxQueries` | Scoped |
| Casos de uso e validators | Scoped |
| `IMessageHandler<T>` | Scoped (um escopo por mensagem) |
| `RabbitMqConnectionProvider`, `RabbitMqPublisher` | Singleton |

- Composition root só em `Api/Extensions/`, um arquivo por concern (`dotnet-program-setup`).
- `BackgroundService` cria escopo com `IServiceScopeFactory.CreateAsyncScope()`.
- Endpoints não recebem repositório, `IUnitOfWork` nem `DbContext`.

## RabbitMQ, outbox e inbox

- O `OutboxPublisherWorker` é o único publicador, com publisher confirms.
- Topologia declarada em `IHostedService` registrado antes dos consumidores: exchange `topic`, filas
  quorum, DLX/DLQ por fila e `x-delivery-limit`.
- Routing key é contrato versionado: `{servico}.{agregado}.{evento}.v{n}`.
- Consumidor com `autoAck: false`, ACK após sucesso, retry com backoff só para falha transitória,
  NACK sem requeue na falha final.
- Consumidor com efeito não idempotente usa inbox.

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| mapeamento EF, providers, auditoria, diagnóstico de migrations | `examples/entity-framework-core.md` |
| topologia, publicação, consumidor, retry e DLQ | `examples/messaging-rabbitmq.md` |
| outbox, worker, inbox e limpeza | `examples/outbox-inbox.md` |
| appsettings, env vars e user-secrets | `examples/configuration-secrets.md` |
| docker-compose local e tags fixas | `examples/local-infrastructure.md` |

## Checklist do diff

- [ ] Versão só em `Directory.Packages.props`; nenhum `.csproj` com `Version` ou `TargetFramework`.
- [ ] Pacotes Microsoft, EF Core e `dotnet-ef` na major 10.
- [ ] Nenhum pacote proibido (AutoMapper, MediatR, FluentAssertions, `Http.Polly`, wrapper de RabbitMQ).
- [ ] Nenhuma connection string ou segredo em `appsettings*.json` versionado.
- [ ] Nomes de tabela/coluna em `snake_case`, Id `uuid` com `ValueGeneratedNever`.
- [ ] Migration gerada e `has-pending-model-changes` limpo.
- [ ] Lifetimes conforme a tabela; eventos passam pelo outbox.
- [ ] Retry, timeout, DLQ e idempotência considerados nas integrações.
- [ ] Container local usa a tag de `examples/local-infrastructure.md`.
