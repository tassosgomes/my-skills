---
name: dotnet-index
description: "Indice das skills .NET C# / ASP.NET Core: mapa de navegacao entre os 7 modulos de skills consolidados (architecture, code-quality, dependency-config, observability, performance, testing, production-readiness). Usar quando: decidir qual skill consultar; entender a organizacao das skills; mapear uma tarefa especifica ao modulo correto."
---

# Indice de Skills .NET C# / ASP.NET Core

Ponto de entrada para navegacao entre as skills consolidadas.
Use a tabela de roteamento para encontrar rapidamente o modulo correto.

---

## Skills Disponiveis

| # | Skill | Escopo |
|---|-------|--------|
| 1 | **dotnet-architecture** | Clean Architecture, camadas, estrutura de pastas, CQRS nativo, Repository Pattern, FluentValidation, error handling, Result Pattern |
| 2 | **dotnet-code-quality** | Naming conventions, coding standards, async/await, CancellationToken, DI, SOLID, estilo de codigo |
| 3 | **dotnet-dependency-config** | Pacotes recomendados, EF Core (PostgreSQL padrao / Oracle alternativo), Mapster, Unit of Work, connection strings, library authoring (NuGet) |
| 4 | **dotnet-observability** | Health checks (liveness/readiness), Kubernetes probes, metricas, logging integrado com tracing (scopes, ActivitySource) |
| 5 | **dotnet-performance** | EF Core otimizado (AsNoTracking, projections, pagination, bulk), caching (Memory/Redis), HttpClient (IHttpClientFactory, Polly) |
| 6 | **dotnet-testing** | Testes unitarios (xUnit + AwesomeAssertions + Moq), integracao (WebApplicationFactory + Testcontainers PostgreSQL), E2E (Playwright), Dev Containers |
| 7 | **dotnet-production-readiness** | OpenTelemetry (OTLP), logging estruturado, sanitizacao de dados, niveis de log, checklist consolidado de deploy |

---

## Guia Rapido por Tarefa

| Tarefa | Skill |
|--------|-------|
| Criar novo servico / projeto | dotnet-architecture |
| Definir estrutura de pastas | dotnet-architecture |
| Implementar CQRS | dotnet-architecture |
| Implementar Repository Pattern | dotnet-architecture |
| Configurar FluentValidation | dotnet-architecture |
| Error handling / Result Pattern | dotnet-architecture |
| Revisar naming / estilo de codigo | dotnet-code-quality |
| Padroes async/await | dotnet-code-quality |
| Usar CancellationToken | dotnet-code-quality |
| Aplicar SOLID / DI | dotnet-code-quality |
| Configurar EF Core / DbContext | dotnet-dependency-config |
| Setup PostgreSQL / Oracle | dotnet-dependency-config |
| Configurar Mapster | dotnet-dependency-config |
| Gerenciar pacotes NuGet | dotnet-dependency-config |
| Criar biblioteca NuGet | dotnet-dependency-config |
| Configurar connection strings | dotnet-dependency-config |
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
| Configurar OpenTelemetry | dotnet-production-readiness |
| Sanitizar dados em logs | dotnet-production-readiness |
| Preparar deploy para producao | dotnet-production-readiness |
| Validar checklist pre-deploy | dotnet-production-readiness |

---

## Decisoes Arquiteturais

| Decisao | Padrao Oficial | Alternativa |
|---------|---------------|-------------|
| Banco de dados | PostgreSQL | Oracle (legado/excecao) |
| Logging/Tracing | OpenTelemetry (OTLP) | — |
| ORM | Entity Framework Core | — |
| Validacao | FluentValidation | — |
| Mapping | Mapster | — |
| Resiliencia HTTP | Polly | — |
| Testes unitarios | xUnit + AwesomeAssertions | — |
| Testes integracao | Testcontainers (PostgreSQL) | — |
| Testes E2E | Playwright | — |
| CQRS | Nativo (sem MediatR) | — |