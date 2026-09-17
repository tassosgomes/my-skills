---
name: dotnet-index
description: "Router das skills .NET C# / ASP.NET Core. Use somente quando precisar escolher o módulo correto, combinar dois módulos para uma tarefa ou revisar o roteamento; tarefas comuns devem acionar diretamente a skill do domínio."
metadata:
  group: dotnet
---

# Router de Skills .NET C# / ASP.NET Core

Mapa curto para carregar só o módulo que a tarefa precisa.

## Política de carregamento

1. Escolha uma skill primária pelo objetivo do diff.
2. Adicione no máximo uma secundária quando houver dependência explícita.
3. `dotnet-production-readiness` só em gate de release, deploy ou auditoria.
4. `dotnet-code-quality` só para revisar ou refatorar um diff, não porque código será gerado.
5. `dotnet-testing` só se a tarefa cria, altera ou diagnostica testes.

## Roteamento

| Skill | Escopo |
|---|---|
| **dotnet-architecture** | Camadas, layout `src/`+`tests/`, UUIDv7, agregados e eventos, um caso de uso por classe, repositório por agregado, endpoints Minimal API, envelope e ProblemDetails, API simples / Monolito Modular / Microsserviços |
| **dotnet-code-quality** | Convenções do time: idioma, pasta = namespace, `sealed`, sufixo `Async`, limites de tamanho, cancelamento pós-commit |
| **dotnet-dependency-config** | .NET 10 e versões centralizadas, pacotes permitidos/proibidos, EF Core (PostgreSQL / Oracle), migrations, lifetimes, RabbitMQ com outbox e inbox, configuração e segredos, containers locais |
| **dotnet-observability** | Health checks e probes, ActivitySource/Meter, atributos, logging e níveis |
| **dotnet-performance** | Consultas de leitura, escrita em lote, paginação, cache, HttpClient |
| **dotnet-testing** | xUnit v3, fixtures, Testcontainers, E2E da API, testes de arquitetura com ArchUnitNET, Dev Containers |
| **dotnet-production-readiness** | Gate de deploy: OpenTelemetry, sanitização, níveis por ambiente, checklist |
| **dotnet-program-setup** | `Program.cs` com extensions por concern, pipeline, OpenAPI/Scalar |

## Decisão rápida

| Tarefa | Skill |
|---|---|
| Criar serviço, projeto ou módulo | dotnet-architecture |
| Escolher API simples / Monolito Modular / Microsserviços | dotnet-architecture |
| Criar endpoint ou caso de uso | dotnet-architecture |
| Modelar agregado, value object, evento de domínio ou Id | dotnet-architecture |
| Error handling / ProblemDetails | dotnet-architecture |
| Revisar diff contra convenções de código | dotnet-code-quality |
| Adicionar ou atualizar pacote, SDK, `Directory.*.props` | dotnet-dependency-config |
| Configurar EF Core, migration ou banco | dotnet-dependency-config |
| Publicar/consumir RabbitMQ, outbox, inbox, DLQ | dotnet-dependency-config |
| Configurar appsettings, env vars, user-secrets | dotnet-dependency-config |
| Padronizar containers locais | dotnet-dependency-config |
| Health checks, probes, spans, métricas, logs | dotnet-observability |
| Query lenta, N+1, paginação profunda, cache, HttpClient | dotnet-performance |
| Criar testes unitários, integração ou E2E | dotnet-testing |
| Criar ou ajustar regras de arquitetura (ArchUnitNET) | dotnet-testing |
| Configurar Dev Containers | dotnet-testing |
| Preparar deploy ou validar checklist pré-produção | dotnet-production-readiness |
| Organizar `Program.cs`, CORS, auth, OpenAPI | dotnet-program-setup |

## Combinações permitidas

| Objetivo primário | Secundária possível | Motivo |
|---|---|---|
| Nova feature ou endpoint | `dotnet-testing` | Criar o comportamento e sua regressão |
| Novo serviço ou módulo | `dotnet-testing` | `ArchitectureTests` nasce junto |
| Novo serviço (bootstrap) | `dotnet-program-setup` | Extensions organizadas desde o início |
| EF Core, migration ou integração | `dotnet-architecture` | Manter fronteiras e contratos |
| Evento de domínio publicado ou consumido | `dotnet-architecture` | Agregado levanta o evento; outbox/inbox ficam na dependency-config |
| Bug de performance | `dotnet-dependency-config` | Só quando a causa estiver na infraestrutura |
| Preparação para deploy | `dotnet-observability` ou `dotnet-testing` | Apenas pelo item concreto do gate |

Se nenhuma combinação se encaixar, selecione a skill mais próxima e declare a lacuna.
