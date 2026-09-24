---
name: dotnet
description: "Use em qualquer trabalho .NET C# / ASP.NET Core: criar serviço ou módulo, endpoint, caso de uso, agregado, camadas, EF Core e migrations, mensageria com outbox, configuração e segredos, Program.cs, observabilidade, performance, testes, convenções de código e gate de produção. Este é o padrão do time — aplique-o em vez de decidir caso a caso."
metadata:
  group: dotnet
---

# Padrão .NET C# / ASP.NET Core

Este documento é a decisão, não o tutorial. Você sabe escrever C#; o que está aqui é **qual** das
alternativas equivalentes este time usa e **onde** cada coisa mora. Quando o padrão e o hábito
divergirem, o padrão vence. Divergir dele exige dizer por quê no PR.

Boas práticas universais de C# — naming da Microsoft, async sem bloqueio, SOLID, constructor
injection — são pressupostas e não se repetem aqui.

## Stack fechada

| Papel | Escolha | Não use |
|---|---|---|
| Plataforma | .NET 10 (LTS), `net10.0`, C# 14 | .NET 8/9 em serviço novo |
| Camadas | Clean Architecture: `Domain`, `Application`, `Api`, um `Infra.*` por tecnologia | camada única, `Shared` genérico |
| API HTTP | Minimal API, um `{Agregado}Endpoints` com `MapGroup` | controllers, `AddControllers` |
| Casos de uso | Uma classe por caso de uso, com interface própria | MediatR, dispatcher, handler genérico |
| Mapeamento | Manual, `static From{Entidade}` no Output | AutoMapper (licença); Mapster só com volume justificado |
| Validação | FluentValidation chamada pelo caso de uso | `AddValidation()` nativo ligado em paralelo |
| Identificadores | UUIDv7 (`Guid.CreateVersion7()`) gerado no domínio | `Guid.NewGuid()`, Id gerado pelo banco |
| ORM | EF Core 10, Fluent API (`IEntityTypeConfiguration<T>`) | Data Annotations no domínio |
| Banco | PostgreSQL | Oracle só em legado ou aprovação explícita |
| DI por convenção | Scrutor (`AsMatchingInterface`) | registro manual repetitivo |
| HTTP de saída | `IHttpClientFactory` + `Microsoft.Extensions.Http.Resilience` | `Microsoft.Extensions.Http.Polly` |
| Mensageria | `RabbitMQ.Client` 7 direto + outbox obrigatório | MassTransit, Wolverine, qualquer wrapper |
| Cache distribuído | Valkey via `StackExchange.Redis` / `IDistributedCache` | cache de agregado |
| Documentação da API | `Microsoft.AspNetCore.OpenApi` + Scalar | Swashbuckle, NSwag |
| Observabilidade | OpenTelemetry + OTLP | Serilog em serviço novo |
| Teste | xUnit v3 no Microsoft.Testing.Platform, Moq, Bogus | xUnit v2, NUnit |
| Asserções | AwesomeAssertions | FluentAssertions (licença desde a v8) |
| Banco em teste | Testcontainers | `UseInMemoryDatabase`, SQLite, `EnsureCreated()` |
| Arquitetura verificada | `TngTech.ArchUnitNET.xUnitV3` | review manual como única fronteira |

Versões são piso, não teto: suba minor/patch à vontade, trate major como decisão. `Microsoft.*`,
EF Core, provider e `dotnet-ef` ficam na mesma major. Atualização de pacote é mudança própria — não
suba versão não relacionada junto de uma feature.

## Gates — o que falha sozinho

Nenhuma destas depende de alguém lembrar. Os arquivos estão em [`assets/`](assets/) e vão para a
raiz da solution.

| Regra | Mecanismo | Arquivo |
|---|---|---|
| `Guid.NewGuid()`, `DateTime.Now/Today`, `DateTimeOffset.Now` | `RS0030` no build | `BannedSymbols.txt` |
| `AddControllers` / `MapControllers` | `RS0030` | `BannedSymbols.txt` |
| `Migrate()` no boot, `EnsureCreated()` em teste | `RS0030` | `BannedSymbols.txt` |
| Pacote proibido (AutoMapper, MediatR, FluentAssertions, Http.Polly, MassTransit, Swashbuckle, NSwag, Serilog.AspNetCore) | `TSG0001` no build | `Directory.Build.targets` |
| Pasta = namespace | `IDE0130` como erro | `.editorconfig` |
| Namespace file-scoped | `IDE0161` como erro | `.editorconfig` |
| `catch` genérico | `CA1031` como erro | `.editorconfig` |
| Fronteiras entre camadas, caso de uso `sealed`, endpoint sem porta de persistência, entidade fora do contrato HTTP | `dotnet test` | `ArchitectureTests/` |
| Migration pendente | `dotnet ef migrations has-pending-model-changes` na CI | pipeline |
| Migration já aplicada foi editada, apagada ou renomeada | script na CI | `assets/ci/check-migrations-immutable.sh` |

`BannedSymbols.txt` ignora **em silêncio** uma assinatura que não resolve: entrada nova só entra
depois de você provar num build que ela falha. Toda entrada atual foi verificada assim.

Ao banir um pacote, edite `Directory.Build.targets` **e** a tabela de stack no mesmo commit; duas
fontes que divergem é o modo de falha que este arquivo existe para evitar.

> **CPM e fontes NuGet.** Com `ManagePackageVersionsCentrally` e mais de uma fonte configurada, o
> NuGet emite `NU1507`, que `TreatWarningsAsErrors` transforma em falha de build. Configure package
> source mapping no `nuget.config` da solution, ou reduza a uma fonte.

## Estrutura

Um único alvo. Não existe "estrutura para projeto pequeno".

```text
ProjectName.slnx
global.json  Directory.Build.props  Directory.Build.targets
Directory.Packages.props  BannedSymbols.txt  .editorconfig
.config/dotnet-tools.json            # dotnet-ef na versão do EF Core
src/
├── ProjectName.Domain/              SeedWork, Entities, ValueObjects, Events, Exceptions,
│                                    Repositories (portas), Validation
├── ProjectName.Application/         Common, Exceptions, Interfaces (portas técnicas:
│                                    IStorageService, IXxxQueries),
│                                    UseCases/{Agregados}/{CasoDeUso}/
├── ProjectName.Infra.Data/          DbContext, UnitOfWork, Configurations, Repositories,
│                                    Queries, Outbox, Inbox, Migrations
├── ProjectName.Infra.Messaging/     Configuration, Connection, Topology, Publishing, Consuming
└── ProjectName.Api/                 Program.cs, Extensions/, Endpoints/, ApiModels/Responses/,
                                     Authorization/, ExceptionHandlers/, MessageHandlers/
tests/
├── ProjectName.Tests.Common/  ArchitectureTests/  UnitTests/  IntegrationTests/  EndToEndTests/
```

```text
Api ---------------> Application ---> Domain
Infra.Data --------------------------> Domain
Infra.Messaging ---> Infra.Data -----> Domain
Infra.* - - - - - -> Application      (somente Application/Interfaces)
Api - - - - - - - -> Infra.*          (somente em Api/Extensions, composition root)
```

- **Domain** não conhece ASP.NET Core nem EF Core.
- **Infra.\*** nunca usa caso de uso, Input/Output ou exceção da Application.
- Projetos de teste espelham a árvore de `src/`.
- Pastas em PascalCase, no plural quando agrupam tipos (`Entities`, `UseCases/Categories`).

| Formato | Quando |
|---|---|
| API simples | Padrão; domínio ainda sem fronteiras internas claras |
| Monolito Modular | Fronteiras claras, deploy único |
| Microsserviços | Módulos precisam de deploy, escala ou versão independentes |

Comece pela API simples e evolua quando a dor de acoplamento ou de deploy for real.

## Regras não negociáveis

1. Invariante mora no agregado; o caso de uso só orquestra.
2. Caso de uso em `Application/UseCases/{Agregados}/{CasoDeUso}/` com `I{CasoDeUso}`,
   `{CasoDeUso}`, `{CasoDeUso}Input` e, só se houver regra de formato, `{CasoDeUso}InputValidator`.
   Output usado por mais de um caso de uso fica em `{Agregados}/Common/`.
3. O repositório retorna `null` quando não encontra; quem lança `NotFoundException` é o caso de uso.
4. O repositório não chama `SaveChangesAsync`; quem confirma é `IUnitOfWork.CommitAsync`.
5. Caso de uso nunca publica no broker — levanta o evento no agregado, o outbox publica.
6. `ValidationException` → 400, `NotFoundException` → 404, `EntityValidationException` e
   `RelatedAggregateException` → 422, qualquer outra → 500. Tudo sai como `ProblemDetails` por um
   único `IExceptionHandler`.
7. Endpoint só traduz HTTP para caso de uso: sem `try/catch`, repositório, `DbContext` ou regra.
8. Agregado referencia outro agregado somente pelo Id.
9. Entidade não aparece no contrato HTTP.
10. Toda solution tem `tests/ProjectName.ArchitectureTests` com as regras do formato escolhido.

## Program.cs

**`Program.cs` só encadeia métodos de extensão; nunca contém configuração.** Um arquivo e um método
por concern em `Api/Extensions/` (`AddXxxConfiguration` / `UseXxx` / `MapXxx`), sem
`ServiceExtensions.cs` genérico.

- A extensão lê a `IConfiguration` recebida; `Program.cs` não lê configuração nem segredo.
- `Program.cs` não tem `if` de ambiente; a extensão recebe `IHostEnvironment` e decide.
- A ordem do pipeline vive só em `UseApplicationPipeline`.
- `public partial class Program;` no fim, para o `WebApplicationFactory`.
- OpenAPI e Scalar mapeados só em Development (`/openapi/v1.json`, `/scalar`).
- Policies registradas com `Policies.*`/`Roles.*` de `Api/Authorization/`, nunca string solta.
- CORS, autenticação e autorização têm cada um sua extensão; nenhuma origem fixa no código.

## Persistência

- Nomes no banco em `snake_case` explícito (`ToTable("categories")`, `HasColumnName("created_at")`).
- Id: coluna `uuid` com `ValueGeneratedNever()` — o domínio gera antes do insert.
- `ApplyConfigurationsFromAssembly`; um `DbContext` por serviço (ou por módulo).
- Migrations history em `__ef_migrations_history`; `dotnet-ef` fixado em `.config/dotnet-tools.json`.
- Migration é step de deploy (`database update` ou script `--idempotent`), nunca no boot.
- Após gerar migration, execute o check de formatação exigido pela solution ou seu CI e corrija
  o arquivo gerado antes do gate. Preserve migrations já aplicadas.
- `IUnitOfWork.CommitAsync` grava dados e outbox no mesmo `SaveChangesAsync`.
- `EnableSensitiveDataLogging`/`EnableDetailedErrors` só em Development.

| Tipo | Lifetime |
|---|---|
| `DbContext`, repositórios, `IUnitOfWork`, `IXxxQueries` | Scoped |
| Casos de uso e validators | Scoped |
| `IMessageHandler<T>` | Scoped (um escopo por mensagem) |
| `RabbitMqConnectionProvider`, `RabbitMqPublisher` | Singleton |

`BackgroundService` cria escopo com `IServiceScopeFactory.CreateAsyncScope()`. Endpoints não recebem
repositório, `IUnitOfWork` nem `DbContext`.

## Mensageria

- O `OutboxPublisherWorker` é o único publicador, com publisher confirms.
- Topologia declarada em `IHostedService` registrado antes dos consumidores: exchange `topic`, filas
  quorum, DLX/DLQ por fila e `x-delivery-limit`.
- Routing key é contrato versionado: `{servico}.{agregado}.{evento}.v{n}`.
- Consumidor com `autoAck: false`, ACK após sucesso, retry com backoff só para falha transitória,
  NACK sem requeue na falha final.
- Consumidor com efeito não idempotente usa inbox.

## Configuração e segredos

`IOptions<T>` com `ValidateOnStart`. `appsettings*.json` só com config não sensível; env vars (`__`)
no deploy; `dotnet user-secrets` em desenvolvimento. Nenhuma credencial versionada.

## Observabilidade

- Uma `ActivitySource` e um `Meter` por serviço, mesmo nome, em
  `Application/Common/{ProjectName}Telemetry.cs` (só `System.Diagnostics`, sem pacote OTel na Application).
- Span manual só para operação de negócio observada à parte; bordas vêm da instrumentação.
- Métrica `{servico}.{agregado}.{evento}` com `unit`; dimensão nunca é Id.
- `/health/live` só com `self`; `/health/ready` com as dependências obrigatórias. Opcional é
  `Degraded`, nunca `Unhealthy`. Todo check tem timeout. Resposta pública só com o status.
- Log com template estruturado sempre; interpolação e concatenação proibidas. Exceção como primeiro
  argumento. Log agregado depois de loop, nunca um por item.
- **Nenhum dado pessoal** em log, span, tag, dimensão, `data` de health check ou payload de erro.
- `HostOptions.ShutdownTimeout` maior que um lote do outbox e que o processamento de uma mensagem.

## Performance

**Só com medição ou hipótese declarada.** Otimização que muda semântica, consistência ou contrato é
regressão. Registre o baseline, mude uma coisa por vez, compare no mesmo ambiente.

- Carregar para alterar → agregado rastreado pelo repositório. Tela de leitura → projeção via
  `Application/Interfaces/I{Agregado}Queries`, implementada em `Infra.Data/Queries`.
- Ordenação sempre determinística, com desempate por Id.
- `ExecuteUpdateAsync`/`ExecuteDeleteAsync` só em manutenção técnica sem regra nem evento: não
  validam, não levantam evento, não gravam outbox.
- Paginação: o formato no fio pertence ao contrato (`tsg-flow-contract-creator`); aqui se decide só
  a implementação — offset por padrão, keyset quando a página profunda doer.
- Cache guarda o **Output**, nunca o agregado; chave `{servico}:{agregado}:{id}:v{n}`; TTL absoluto
  sempre; invalidação depois do `CommitAsync` com `CancellationToken.None`.

| Cache | Quando |
|---|---|
| `IMemoryCache` | Uma instância, ou divergência de segundos entre pods aceitável |
| `IDistributedCache` (Valkey) | Várias instâncias precisam da mesma entrada ou da mesma invalidação |
| `HybridCache` | Stampede medido em cache miss sob carga |

- HTTP de saída: cliente tipado atrás de porta em `Application/Interfaces`, registrado com
  `AddStandardResilienceHandler` — `AttemptTimeout` 5 s, `TotalRequestTimeout` 20 s,
  `MaxRetryAttempts` 3, `Retry.DisableForUnsafeHttpMethods()`. 404 do sistema externo vira `null`;
  outras falhas propagam. Retry em método não idempotente só com chave de idempotência aceita.
- `AsSplitQuery`, compiled query e `AddDbContextPool` só onde a medição mostrou o problema.
- Ferramentas: spans de EF Core no OpenTelemetry, `dotnet-counters`, `dotnet-trace`;
  BenchmarkDotNet só para código isolado.

## Testes

| Mudança | Teste mínimo |
|---|---|
| Novo projeto, módulo ou referência entre projetos | arquitetura |
| Invariante de agregado, value object, validator | unitário |
| Orquestração de caso de uso | unitário |
| Query, mapeamento EF, migration, outbox no commit | integração |
| Consumidor RabbitMQ, inbox | integração com RabbitMQ |
| Rota, status, formato da resposta, ProblemDetails, autorização | end-to-end |
| Cliente HTTP de saída com mapeamento ou autenticação própria | teste do cliente real com handler HTTP controlado |
| Registro ou composição de dependências do host | partida do host com os registros reais em configuração de teste |

- Árvore de cada projeto espelha `src/`.
- Arquivos por cenário: `{Alvo}Test.cs`, `{Alvo}TestFixture.cs`, `{Alvo}TestDataGenerator.cs`.
- Fixtures em camadas: `BaseFixture` → `{Agregado}UseCasesBaseFixture` → `{CasoDeUso}TestFixture`.
  Um gerador de dados por agregado em `Tests.Common`; fixtures só combinam geradores.
- `[Fact(DisplayName = nameof(Metodo))]` e `[Trait("{Camada}", "{Alvo} - {Tipo}")]`.
- `CancellationToken` de teste é `TestContext.Current.CancellationToken` (o analyzer xUnit1051 exige).
- Schema por `Database.MigrateAsync()`; limpeza por `TRUNCATE ... CASCADE`; nenhum teste depende de ordem.
- `Verify` só das interações que **são** o comportamento (commit feito ou não).
- Datas comparadas com `BeCloseTo`; Ids com ordem relevante por `Guid.CreateVersion7(DateTimeOffset)`.
- Cobertura de regra de negócio acima de 80% quando o projeto não definir outro limite.
- End-to-end cobre o contrato HTTP: um caminho feliz por endpoint e os erros do pipeline, não cada
  regra interna. E2E de interface (Playwright, Page Object) é das skills de frontend.

## Convenções de código

O que os gates não pegam sozinhos:

- Código, nomes, comentários, logs e mensagens de exceção em inglês. Exceção: termos da linguagem
  ubíqua registrados no glossário.
- Um tipo por arquivo, com o nome do tipo.
- Classes concretas são `sealed` por padrão; abra só com herança real.
- Primary constructor quando o único construtor só recebe dependências da DI. Construtor clássico
  com campos `readonly` quando há mais de um construtor, o construtor tem comportamento, ou a
  dependência não pode ser reatribuída.
- Entidades e agregados: construtor privado sem parâmetros e fábrica estática (`Create`).
- Métodos assíncronos terminam em `Async`, inclusive handlers de Minimal API. Exceção: testes.
- `CancellationToken` é o último parâmetro, obrigatório (sem `= default`) em código interno.
- Depois do `CommitAsync`, limpeza (invalidar cache, marcar outbox) usa `CancellationToken.None`:
  request abortado não pode deixar estado pela metade.
- Exceção de negócio usa os tipos do projeto; não lance `Exception`, `ArgumentException` ou
  `InvalidOperationException` para regra de negócio.
- Limites: até 3 parâmetros (acima disso, record de input), método ~50 linhas, classe ~300 linhas,
  no máximo 2 níveis de aninhamento. Sem flag parameter. Constante nomeada no lugar de número mágico.
- Comente o porquê não óbvio; nunca o que o código já diz.

## Antes de release

Gate agregado — a implementação de cada item está nas seções acima; aqui se verifica que existe.

- [ ] Build, `ArchitectureTests`, unitários, integração e end-to-end passaram.
- [ ] Traces, métricas, logs e probes configurados para o ambiente alvo.
- [ ] Nenhum dado sensível em log, span, métrica ou payload de erro.
- [ ] Segredos e connection strings fora do repositório.
- [ ] Migrations como step de deploy, smoke test e rollback definidos.
- [ ] Alertas de outbox esgotado e DLQ ativos.
- [ ] Falhas bloqueantes têm evidência e responsável.

## Referências sob demanda

Leia só quando a tarefa for essa:

- [`references/architecture.md`](references/architecture.md) — SeedWork, agregado, caso de uso,
  endpoint, repositório e `IExceptionHandler`.
- [`references/persistence.md`](references/persistence.md) — mapeamento EF, providers, auditoria,
  diagnóstico de migrations.
- [`references/messaging.md`](references/messaging.md) — topologia, publicação, consumidor, outbox,
  inbox, retry e DLQ.
- [`references/testing.md`](references/testing.md) — fixtures, Testcontainers, `WebApplicationFactory`,
  regras ArchUnitNET por formato, Dev Containers.
- [`references/operations.md`](references/operations.md) — health checks próprios, registro do
  OpenTelemetry, máscaras de dado sensível, níveis de log por ambiente, Dockerfile.
- [`references/solution-formats.md`](references/solution-formats.md) — Monolito Modular e
  Microsserviços: fronteiras, contratos e regras extras.
- [`assets/`](assets/) — arquivos de raiz e `ArchitectureTests` prontos para copiar.
