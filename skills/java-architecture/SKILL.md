---
name: java-architecture
description: "Use para mudanças estruturais em Java/Spring Boot: novo serviço, módulo, feature, camadas, pacotes, CQRS, repositories, transações, DTOs ou exception handler global. Não use para tuning de performance, observabilidade isolada ou revisão geral de estilo."
metadata:
  group: java
---

# Arquitetura Java / Spring Boot

Esta é a skill primária quando a mudança altera a estrutura do serviço. O core preserva fronteiras
e hard rules; exemplos completos ficam em `examples/` e devem ser lidos por tópico.

## Modelo obrigatório

Use Clean Architecture/Hexagonal com módulos e responsabilidades claras:

```text
domain -> application -> api
infra  -> domain/application (adapters)
```

- **Domain:** regras de negócio, entidades, value objects e portas; não depende de Spring, JPA ou
  annotations de framework.
- **Application:** use cases, orquestração e transações; não contém detalhes de persistência.
- **API:** controllers finos, contratos HTTP e validação de entrada.
- **Infra:** JPA, repositories, mapeadores e integrações externas.
- **Módulos:** `domain`, `application`, `api` e `infra`, cada um com seu `pom.xml` quando o projeto
  for multi-módulo Maven; organize o código por feature/domínio.

## Regras não negociáveis

1. Use `Command<R>`, `Query<R>` e handlers type-safe; não resolva handlers por nome, string,
   `ApplicationContext.getBean` ou reflexão frágil.
2. Coloque ports/repositories no domínio ou application e adapters JPA na infraestrutura.
3. Nunca exponha entidade JPA fora da infraestrutura; use DTOs e MapStruct.
4. Use `@Transactional` em casos de uso de escrita e `@Transactional(readOnly = true)` em queries.
5. Use `DomainException` para falhas de domínio e `@RestControllerAdvice` com `ProblemDetail`
   (RFC 7807); nunca exponha stack trace.
6. Reserve `Result<T>` para integrações resilientes que modelam falhas esperadas; o fluxo normal
   de domínio usa exceções específicas.
7. Interfaces Java não recebem prefixo `I`; cada classe pública fica em seu próprio arquivo.

## Referências sob demanda

| Necessidade | Recurso |
|---|---|
| entidade, use case, ports e MapStruct | `examples/clean-architecture.md` |
| Command/Query e dispatcher type-safe | `examples/cqrs.md` |
| DomainException e ProblemDetail | `examples/error-handling.md` |
| árvore Maven e organização por feature | `examples/project-structure.md` |

Leia somente os exemplos relativos ao diff. Uma mudança de endpoint normalmente precisa de
`cqrs.md` e `error-handling.md`; não carregue o pacote inteiro.

## Checklist do diff

- [ ] Dependências entre módulos apontam para dentro.
- [ ] Domain continua livre de Spring/JPA.
- [ ] Controller permanece fino e o caso de uso está na Application.
- [ ] Handler é resolvido por tipo/DI, sem lookup nominal.
- [ ] Entidades JPA não vazam para API ou contratos.
- [ ] Transação e validação estão no limite correto.
- [ ] ProblemDetail não expõe stack trace.
- [ ] Há teste focado para o comportamento alterado.
