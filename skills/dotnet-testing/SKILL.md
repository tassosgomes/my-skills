---
name: dotnet-testing
description: "Use quando a tarefa cria, revisa, diagnostica ou configura testes .NET: unitários (xUnit v3, Moq, AwesomeAssertions, Bogus), integração com Testcontainers, end-to-end da API com WebApplicationFactory, testes de arquitetura com ArchUnitNET, fixtures e dados de teste, ou Dev Containers. Não use apenas porque uma alteração precisa de validação manual."
metadata:
  group: dotnet
---

# Estratégia de Testes .NET

## Stack

| Tema | Decisão | Motivo |
|---|---|---|
| Framework | xUnit v3 (`xunit.v3`) rodando no Microsoft.Testing.Platform | Versão atual; exigida pelo ArchUnitNET para xUnit v3 |
| Asserções | AwesomeAssertions | FluentAssertions 8+ tem licença comercial |
| Dublês | Moq | — |
| Dados | Bogus com `Faker("pt_BR")` | — |
| Banco real | Testcontainers com a tag de `dotnet-dependency-config/examples/local-infrastructure.md` | — |
| Arquitetura | `TngTech.ArchUnitNET.xUnitV3` | Fronteiras verificadas na pipeline |

`global.json` habilita o runner novo; sem isso `dotnet test` falha no SDK 10:

```json
{
  "sdk": { "version": "10.0.100", "rollForward": "latestFeature" },
  "test": { "runner": "Microsoft.Testing.Platform" }
}
```

Projetos de teste têm `<OutputType>Exe</OutputType>` e referenciam `xunit.v3`,
`xunit.runner.visualstudio` (para a IDE) e `Microsoft.NET.Test.Sdk`.

## Projetos

| Projeto | O que exercita | Dependências reais | Dublês |
|---|---|---|---|
| `ProjectName.ArchitectureTests` | Fronteiras entre camadas/módulos e convenções estruturais | assemblies compilados | nenhum |
| `ProjectName.UnitTests` | Agregados, value objects, validators, casos de uso | nenhuma | Moq para repositórios e `IUnitOfWork` |
| `ProjectName.IntegrationTests` | Caso de uso + repositório + `UnitOfWork`; queries; outbox; consumidores | PostgreSQL (e RabbitMQ quando preciso) em Testcontainers | só serviços externos ao processo |
| `ProjectName.EndToEndTests` | Rota, binding, serialização, status, ProblemDetails, autorização, persistência | `WebApplicationFactory` + Testcontainers | autenticação fake |
| `ProjectName.Tests.Common` | `BaseFixture` e geradores de dados por agregado | — | — |

Playwright e Page Object Model são das skills de front-end.

## Convenções

- Árvore de cada projeto espelha `src/` (`UnitTests/Application/UseCases/Categories/CreateCategory/`).
- Arquivos por cenário: `{Alvo}Test.cs`, `{Alvo}TestFixture.cs` (com a `CollectionDefinition`) e,
  para casos parametrizados, `{Alvo}TestDataGenerator.cs`.
- Fixtures em camadas: `BaseFixture` → `{Agregado}UseCasesBaseFixture` → `{CasoDeUso}TestFixture`.
- Um gerador de dados por agregado em `Tests.Common`; fixtures só combinam geradores.
- Nome do método curto em PascalCase, `[Fact(DisplayName = nameof(Metodo))]` e
  `[Trait("{Camada}", "{Alvo} - {Tipo}")]`.
- AAA com comentários `// Arrange`, `// Act`, `// Assert` quando há mais de um bloco.
- `CancellationToken` passado a APIs de teste é `TestContext.Current.CancellationToken` (o analyzer
  xUnit1051 exige). Para o caso de uso sob teste, também.
- `IAsyncLifetime` do v3 usa `ValueTask`.
- Nunca `UseInMemoryDatabase` nem SQLite; schema por `Database.MigrateAsync()`, nunca `EnsureCreated()`.
- Limpeza entre testes por `TRUNCATE ... CASCADE` das tabelas do modelo; nenhum teste depende de ordem.
- Datas comparadas com `BeCloseTo`; Ids com ordem relevante gerados com `Guid.CreateVersion7(DateTimeOffset)`.
- `Verify` só das interações que são o comportamento (commit feito ou não).
- Cobertura de regras de negócio acima de 80% quando o projeto não definir outro limite.

## Escolha da camada

| Mudança | Teste mínimo |
|---|---|
| Novo projeto, módulo ou referência entre projetos | arquitetura |
| Invariante de agregado, value object, validator | unitário |
| Orquestração de caso de uso (chamadas, exceções, Output) | unitário |
| Query, mapeamento EF, migration, outbox gravado no commit | integração |
| Consumidor RabbitMQ, inbox (mensagem entregue duas vezes) | integração com RabbitMQ |
| Rota, status, envelope, ProblemDetails, autorização | end-to-end |

End-to-end cobre o contrato HTTP: um caminho feliz por endpoint e os erros que dependem do
pipeline (400/401/403/404/422), não cada regra interna.

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| regras ArchUnitNET por formato (API simples, MM, MS) | `examples/architecture-tests.md` |
| fixtures, geradores, Moq, testes de agregado e caso de uso | `examples/unit-tests.md` |
| Testcontainers, caso de uso com banco real, repositório, outbox | `examples/integration-tests.md` |
| `WebApplicationFactory`, `ApiClient`, asserts de contrato | `examples/e2e-tests.md` |
| Dev Container e banco de testes fora do Testcontainers | `examples/dev-containers.md` |

## Checklist do diff

- [ ] Existe teste regressivo para o comportamento novo ou corrigido.
- [ ] `ArchitectureTests` cobre projetos/módulos novos e passa.
- [ ] O teste está na pasta que espelha o código e segue `Test`/`TestFixture`/`TestDataGenerator`.
- [ ] `DisplayName` e `Trait` presentes; `TestContext.Current.CancellationToken`; nenhum `async void`.
- [ ] Integração e end-to-end usam Testcontainers com migrations.
- [ ] Estado limpo entre testes.
- [ ] O comando focado (`dotnet test --project ...`) e o gate relevante foram executados.
