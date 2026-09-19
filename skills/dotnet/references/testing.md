# Testes — fixtures, containers e arquitetura

Os padrões de nome, `Trait`, `DisplayName` e escolha de camada estão no `SKILL.md`. Aqui está a
montagem de cada projeto.

## Projetos

| Projeto | O que exercita | Dependências reais | Dublês |
|---|---|---|---|
| `ArchitectureTests` | Fronteiras entre camadas/módulos e convenções estruturais | assemblies compilados | nenhum |
| `UnitTests` | Agregados, value objects, validators, casos de uso | nenhuma | Moq para repositórios e `IUnitOfWork` |
| `IntegrationTests` | Caso de uso + repositório + `UnitOfWork`; queries; outbox; consumidores | PostgreSQL (e RabbitMQ quando preciso) em Testcontainers | só serviços externos ao processo |
| `EndToEndTests` | Rota, binding, serialização, status, ProblemDetails, autorização, persistência | `WebApplicationFactory` + Testcontainers | autenticação fake |
| `Tests.Common` | `BaseFixture` e geradores de dados por agregado | — | — |

Projetos de teste têm `<OutputType>Exe</OutputType>` e referenciam `xunit.v3`,
`xunit.runner.visualstudio` (para a IDE) e `Microsoft.NET.Test.Sdk`. O `global.json` habilita o
runner novo — sem `"test": { "runner": "Microsoft.Testing.Platform" }`, `dotnet test` falha no SDK 10.
`IAsyncLifetime` do v3 usa `ValueTask`.

## Fixtures em camadas

`BaseFixture` (tem o `Faker("pt_BR")`) → `{Agregado}UseCasesBaseFixture` (tem o gerador de dados do
agregado e os mocks de repositório/`IUnitOfWork`) → `{CasoDeUso}TestFixture` (tem os inputs válidos e
os inválidos nomeados).

Um gerador de dados por agregado em `Tests.Common`, respeitando os limites do agregado e expondo
também os valores inválidos (`GetTooLongName()`). Fixtures **só combinam** geradores, não geram dados
próprios.

A `CollectionDefinition` mora no arquivo da fixture:

```csharp
[CollectionDefinition(nameof(CreateCategoryTestFixture))]
public sealed class CreateCategoryTestFixtureCollection : ICollectionFixture<CreateCategoryTestFixture>;
```

Quando a classe de teste tem o nome do caso de uso, um alias resolve o conflito:
`using UseCase = ProjectName.Application.UseCases.Categories.CreateCategory;`

## Unitário

- `Verify` só das interações que **são** o comportamento: `InsertAsync` chamado uma vez, `CommitAsync`
  chamado — ou, no caminho de falha, `CommitAsync` **nunca** chamado.
- Caso inválido em `[Theory]` com `TestDataGenerator` devolvendo `TheoryData<TInput, string>`: input
  e mensagem esperada juntos.
- Datas com `BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1))`.
- Teste de agregado confere o evento levantado e a versão do Id (`category.Id.Version.Should().Be(7)`).

## Integração

Container compartilhado como **collection fixture**; fixture de dados instanciada por classe — o
xUnit não injeta duas collection fixtures na mesma classe.

- `DatabaseFixture` sobe o `PostgreSqlContainer` com a tag do compose e aplica `MigrateAsync()`.
- `ResetDatabaseAsync` monta o `TRUNCATE ... CASCADE` a partir de `context.Model.GetEntityTypes()`,
  não de uma lista escrita à mão que envelhece.
- Classes na mesma collection não rodam em paralelo: a limpeza de uma não apaga dados de outra.
- **Assert sobre o banco usa `DbContext` novo** — o do teste tem o `ChangeTracker` populado e
  esconderia um mapeamento errado.
- Todo teste de caso de uso que levanta evento confere a linha no outbox (`Type` e `ProcessedOn`
  nulo); o cenário de falha confere que **nem dados nem outbox** foram gravados.
- Repositório: `null` quando não encontra, paginação em `[Theory]` e ordenação com desempate por Id.
- Consumidor e inbox: `Testcontainers.RabbitMq` com a tag do compose; **entregar a mesma mensagem
  duas vezes e conferir um único efeito**.

## End-to-end

`WebApplicationFactory<Program>` com o container, uma collection para toda a suíte:

- `UseEnvironment("EndToEndTest")` e `UseSetting("ConnectionStrings:DefaultConnection", ...)` com a
  connection string do container.
- `ConfigureTestServices` remove os `IHostedService` — sem broker no teste, o assert é a **linha do
  outbox**, não a publicação.
- `TestAuthHandler` devolve um `ClaimsPrincipal` com as `Roles.*` pedidas por header; sem o header a
  requisição é anônima, o que é como se testa 401/403.
- `Program.cs` termina com `public partial class Program;`.
- Cobre um caminho feliz por endpoint e os erros que dependem do pipeline (400/401/403/404/422), não
  cada regra interna.

## Arquitetura

Um projeto `ArchitectureTests` por solution, carregando os assemblies de `src/`. As regras prontas
estão em [`../assets/ArchitectureTests/`](../assets/ArchitectureTests/) — copie e troque
`ProjectName` e os tipos-âncora.

- Rode em `Debug` (padrão do `dotnet test`): o ArchUnitNET lê o IL e o Release pode otimizar
  dependências.
- `Guid.NewGuid()`, `DateTime.Now` e `Migrate()` **não** são verificados aqui — o `BannedSymbols.txt`
  quebra o build antes, e mais barato.
- Regra nova nasce de uma decisão do `SKILL.md`; não crie regra por gosto pessoal.
- Exceção a uma regra é explícita no próprio teste (`AreNot(...)`) com o motivo em `Because(...)`,
  nunca removendo a regra.
- Todo assembly de `src/` está no `LoadAssemblies`: assembly esquecido é fronteira sem verificação.
- Providers de camada terminam em `Layer` — dentro de `ProjectName.ArchitectureTests`, um `Domain`
  solto resolve para o namespace `ProjectName.Domain` e não compila.
- **Não use `WithoutRequiringPositiveResults()`**: no ArchUnitNET 0.13 uma regra cujo filtro não
  encontra tipos falha, e isso quase sempre é prefixo de namespace errado.

No monolito modular, as mesmas regras de camada valem por módulo (providers por prefixo
`ProjectName.{Modulo}.`), mais a fronteira entre módulos como `[Theory]` sobre os pares de módulos.
Ao criar um módulo, acrescente-o à lista **e** ao `LoadAssemblies`.

## Dev Containers

Os testes não mudam; muda a origem do PostgreSQL.

| Ambiente | PostgreSQL dos testes |
|---|---|
| Máquina com Docker | Testcontainers |
| Dev Container | Serviço `postgres` do compose, via `TEST_POSTGRES_CONNECTION` |
| CI | Testcontainers |
