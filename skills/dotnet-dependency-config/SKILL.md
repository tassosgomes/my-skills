---
name: dotnet-dependency-config
description: "Use quando uma tarefa .NET adiciona ou altera pacotes, EF Core, banco, cache, mensageria (RabbitMQ, outbox, inbox), configuração, DI, migrations ou uma biblioteca NuGet. Não use para criar apenas um endpoint ou revisar estilo."
metadata:
  group: dotnet
---

# Dependências e Configuração .NET

Esta skill define o baseline de infraestrutura. Leia somente a referência correspondente ao
componente alterado; os exemplos completos estão em `examples/`.

## Baseline oficial

- **Plataforma:** .NET 10 (LTS, suporte até novembro de 2028) com `net10.0` e C# 14. SDK fixado em
  `global.json`, target framework em `Directory.Build.props` e versões de pacote em
  `Directory.Packages.props` (`dotnet-architecture/examples/project-setup.md`). Pacotes
  `Microsoft.*`, EF Core, provider do banco e `dotnet-ef` na major 10. .NET 8 e .NET 9 perdem
  suporte em 10/11/2026: serviços nessas versões migram para o .NET 10, não para o 9.
- **Banco:** PostgreSQL para novos serviços; Oracle somente para legado, integração existente ou
  aprovação explícita.
- **ORM:** Entity Framework Core; configure entidades com Fluent API e registre o contexto via DI.
- **Mapeamento:** manual, com `static From{Entidade}` no Output do caso de uso. AutoMapper não é
  usado (licença comercial desde 2025); Mapster só com justificativa de volume.
- **Validação:** FluentValidation.
- **Resiliência HTTP:** `IHttpClientFactory` com Polly e timeouts explícitos.
- **Mensageria:** `RabbitMQ.Client` 7.x direto (API assíncrona), sem biblioteca wrapper; outbox
  obrigatório no produtor e consumidor idempotente (inbox quando necessário).
- **Observabilidade:** OpenTelemetry/OTLP quando a tarefa configurar telemetria.
- **Configuração:** opções tipadas (`IOptions<T>`), `appsettings.{Environment}.json` para config não
  sensível, variáveis de ambiente (`__`) para overrides e `dotnet user-secrets` para segredos em
  desenvolvimento local — nenhuma credencial hardcoded ou versionada.
- **Cache distribuído:** Valkey (fork BSD-3 do Redis, protocolo compatível) via
  `StackExchange.Redis`/`IDistributedCache`.
- **Containers locais:** versões fixas por ferramenta (PostgreSQL, MongoDB, Valkey, RabbitMQ) —
  ver `examples/local-infrastructure.md`; não introduza uma tag nova sem atualizar essa referência.

Use versões estáveis suportadas pelo projeto e confirme o baseline existente antes de atualizar
pacotes; não introduza upgrade amplo como efeito colateral de uma mudança localizada.

## Regras por componente

### Entity Framework Core

- Use `IEntityTypeConfiguration<T>` e `ApplyConfigurationsFromAssembly`.
- Registre `AddDbContext` ou `AddDbContextPool` com o provider correto.
- Mantenha migrations versionadas e executáveis pelo pipeline.
- Fixe a versão do `dotnet-ef` por projeto via `.config/dotnet-tools.json`, na mesma major do
  `Microsoft.EntityFrameworkCore.Design` referenciado — descompasso de versão é a causa mais comum
  de migration com sintaxe incompatível.
- Use Unit of Work explícito (`IUnitOfWork.CommitAsync`) que grava dados e outbox no mesmo
  `SaveChangesAsync`; leitura para alteração é rastreada, listagem usa `AsNoTracking`.
- Use interceptors de auditoria apenas quando o requisito exigir rastreabilidade.
- Não aplique migration automaticamente no boot do `Program.cs` em produção; separe em step de
  deploy (`examples/entity-framework-core.md#troubleshooting-de-migrations`).

### DI e mapeamento

- Registre dependências por interface e mantenha o composition root na Api (`Extensions/`).
- Casos de uso, repositórios, `IUnitOfWork` e `DbContext` são `Scoped`; conexão e publisher do
  RabbitMQ são `Singleton`.
- Casos de uso são registrados pela interface de mesmo nome (Scrutor `AsMatchingInterface` ou
  registro manual).
- Não exponha entidades de persistência nos contratos HTTP.

### RabbitMQ, outbox e inbox

- Caso de uso nunca publica no broker; o evento vai para o outbox na mesma transação e um
  `BackgroundService` publica com publisher confirms.
- Topologia declarada em `IHostedService` antes dos consumidores: exchange `topic`, filas quorum,
  DLX/DLQ por fila e `x-delivery-limit`.
- Consumidor com `autoAck: false`, ACK após sucesso, retry com backoff para falha transitória e NACK
  sem requeue na falha final.
- Consumidor com efeito não idempotente usa inbox (`MessageId` + consumidor na mesma transação).
- Nunca abra conexão ou canal com `.GetAwaiter().GetResult()`.

### Bibliotecas NuGet

- Prefira SDK-style, `Nullable` e `TreatWarningsAsErrors`.
- Defina metadata, SemVer, compatibilidade de API, SourceLink/símbolos e documentação.
- APIs públicas assíncronas devem aceitar `CancellationToken` quando aplicável.

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| EF Core, providers, migrations, interceptors e troubleshooting | `examples/entity-framework-core.md` |
| registro de casos de uso, repositórios e lifetimes | `examples/di-patterns.md` |
| RabbitMQ: conexão, topologia, publisher confirms, consumidor, retry e DLQ | `examples/messaging-rabbitmq.md` |
| outbox, worker de publicação, inbox e idempotência | `examples/outbox-inbox.md` |
| empacotamento e publicação NuGet | `examples/nuget-library.md` |
| appsettings, variáveis de ambiente e `dotnet user-secrets` | `examples/configuration-secrets.md` |
| docker-compose local e versões fixas de Postgres/Mongo/Valkey/RabbitMQ | `examples/local-infrastructure.md` |

## Checklist do diff

- [ ] Pacote e versão são necessários para o requisito.
- [ ] Versão declarada só em `Directory.Packages.props`; nenhum `.csproj` com `Version` ou `TargetFramework` próprio.
- [ ] Pacotes `Microsoft.*`, EF Core e `dotnet-ef` estão na major 10.
- [ ] PostgreSQL/Oracle foi escolhido conforme a política.
- [ ] Connection strings e secrets não estão no código nem em `appsettings*.json` versionado.
- [ ] Segredo de desenvolvimento local usa `dotnet user-secrets`, não arquivo versionado.
- [ ] Registro DI, options e migrations estão coerentes.
- [ ] A versão do `dotnet-ef` está fixada no `.config/dotnet-tools.json` e bate com o pacote `Design`.
- [ ] Queries de leitura e Unit of Work respeitam o padrão; eventos passam pelo outbox.
- [ ] Retry, timeout, DLQ e idempotência (inbox quando necessário) foram considerados nas integrações.
- [ ] Container local (se alterado) usa a tag fixada em `examples/local-infrastructure.md`.
- [ ] A alteração não atualiza dependências não relacionadas.
