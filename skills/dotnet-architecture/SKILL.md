---
name: dotnet-architecture
description: "Use para mudanças estruturais em .NET C# / ASP.NET Core: novo serviço, módulo, feature, endpoint, caso de uso, camadas, agregados, eventos de domínio, repositories, DTOs ou tratamento global de erros. Não use para tuning de performance, observabilidade isolada ou revisão geral de estilo."
metadata:
  group: dotnet
---

# Arquitetura .NET C# / ASP.NET Core

Esta é a skill primária quando a mudança altera a estrutura do sistema. O core mantém as
fronteiras e as regras que não podem ser esquecidas; exemplos completos ficam em `examples/` e
só devem ser lidos quando a tarefa exigir aquele padrão.

## Modelo obrigatório

Use Clean Architecture com estas dependências entre projetos:

```text
Api ---------------> Application ---> Domain
Infra.Data --------------------------> Domain
Infra.Messaging ---> Infra.Data -----> Domain
Infra.* - - - - - -> Application      (somente para implementar portas técnicas de Application/Interfaces)
Tests -------------> projetos que exercitam
```

- **Domain:** agregados, entidades, value objects, eventos de domínio, invariantes e as portas de
  persistência (`IXxxRepository`, `IUnitOfWork`). Não depende de ASP.NET Core, EF Core ou outra
  infraestrutura.
- **Application:** um caso de uso por classe, com Input, Output, interface e validator na mesma
  pasta; portas técnicas que não são conceito de domínio (`IStorageService`, `IEmailSender`) em
  `Application/Interfaces`.
- **Api:** controllers finos, contratos HTTP, envelope de resposta, autorização, exception handler e
  composition root.
- **Infra.\*:** um projeto por tecnologia (`Infra.Data` para EF Core, `Infra.Messaging` para
  RabbitMQ, `Infra.Storage`...). A Infra nunca usa casos de uso, DTOs ou exceções da Application.
- **Tests:** `UnitTests`, `IntegrationTests` e `EndToEndTests`, espelhando a árvore de `src/`.

Layout da solution: `src/` e `tests/` na raiz, projetos nomeados `ProjectName.{Camada}` — ver
`examples/project-setup.md`.

## Regras não negociáveis

1. Regras de negócio e invariantes ficam no Domain; o caso de uso só orquestra.
2. Cada caso de uso é uma classe com interface própria (`ICreateCategory : IUseCase<CreateCategoryInput, CategoryModelOutput>`)
   e o controller injeta essa interface diretamente. Não use MediatR nem dispatcher.
3. Casos de uso ficam em `Application/UseCases/{AgregadoNoPlural}/{CasoDeUso}/`; DTOs compartilhados
   do agregado ficam em `{AgregadoNoPlural}/Common/`.
4. Repositórios existem por agregado (`IGenericRepository<TAggregate>`), com interface no Domain e
   implementação em `Infra.Data`. O repositório retorna `null` quando não encontra; quem decide
   lançar `NotFoundException` é o caso de uso.
5. Eventos de domínio são levantados pelo agregado e gravados no outbox pelo `IUnitOfWork` na mesma
   transação dos dados; nunca publique no broker de dentro do caso de uso ou antes de salvar.
6. Invariantes de domínio produzem `EntityValidationException` (422); formato de input inválido
   produz `ValidationException` do FluentValidation (400); tudo sai como `ProblemDetails` via
   `IExceptionHandler`.
7. O validator do FluentValidation é chamado explicitamente pelo caso de uso antes de qualquer
   efeito colateral.
8. Mapeamento é manual: o Output expõe `static From{Entidade}(...)`; entidade nunca atravessa para
   o contrato HTTP.
9. Propague `CancellationToken` em toda a cadeia assíncrona.

## Escolha de formato de solução

Os três formatos compartilham o mesmo modelo de camadas; o que muda é a fronteira entre unidades
de deploy. Escolha pelo estágio real do projeto, não pelo tamanho esperado no futuro:

| Formato | Quando usar | Exemplo |
|---|---|---|
| **API simples** (um serviço) | Ponto de partida padrão; domínio ainda não tem fronteiras internas claras | `examples/project-setup.md` |
| **Monolito Modular** | Fronteiras de domínio já claras, mas deploy/escala ainda não precisam ser independentes | `examples/modular-monolith.md` |
| **Microsserviços** | Módulos já precisam escalar, implantar ou versionar de forma independente | `examples/microservices.md` |

Não comece por Monolito Modular ou Microsserviços "para o caso de precisar depois" — evolua a
partir da API simples quando a dor de acoplamento ou de deploy for real.

## Carregamento sob demanda

| Necessidade | Recurso a ler |
|---|---|
| árvore de solution, projetos e referências | `examples/project-setup.md` |
| SeedWork, agregado, value object, eventos e validação de domínio | `examples/domain-model.md` |
| caso de uso, Input/Output, validator e registro na DI | `examples/use-cases.md` |
| controller, envelope de resposta, paginação e autorização | `examples/api-layer.md` |
| repositório por agregado, busca paginada e Unit of Work | `examples/repository-pattern.md` |
| exceções, ProblemDetails e `IExceptionHandler` | `examples/error-handling.md` |
| estrutura de módulos, fronteira in-process, host único | `examples/modular-monolith.md` |
| estrutura multi-serviço, contrato compartilhado, comunicação entre serviços | `examples/microservices.md` |

Não leia todos os exemplos por padrão. Para criar um endpoint novo, `use-cases.md` e
`api-layer.md` bastam; leia `domain-model.md` só se o agregado mudar. A implementação do outbox
e do inbox fica em `dotnet-dependency-config/examples/outbox-inbox.md`.

## Checklist do diff

- [ ] As referências entre projetos seguem o grafo acima; Infra não usa casos de uso nem DTOs.
- [ ] O Domain continua independente de framework e persistência.
- [ ] O caso de uso tem pasta própria com Input, Output (ou Output comum), interface e implementação.
- [ ] O controller é fino e injeta a interface do caso de uso, sem MediatR ou dispatcher.
- [ ] O repositório retorna `null` e o caso de uso decide sobre `NotFoundException`.
- [ ] Eventos de domínio vão para o outbox na mesma transação dos dados.
- [ ] Entidade não vaza para a API; o Output é montado por `From{Entidade}`.
- [ ] Erros produzem ProblemDetails sem stack trace exposto.
- [ ] Há teste focado para o comportamento novo ou alterado.
