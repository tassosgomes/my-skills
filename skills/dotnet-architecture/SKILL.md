---
name: dotnet-architecture
description: "Padroes arquiteturais e estrutura de projeto .NET C# / ASP.NET Core: Clean Architecture com camadas numeradas, Repository Pattern com Entity Framework Core, CQRS nativo (sem MediatR) com Commands, Queries, Handlers e Dispatcher, tratamento global de erros (IExceptionHandler, ProblemDetails), Custom Exceptions e Result Pattern, FluentValidation em handlers, estrutura de pastas e dependencias entre projetos. Usar quando: criar novo microservico; criar modulo/feature; implementar endpoints e fluxo CQRS; definir contratos (DTOs/requests/responses); definir ou revisar estrutura de camadas; organizar pastas e projetos; configurar referencias entre projetos."
---

# Padroes Arquiteturais e Estrutura de Projeto .NET C# e ASP.NET Core

## Indice

1. [Estrutura de Pastas](#estrutura-de-pastas)
2. [Dependencias entre Projetos](#dependencias-entre-projetos)
3. [Padroes de Arquitetura](#padroes-de-arquitetura)
4. [Comandos para Criacao da Estrutura](#comandos-para-criacao-da-estrutura)
5. [Checklists](#checklists)
6. [Regras Criticas de Implementacao](#regras-criticas-de-implementacao)

> **Exemplos de codigo completos** ficam em `examples/` e devem ser abertos sob demanda conforme a tarefa:
> - `examples/clean-architecture.md` — entidade de dominio + handler de caso de uso
> - `examples/repository-pattern.md` — `IRepository<T>`, base generica e repositorio especifico
> - `examples/cqrs.md` — interfaces CQRS, dispatcher, commands/queries, DI e controllers
> - `examples/error-handling.md` — global exception handler, custom exceptions, Result pattern, middleware, FluentValidation
> - `examples/project-setup.md` — comandos `dotnet` para criar solution, projetos e referencias

---

# PARTE 1 — ESTRUTURA DE PROJETO

## Estrutura de Pastas

### Visao Geral

Estrutura padrao para projetos .NET seguindo Clean Architecture, com camadas numeradas para facilitar navegacao e representar a hierarquia de dependencias.

```
ProjectName/
├── ProjectName.sln
├── 1-Services/
│   └── ProjectName.API/
│       └── ProjectName.API.csproj
├── 2-Application/
│   └── ProjectName.Application/
│       └── ProjectName.Application.csproj
├── 3-Domain/
│   └── ProjectName.Domain/
│       ├── ProjectName.Domain.csproj
│       ├── Entities/
│       ├── Services/
│       └── Interfaces/
├── 4-Infra/
│   └── ProjectName.Infra/
│       ├── ProjectName.Infra.csproj
│       └── Repositories/
└── 5-Tests/
    ├── ProjectName.UnitTests/
    │   └── ProjectName.UnitTests.csproj
    ├── ProjectName.IntegrationTests/
    │   └── ProjectName.IntegrationTests.csproj
    └── ProjectName.End2EndTests/
        └── ProjectName.End2EndTests.csproj
```

### Descricao das Camadas

#### 1. Services (Camada de Apresentacao)

- **Pasta:** `1-Services/`
- **Tipo:** ASP.NET Core Web API
- **Responsabilidade:**
  - Expor endpoints HTTP
  - Gerenciar controllers
  - Configuracao de middleware
  - Autenticacao e autorizacao
  - Documentacao da API (Swagger)

#### 2. Application (Camada de Aplicacao)

- **Pasta:** `2-Application/`
- **Tipo:** Class Library
- **Responsabilidade:**
  - Casos de uso (Use Cases)
  - Servicos de aplicacao
  - DTOs (Data Transfer Objects)
  - Mapeamentos
  - Validacoes de entrada
  - Orquestracao da logica de negocio

#### 3. Domain (Camada de Dominio)

- **Pasta:** `3-Domain/`
- **Tipo:** Class Library
- **Responsabilidade:**
  - Entidades de dominio
  - Regras de negocio
  - Interfaces de repositorios
  - Servicos de dominio
  - Value Objects
  - Eventos de dominio
- **Subpastas:**
  - `Entities/` — Classes de entidades do dominio
  - `Services/` — Servicos que encapsulam logicas de dominio
  - `Interfaces/` — Contratos e interfaces do dominio

#### 4. Infra (Camada de Infraestrutura)

- **Pasta:** `4-Infra/`
- **Tipo:** Class Library
- **Responsabilidade:**
  - Implementacao de repositorios
  - Acesso a dados (Entity Framework)
  - Configuracoes de banco de dados
  - Integracoes externas
  - Servicos de infraestrutura
- **Subpastas:**
  - `Repositories/` — Implementacoes concretas dos repositorios

#### 5. Tests (Camada de Testes)

- **Pasta:** `5-Tests/`
- **Tipo:** xUnit Test Projects
- **Projetos:**
  - `UnitTests` — Testes unitarios isolados, mocks e stubs
  - `IntegrationTests` — Testes de integracao com banco de dados e servicos
  - `End2EndTests` — Testes de ponta a ponta simulando usuario real

---

## Dependencias entre Projetos

### Fluxo de Dependencias

```
┌─────────────────┐
│   1-Services    │
│      (API)      │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│  2-Application  │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐    ┌─────────────────┐
│    3-Domain     │◄───│    4-Infra      │
└─────────────────┘    └─────────────────┘
          ▲                      ▲
          │                      │
          └──────────────────────┘
                     │
          ┌─────────────────┐
          │    5-Tests      │
          └─────────────────┘
```

### Referencias de Projeto

- **API** → Application
- **Application** → Domain
- **Infra** → Domain
- **UnitTests** → Application + Domain
- **IntegrationTests** → Application + Infra
- **End2EndTests** → API

### Principios Arquiteturais

1. **Inversao de Dependencia**: As camadas externas dependem das internas. O Domain nao possui dependencias externas. Interfaces no Domain sao implementadas na Infra.
2. **Separacao de Responsabilidades**: Cada camada tem uma responsabilidade bem definida. Baixo acoplamento entre as camadas. Alta coesao dentro de cada camada.
3. **Testabilidade**: Estrutura permite testes isolados. Dependencias podem ser mockadas. Testes cobrem todas as camadas.

### Convencoes de Nomenclatura (Camadas)

- **API**: `ProjectName.API`
- **Application**: `ProjectName.Application`
- **Domain**: `ProjectName.Domain`
- **Infra**: `ProjectName.Infra`
- **UnitTests**: `ProjectName.UnitTests`
- **IntegrationTests**: `ProjectName.IntegrationTests`
- **End2EndTests**: `ProjectName.End2EndTests`

---

# PARTE 2 — PADROES ARQUITETURAIS

## Padroes de Arquitetura

> **Por que seguir padroes arquiteturais?**
> - **Reduz complexidade**: Separacao de responsabilidades torna sistema mais compreensivel
> - **Facilita testes**: Camadas bem definidas permitem mocking e isolamento efetivos
> - **Acelera onboarding**: Desenvolvedores familiarizados com padroes se adaptam mais rapido
> - **Reduz acoplamento**: Mudancas em uma camada nao afetam outras
> - **Facilita evolucao**: Arquitetura limpa permite crescimento sustentavel do sistema
> - **Melhora manutenibilidade**: Bugs e mudancas ficam localizados

### Clean Architecture

Regras de negocio vivem no Domain (entidades com comportamento e invariantes encapsuladas). A Application orquestra casos de uso via handlers, dependendo de abstracoes do Domain — nunca o contrario.

→ Template completo em `examples/clean-architecture.md`.

### Repository Pattern

Abstrai o acesso a dados atras de `IRepository<T>` generico, com implementacao base sobre Entity Framework Core e repositorios especificos para queries de dominio. Use `AsNoTracking` em consultas somente leitura.

→ Template completo em `examples/repository-pattern.md`.

### CQRS Nativo (Sem MediatR)

Separa comandos (escrita) de queries (leitura) com interfaces proprias (`ICommand<T>`, `IQuery<T>`, `ICommandHandler<,>`, `IQueryHandler<,>`) e um `Dispatcher` nativo que resolve handlers via DI por reflection — sem dependencia do MediatR. Handlers sao registrados automaticamente com Scrutor (`Scan`).

→ Interfaces, dispatcher, commands/queries, registro no DI e uso em controllers em `examples/cqrs.md`.

### Tratamento de Erros

Centraliza falhas via `IExceptionHandler` global (ASP.NET Core 8+) traduzindo excecoes em `ProblemDetails`. Custom exceptions herdam de `DomainException`; o `Result<T>` pattern modela sucesso/falha sem excecoes em operacoes criticas. Validacao com FluentValidation nos handlers.

→ Global handler, custom exceptions, Result pattern, middleware de logging e FluentValidation em `examples/error-handling.md`.

---

## Comandos para Criacao da Estrutura

Sequencia de comandos `dotnet` CLI para criar a solution, os 7 projetos das camadas e configurar as referencias entre eles.

→ Comandos completos em `examples/project-setup.md`.

---

## Checklists

### Clean Architecture

- [ ] Domain layer isolada sem dependencias externas
- [ ] Application layer com handlers CQRS
- [ ] Infrastructure layer com implementacoes concretas
- [ ] Dependency Inversion respeitado
- [ ] Regras de negocio no dominio

### Repository Pattern

- [ ] `IRepository<T>` generico definido
- [ ] Implementacao base com Entity Framework Core
- [ ] Repositorios especificos quando necessario
- [ ] DbContext configurado com Unit of Work
- [ ] Queries otimizadas com `AsNoTracking` para leitura

### CQRS Nativo

- [ ] Interfaces `ICommand<T>` e `IQuery<T>` definidas
- [ ] `ICommandHandler<T,R>` e `IQueryHandler<T,R>` implementados
- [ ] Dispatcher nativo configurado no DI
- [ ] Handlers registrados automaticamente
- [ ] Logging estruturado nos handlers
- [ ] Validation pipeline implementado

### Tratamento de Erros

- [ ] Global exception handler configurado
- [ ] Custom exceptions por dominio
- [ ] Result pattern para operacoes criticas
- [ ] Logging estruturado de erros
- [ ] Validation pipeline automatico
- [ ] Problem Details padronizado

### Validacao

- [ ] FluentValidation configurado
- [ ] Validators por comando/query
- [ ] Pipeline behavior para validacao
- [ ] Mensagens de validacao em ingles
- [ ] Validation exceptions customizadas

### Estrutura de Projeto

- [ ] Camadas numeradas (1-Services a 5-Tests)
- [ ] Referencias de projeto corretas
- [ ] Namespaces seguindo convencao
- [ ] Domain sem dependencias externas
- [ ] Pastas internas organizadas

---

## Regras Criticas de Implementacao

1. **Namespaces Limpos**: Jamais inclua os prefixos numéricos das pastas (ex: `1-`, `2-`) nos namespaces.
   - Correto: `namespace ProjectName.Application.UseCases`
   - Incorreto: `namespace ProjectName._2_Application.UseCases`

2. **Bibliotecas Obrigatórias**:
   - Para DI Scan: Instalar `Scrutor` (`dotnet add package Scrutor`).
   - Para Validação: Instalar `FluentValidation.DependencyInjectionExtensions`.
   - Para EF Core: Instalar `Microsoft.EntityFrameworkCore.Design`.

3. **Padrão UnitOfWork**:
   - A interface `IUnitOfWork` deve expor apenas `Task<int> SaveChangesAsync(CancellationToken ct)`.
   - A implementação deve injetar o `AppDbContext`.
