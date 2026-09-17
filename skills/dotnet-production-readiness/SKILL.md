---
name: dotnet-production-readiness
description: "Use somente antes de merge/release/deploy, em auditoria pré-produção ou quando o usuário pedir um readiness gate completo para .NET. Não acione para configurar um único log, health check, teste ou query."
metadata:
  group: dotnet
---

# Production Readiness .NET

Gate agregado. A implementação de cada item fica na skill de origem; aqui se verifica que existe,
está integrado e tem evidência.

## Decisões de produção

| Tema | Decisão |
|---|---|
| Telemetria | OpenTelemetry com `UseOtlpExporter()` para traces, métricas e logs; Serilog/ECS não é usado em serviço novo |
| Identidade | `service.name` de `OpenTelemetry:ServiceName`, `service.version` do assembly, `deployment.environment.name` do ambiente |
| Endpoint OTLP | `OTEL_EXPORTER_OTLP_ENDPOINT` do deploy, nunca de arquivo versionado |
| Fontes | `AddSource`/`AddMeter` da fonte do serviço e de `RabbitMqTelemetry.SourceName` |
| Ruído | `/health/*` excluído do tracing de ASP.NET Core |
| Logs | `IncludeScopes` e `IncludeFormattedMessage` ligados no exportador |
| Container | Dockerfile multi-stage: `mcr.microsoft.com/dotnet/sdk:10.0` → `mcr.microsoft.com/dotnet/aspnet:10.0`, usuário `app` |
| Shutdown | `HostOptions.ShutdownTimeout` maior que um lote do outbox e que o processamento de uma mensagem |

## Dados sensíveis

| Dado | Tratamento |
|---|---|
| CPF | `***.***.***-34` |
| CNPJ | `**.***.***/****-34` |
| E-mail | `t***@e***.com` |
| Telefone | `(**) ****-5678` |
| Senha, token, API key, connection string, cartão, dado de saúde | Nunca registrar |

- Máscaras em `Application/Common/LogSanitizer.cs` (`MaskCpf`, `MaskEmail`, `MaskPhone`).
- Prefira logar o Id da entidade; mascarar é para quando o dado é indispensável ao diagnóstico.
- Vale para logs, spans, métricas, `data` de health check e respostas de erro.

## Níveis por ambiente

| Categoria | Development | Staging | Production |
|---|---|---|---|
| Default | `Debug` | `Information` | `Information` |
| `Microsoft.AspNetCore` | `Information` | `Warning` | `Warning` |
| `Microsoft.EntityFrameworkCore` | `Information` | `Warning` | `Warning` |
| `System.Net.Http.HttpClient` | `Information` | `Warning` | `Error` |
| `Microsoft.Extensions.Diagnostics.HealthChecks` | `Debug` | `Information` | `Warning` |

## Limites com outras skills

- Implementar ou corrigir um sinal: `dotnet-observability`.
- Investigar gargalo: `dotnet-performance`.
- Escrever ou diagnosticar teste: `dotnet-testing`.

## Referência sob demanda

`references/deploy-gate.md`: `ObservabilityExtensions` completo e checklist detalhado por área.
Carregue só em gate de release ou auditoria.

## Checklist de saída

- [ ] Build, `ArchitectureTests`, unitários, integração e end-to-end passaram.
- [ ] Traces, métricas, logs e probes configurados para o ambiente alvo.
- [ ] Nenhum dado sensível em logs, spans, métricas ou payloads de erro.
- [ ] Segredos e connection strings fora do repositório.
- [ ] Migrations como step de deploy, smoke test e rollback definidos.
- [ ] Alertas de outbox esgotado e DLQ ativos.
- [ ] Falhas bloqueantes têm evidência e responsável.
