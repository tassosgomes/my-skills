---
name: dotnet-testing
description: "Use quando a tarefa cria, revisa, diagnostica ou configura testes .NET: unitários com xUnit/Moq/AwesomeAssertions/Bogus, integração de casos de uso e repositórios com Testcontainers, end-to-end da API com WebApplicationFactory, fixtures e dados de teste, ou Dev Containers. Não use apenas porque uma alteração de código precisa de validação manual."
metadata:
  group: dotnet
---

# Estratégia de Testes .NET

Esta skill é acionada pelo trabalho de teste, não automaticamente por toda implementação. Pode
bloquear uma entrega sem cobertura para comportamento relevante, mas o gate deve ser proporcional
ao risco.

## Projetos e camadas

| Projeto | O que exercita | Dependências reais | Dublês |
|---|---|---|---|
| `ProjectName.UnitTests` | Agregados, value objects, validators e casos de uso isolados | nenhuma | Moq para repositórios e `IUnitOfWork` |
| `ProjectName.IntegrationTests` | Caso de uso + repositório + `UnitOfWork` reais; repositórios; outbox | PostgreSQL via Testcontainers | só serviços externos ao processo |
| `ProjectName.EndToEndTests` | API por HTTP: rota, serialização, status, ProblemDetails, persistência | `WebApplicationFactory` + PostgreSQL (e RabbitMQ se o fluxo exigir) via Testcontainers | nenhum dentro do processo |
| `ProjectName.Tests.Common` | `BaseFixture` e geradores de dados compartilhados | — | — |

Playwright e Page Object Model são para projetos com front-end e ficam nas skills de front; em
uma API, "end-to-end" é o teste HTTP acima.

## Padrões obrigatórios

- **Stack:** xUnit, AwesomeAssertions (não FluentAssertions: licença comercial a partir da v8), Moq
  e Bogus.
- **Estrutura espelhada:** a árvore de cada projeto de teste repete a árvore de `src/`
  (`UnitTests/Application/UseCases/Categories/CreateCategory/`).
- **Arquivos por cenário:** `{Alvo}Test.cs` + `{Alvo}TestFixture.cs` (com a `CollectionDefinition`)
  e, quando houver casos parametrizados, `{Alvo}TestDataGenerator.cs`.
- **Hierarquia de fixtures:** `BaseFixture` (Tests.Common) → `{Agregado}UseCasesBaseFixture` →
  `{CasoDeUso}TestFixture`, compartilhada via `ICollectionFixture`.
- **Nomes:** método descritivo e curto em PascalCase, `[Fact(DisplayName = nameof(Metodo))]` e
  `[Trait("{Camada}", "{Agregado} - {Tipo}")]` para filtrar no runner.
- **AAA** com comentários `// Arrange`, `// Act`, `// Assert` quando o teste tiver mais de um bloco.
- **Assíncrono:** `async Task`, nunca `async void` (falhas passam despercebidas).
- **Banco real:** Testcontainers com a mesma major de imagem de `dotnet-dependency-config/examples/local-infrastructure.md`;
  nunca `UseInMemoryDatabase` nem SQLite como substituto.
- **Schema:** aplique as migrations (`Database.MigrateAsync()`), não `EnsureCreated()`, para testar
  também as migrations.
- **Isolamento:** limpe os dados entre testes; nada de dependência de ordem de execução.
- Cubra regras de negócio acima de 80% quando o projeto não definir outro limite; qualidade do
  cenário prevalece sobre cobertura artificial.

## Escolha da camada

| Mudança | Teste mínimo |
|---|---|
| invariante de agregado, value object, validator | unitário |
| orquestração de caso de uso (chamadas, exceções, mapeamento de Output) | unitário |
| query de repositório, mapeamento EF, migration, outbox gravado no commit | integração |
| rota, status HTTP, envelope de resposta, ProblemDetails, autorização | end-to-end |
| consumidor RabbitMQ, inbox | integração com RabbitMQ via Testcontainers |

Não crie end-to-end para cada regra interna; use-o para o contrato HTTP e um caminho feliz por
endpoint, mais os erros que dependem do pipeline (400/404/422).

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| fixtures, geradores de dados, Moq e testes de domínio/caso de uso | `examples/unit-tests.md` |
| Testcontainers, caso de uso com banco real, repositório e outbox | `examples/integration-tests.md` |
| `WebApplicationFactory`, `ApiClient` e asserts de contrato HTTP | `examples/e2e-tests.md` |
| Docker Compose, Dev Container e cleanup | `examples/dev-containers.md` |

Leia somente o exemplo da camada que a tarefa altera.

## Checklist do diff

- [ ] Existe teste regressivo para o comportamento novo ou corrigido.
- [ ] O teste está no projeto e na pasta que espelham o código testado.
- [ ] Fixture, geradores e `CollectionDefinition` seguem a hierarquia; dados de teste não estão duplicados entre projetos.
- [ ] `DisplayName` e `Trait` estão presentes; nenhum `async void`.
- [ ] Integração e end-to-end usam Testcontainers com migrations, sem banco em memória.
- [ ] Fixtures limpam estado e não vazam dados entre testes.
- [ ] O comando focado e o gate relevante foram executados.
