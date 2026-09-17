---
name: dotnet-architecture
description: "Use para mudanças estruturais em .NET C# / ASP.NET Core: novo serviço, módulo, feature, endpoint, caso de uso, camadas, agregados, eventos de domínio, repositories, DTOs, tratamento global de erros ou regras de fronteira. Não use para tuning de performance, observabilidade isolada ou revisão geral de estilo."
metadata:
  group: dotnet
---

# Arquitetura .NET C# / ASP.NET Core

Decisões de estrutura que valem para todo serviço .NET. Os exemplos em `examples/` mostram a forma
esperada de cada peça e só devem ser lidos quando a tarefa tocar aquela peça.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Camadas | Clean Architecture: `Domain`, `Application`, `Api` e um `Infra.*` por tecnologia | Domínio isolado de framework e persistência |
| API HTTP | Minimal API, um `{Agregado}Endpoints` com `MapGroup` por agregado; controllers não são usados | Recomendação oficial do ASP.NET Core para projetos novos; menos cerimônia |
| Identificadores | UUIDv7 (`Guid.CreateVersion7()`) gerado no domínio; `Guid.NewGuid()` banido | Índice ordenado por tempo e Id conhecido antes do insert |
| Casos de uso | Uma classe por caso de uso, com interface própria; sem MediatR ou dispatcher | Fluxo navegável sem reflection; MediatR tem licença comercial |
| Mapeamento | Manual, com `static From{Entidade}` no Output | AutoMapper tem licença comercial |
| Validação de input | FluentValidation chamada explicitamente pelo caso de uso; `AddValidation()` nativo não é ligado | Uma única fonte de 400 |
| Eventos | Levantados pelo agregado e gravados no outbox pelo `IUnitOfWork` | Estado e evento na mesma transação |
| Fronteiras | Verificadas por `ProjectName.ArchitectureTests` (ArchUnitNET) | Violação falha a pipeline em vez de depender de review |

## Dependências entre projetos

```text
Api ---------------> Application ---> Domain
Infra.Data --------------------------> Domain
Infra.Messaging ---> Infra.Data -----> Domain
Infra.* - - - - - -> Application      (somente Application/Interfaces)
Api - - - - - - - -> Infra.*          (somente em Api/Extensions, composition root)
```

- **Domain:** SeedWork, agregados, value objects, eventos, exceções de domínio e portas de
  persistência (`IXxxRepository`, `IUnitOfWork`). Sem ASP.NET Core nem EF Core.
- **Application:** casos de uso, exceções de aplicação e portas técnicas em `Interfaces/`
  (`IStorageService`, `IXxxQueries`).
- **Api:** endpoints, contratos HTTP, envelope, autorização, exception handler, message handlers e
  composition root.
- **Infra.\*:** implementações. Nunca usa casos de uso, Inputs/Outputs ou exceções da Application.

## Regras não negociáveis

1. Invariantes ficam no agregado; o caso de uso só orquestra.
2. Caso de uso em `Application/UseCases/{Agregados}/{CasoDeUso}/` com `I{CasoDeUso}`, `{CasoDeUso}`,
   `{CasoDeUso}Input` e, só se houver regra de formato, `{CasoDeUso}InputValidator`. Output usado por
   mais de um caso de uso fica em `{Agregados}/Common/`.
3. O repositório retorna `null` quando não encontra; quem lança `NotFoundException` é o caso de uso.
4. O repositório não chama `SaveChangesAsync`; quem confirma é `IUnitOfWork.CommitAsync`.
5. Caso de uso nunca publica no broker.
6. `ValidationException` (FluentValidation) → 400, `NotFoundException` → 404,
   `EntityValidationException` e `RelatedAggregateException` → 422, qualquer outra → 500. Tudo sai
   como `ProblemDetails` por um único `IExceptionHandler`.
7. Endpoint só traduz HTTP para caso de uso: sem `try/catch`, repositório, `DbContext` ou regra.
8. Agregado referencia outro agregado somente pelo Id.
9. Toda solution tem `tests/ProjectName.ArchitectureTests` com as regras do formato escolhido
   (`dotnet-testing/examples/architecture-tests.md`).

## Formato da solução

| Formato | Quando | Exemplo |
|---|---|---|
| API simples | Padrão; domínio ainda sem fronteiras internas claras | `examples/project-setup.md` |
| Monolito Modular | Fronteiras claras, deploy único | `examples/modular-monolith.md` |
| Microsserviços | Módulos precisam de deploy, escala ou versão independentes | `examples/microservices.md` |

Comece pela API simples e evolua quando a dor de acoplamento ou de deploy for real.

## Carregamento sob demanda

| Necessidade | Recurso |
|---|---|
| árvore da solution, arquivos da raiz, `BannedSymbols.txt`, referências | `examples/project-setup.md` |
| SeedWork, UUIDv7, agregado, validação de domínio | `examples/domain-model.md` |
| caso de uso, Input/Output, validator, exceções, registro na DI | `examples/use-cases.md` |
| endpoints Minimal API, envelope, paginação, autorização | `examples/api-layer.md` |
| repositório por agregado e busca paginada | `examples/repository-pattern.md` |
| `IExceptionHandler` e formato do ProblemDetails | `examples/error-handling.md` |
| módulos e fronteira in-process | `examples/modular-monolith.md` |
| serviços e contrato compartilhado | `examples/microservices.md` |

Para um endpoint novo, `use-cases.md` e `api-layer.md` bastam. Outbox e inbox ficam em
`dotnet-dependency-config/examples/outbox-inbox.md`.

## Checklist do diff

- [ ] Referências entre projetos seguem o grafo e `ArchitectureTests` passa.
- [ ] Todo Id novo usa `Guid.CreateVersion7()`.
- [ ] O caso de uso tem pasta própria e é injetado pela interface no handler do endpoint.
- [ ] O endpoint está no `{Agregado}Endpoints` do agregado, sem lógica nem `try/catch`.
- [ ] O repositório retorna `null`; eventos passam pelo outbox.
- [ ] Entidade não aparece no contrato HTTP.
- [ ] Há teste focado para o comportamento novo ou alterado.
