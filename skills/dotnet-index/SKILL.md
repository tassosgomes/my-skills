---
name: dotnet-index
description: "Router das skills .NET C# / ASP.NET Core. Use somente quando precisar escolher o módulo correto, combinar dois módulos para uma tarefa ou revisar o roteamento; tarefas comuns devem acionar diretamente a skill do domínio."
metadata:
  group: dotnet
---

# Router de Skills .NET C# / ASP.NET Core

Este arquivo é um mapa curto. Ele existe para evitar que um agente carregue todos os módulos
.NET para uma tarefa que precisa de apenas um deles.

## Política de carregamento

1. Escolha uma skill primária pelo objetivo do diff.
2. Adicione no máximo uma skill secundária quando houver dependência explícita.
3. Não carregue `dotnet-production-readiness` para uma alteração rotineira.
4. Não carregue `dotnet-code-quality` apenas porque algum código será gerado; use-a para revisar
   o diff ou aplicar as regras de qualidade nele.
5. Não carregue `dotnet-testing` se a tarefa não cria, altera ou diagnostica testes.

Quando a tarefa mistura domínios, preserve o foco: arquitetura decide a estrutura, dependências
configuram a infraestrutura, testes validam o comportamento e production-readiness fecha o gate.

---

## Roteamento

| # | Skill | Escopo |
|---|-------|--------|
| 1 | **dotnet-architecture** | Clean Architecture, camadas, estrutura de pastas, CQRS nativo, Repository Pattern, FluentValidation, error handling, Result Pattern |
| 2 | **dotnet-code-quality** | Naming conventions, coding standards, async/await, CancellationToken, DI, SOLID, estilo de codigo |
| 3 | **dotnet-dependency-config** | Pacotes recomendados, EF Core (PostgreSQL padrao / Oracle alternativo), Mapster, Unit of Work, connection strings, library authoring (NuGet) |
| 4 | **dotnet-observability** | Health checks (liveness/readiness), Kubernetes probes, metricas, logging integrado com tracing (scopes, ActivitySource) |
| 5 | **dotnet-performance** | EF Core otimizado (AsNoTracking, projections, pagination, bulk), caching (Memory/Redis), HttpClient (IHttpClientFactory, Polly) |
| 6 | **dotnet-testing** | Testes unitarios (xUnit + AwesomeAssertions + Moq), integracao (WebApplicationFactory + Testcontainers PostgreSQL), E2E (Playwright), Dev Containers |
| 7 | **dotnet-production-readiness** | OpenTelemetry (OTLP), logging estruturado, sanitizacao de dados, niveis de log, checklist consolidado de deploy |
| 8 | **dotnet-program-setup** | Organizacao do `Program.cs`: metodos de extensao por concern (CORS, autenticacao, Swagger, health checks, pipeline de middlewares) |

## Decisão rápida

| Tarefa | Skill |
|--------|-------|
| Criar novo servico / projeto | dotnet-architecture |
| Definir estrutura de pastas | dotnet-architecture |
| Escolher API simples / Monolito Modular / Microsservicos | dotnet-architecture |
| Implementar CQRS | dotnet-architecture |
| Decidir entre CQRS e Service Pattern simples | dotnet-architecture |
| Implementar Repository Pattern | dotnet-architecture |
| Configurar FluentValidation | dotnet-architecture |
| Error handling / Result Pattern | dotnet-architecture |
| Revisar naming / estilo de codigo | dotnet-code-quality |
| Padroes async/await | dotnet-code-quality |
| Usar CancellationToken | dotnet-code-quality |
| Aplicar SOLID / DI | dotnet-code-quality |
| Configurar EF Core / DbContext | dotnet-dependency-config |
| Setup PostgreSQL / Oracle | dotnet-dependency-config |
| Diagnosticar migration que nao aplica / sintaxe incompativel | dotnet-dependency-config |
| Configurar Mapster | dotnet-dependency-config |
| Gerenciar pacotes NuGet | dotnet-dependency-config |
| Criar biblioteca NuGet | dotnet-dependency-config |
| Configurar connection strings, appsettings ou segredos | dotnet-dependency-config |
| Configurar dotnet user-secrets | dotnet-dependency-config |
| Padronizar containers locais (Postgres/Mongo/Valkey/RabbitMQ) | dotnet-dependency-config |
| Implementar health checks | dotnet-observability |
| Configurar Kubernetes probes | dotnet-observability |
| Logging com scopes / correlacao | dotnet-observability |
| Tracing manual com ActivitySource | dotnet-observability |
| Otimizar queries EF Core | dotnet-performance |
| Implementar caching | dotnet-performance |
| Configurar HttpClient / Polly | dotnet-performance |
| Paginacao de resultados | dotnet-performance |
| Criar testes unitarios | dotnet-testing |
| Criar testes de integracao | dotnet-testing |
| Configurar Testcontainers | dotnet-testing |
| Criar testes E2E (Playwright) | dotnet-testing |
| Configurar Dev Containers | dotnet-testing |
| Implementar OpenTelemetry, logs ou tracing | dotnet-observability |
| Validar OpenTelemetry e logs no deploy | dotnet-production-readiness |
| Sanitizar dados em logs durante implementação | dotnet-observability |
| Preparar deploy para producao | dotnet-production-readiness |
| Validar checklist pre-deploy | dotnet-production-readiness |
| Organizar Program.cs em extensions (CORS, auth, Swagger, etc.) | dotnet-program-setup |
| Program.cs grande demais / dificil de ler | dotnet-program-setup |

---

## Combinações permitidas

| Objetivo primário | Secundária possível | Motivo |
|---|---|---|
| Nova feature ou endpoint | `dotnet-testing` | Criar o comportamento e sua regressão |
| EF Core, migration ou integração | `dotnet-architecture` | Manter fronteiras e contratos |
| Bug de performance | `dotnet-dependency-config` | Só quando a causa estiver na infraestrutura |
| Preparação para deploy | `dotnet-observability` ou `dotnet-testing` | Apenas pelo item concreto do gate |
| Novo serviço/projeto (bootstrap) | `dotnet-program-setup` | Registrar CORS/auth/Swagger/health checks já organizados desde o início |

Se nenhuma combinação se encaixar, selecione somente a skill mais próxima e declare a lacuna.
