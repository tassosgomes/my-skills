---
name: dotnet-architecture
description: "Use para mudanças estruturais em .NET C# / ASP.NET Core: novo serviço, módulo, feature, endpoint, camadas, CQRS, repositories, DTOs ou tratamento global de erros. Não use para tuning de performance, observabilidade isolada ou revisão geral de estilo."
metadata:
  group: dotnet
---

# Arquitetura .NET C# / ASP.NET Core

Esta é a skill primária quando a mudança altera a estrutura do sistema. O core mantém as
fronteiras e as regras que não podem ser esquecidas; exemplos completos ficam em `examples/` e
só devem ser lidos quando a tarefa exigir aquele padrão.

## Modelo obrigatório

Use Clean Architecture/Hexagonal com estas responsabilidades:

```text
API/Services -> Application -> Domain
Infrastructure ----------------> Domain
Tests --------------------------> camadas que exercitam
```

- **Domain:** entidades, value objects, invariantes, regras de negócio e portas; não depende de
  ASP.NET Core, EF Core ou outra infraestrutura.
- **Application:** casos de uso, handlers, DTOs, validação e orquestração; depende de abstrações
  do domínio.
- **API/Services:** controllers finos, contratos HTTP, middleware e autenticação; não contém regra
  de negócio.
- **Infrastructure:** EF Core, repositórios, integrações externas e configurações concretas.
- **Tests:** projetos separados para unitário, integração e E2E.

As pastas numeradas (`1-Services` a `5-Tests`) são uma convenção de navegação, não devem aparecer
em namespaces. As referências de projeto apontam para dentro: API → Application → Domain e
Infrastructure → Domain.

## Regras não negociáveis

1. Mantenha regras de negócio no Domain e contratos de infraestrutura atrás de interfaces.
2. Use CQRS nativo (`ICommand<T>`, `IQuery<T>` e handlers) sem MediatR.
3. Resolva handlers por tipos e DI/assembly scan; nunca por nome de bean, string ou
   `ApplicationContext.GetBean`.
4. Coloque interfaces de repositório no Domain/Application e implementações EF Core na
   Infrastructure; entidades EF não atravessam essa fronteira.
5. Use `IExceptionHandler` global e `ProblemDetails` (RFC 9457) para erros HTTP.
6. Use exceções específicas para falhas de domínio; reserve `Result<T>` para integrações que
   precisam modelar falhas esperadas.
7. Valide commands/queries com FluentValidation antes de executar efeitos colaterais.
8. Propague `CancellationToken` em operações assíncronas e mantenha controllers sem lógica de
   persistência.

## Escolha de formato de solução

Os três formatos abaixo compartilham o mesmo modelo de camadas; o que muda é a fronteira entre
unidades de deploy. Escolha pelo estágio real do projeto, não pelo tamanho esperado no futuro:

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
| árvore de solução, projetos e referências (API simples) | `examples/project-setup.md` |
| entidade, use case e fronteiras | `examples/clean-architecture.md` |
| portas, repositório EF e mapeamento | `examples/repository-pattern.md` |
| command/query, dispatcher, DI e controller | `examples/cqrs.md` |
| exceções, ProblemDetails, middleware e validação | `examples/error-handling.md` |
| estrutura de módulos, fronteira in-process, host único | `examples/modular-monolith.md` |
| estrutura multi-serviço, contrato compartilhado, comunicação entre serviços | `examples/microservices.md` |

Não leia todos os exemplos por padrão. Se a tarefa é apenas criar um endpoint, comece pelo core,
leia `cqrs.md` e `error-handling.md` somente se esses padrões forem usados.

## Checklist do diff

- [ ] A dependência entre camadas aponta para dentro.
- [ ] O Domain continua independente de framework e persistência.
- [ ] O controller é fino e o caso de uso está na Application.
- [ ] O handler é resolvido por tipo/DI, sem lookup nominal.
- [ ] Repositório e entidade EF não vazam para a API.
- [ ] DTOs e validação pertencem ao contrato/caso de uso correto.
- [ ] Erros produzem ProblemDetails sem stack trace exposto.
- [ ] Há teste focado para o comportamento novo ou alterado.
