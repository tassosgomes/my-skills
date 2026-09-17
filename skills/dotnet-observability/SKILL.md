---
name: dotnet-observability
description: "Use quando a tarefa implementa ou altera health checks, liveness/readiness/startup probes, logging correlacionado, ActivitySource, métricas ou telemetria .NET. Não use para o checklist completo de deploy nem para uma investigação de performance isolada."
metadata:
  group: dotnet
---

# Observabilidade .NET

Instrumentação e sinais operacionais. Registro do OpenTelemetry e gate de produção ficam em
`dotnet-production-readiness`.

## Health checks

| Endpoint | Tag | Contém | Falha significa |
|---|---|---|---|
| `/health/live` | `live` | só `self` (sem dependência externa) | reiniciar o pod |
| `/health/ready` | `ready` | PostgreSQL e RabbitMQ (`Unhealthy`), Valkey e outbox (`Degraded`) | tirar do balanceador |

- Dependência opcional retorna `Degraded`, nunca `Unhealthy`.
- Todo check tem `timeout` (banco e broker 5 s, cache 3 s).
- Check customizado retorna `context.Registration.FailureStatus`, não um status fixo.
- Checks próprios: `RabbitMqHealthCheck` (conexão aberta) e `OutboxHealthCheck` (mensagens com
  tentativas esgotadas ou pendente mais antiga que 5 min; números em `data`).
- Resposta pública só com o status; nada de descrição, exceção, host ou dado pessoal.
- Checks não fazem log próprio.
- Pacotes `AspNetCore.HealthChecks.NpgSql` e `AspNetCore.HealthChecks.Redis` (funciona com Valkey);
  Oracle só em serviço que o usa.

## Kubernetes

- `startupProbe` e `livenessProbe` em `/health/live`; `readinessProbe` em `/health/ready`.
- Liveness nunca aponta para ready.
- Startup não espera migration (migration não roda no boot).

## Tracing e métricas

- Uma `ActivitySource` e um `Meter` por serviço, com o mesmo nome, em
  `Application/Common/{ProjectName}Telemetry.cs` (só `System.Diagnostics`, sem pacote OTel na Application).
- Span manual só para operação de negócio que precisa ser observada à parte; bordas (HTTP, EF,
  HttpClient) vêm da instrumentação.
- Span com falha: `SetStatus(ActivityStatusCode.Error, ex.GetType().Name)` + `AddException(ex)`.
- Nomes de métrica `{servico}.{agregado}.{evento}` (`catalog.categories.created`) com `unit`.
- Atributos: convenções semânticas do OpenTelemetry quando existirem (`messaging.*`, `http.*`,
  `db.*`); atributos de negócio com prefixo do serviço (`catalog.category.id`).
- Tags e dimensões sem dado pessoal; dimensão de métrica nunca é Id.

## Logging

- Template estruturado sempre; interpolação e concatenação proibidas.
- Scope com atributos semânticos em consumidores, workers e jobs.
- Exceção como primeiro argumento do `LogError`/`LogWarning`.
- Log agregado depois de loop, nunca um por item.

| Situação | Nível |
|---|---|
| Caso de uso concluído (evento de negócio) | `Information` |
| Rejeição esperada (400/404/422) | `Information` |
| Retry, dependência opcional degradada, outbox atrasado | `Warning` |
| 500, mensagem para DLQ | `Error` |
| Configuração obrigatória ausente no boot | `Critical` |
| Detalhe de fluxo | `Debug` |

## Referência sob demanda

`references/health-checks.md`: registro dos checks e implementação de `RabbitMqHealthCheck` e
`OutboxHealthCheck`.

## Checklist do diff

- [ ] `/health/live` sem dependência externa; `/health/ready` com as obrigatórias.
- [ ] Opcionais `Degraded`, todo check com timeout e `FailureStatus` do registro.
- [ ] Spans e métricas novos usam a fonte única do serviço e estão registrados no OTel.
- [ ] Nenhum dado pessoal em tag, dimensão, log ou `data` de health check.
- [ ] Logs com template e nível conforme a tabela.
