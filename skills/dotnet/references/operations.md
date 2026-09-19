# Operação — health checks, telemetria, configuração e infraestrutura local

## Health checks

Tags `live` e `ready` decidem o endpoint; o registro é um por dependência, com `failureStatus` e
`timeout` explícitos.

| Check | Tag | `failureStatus` | Timeout |
|---|---|---|---|
| `self` | `live` | — | — |
| PostgreSQL (`AddNpgSql`) | `ready` | `Unhealthy` | 5 s |
| RabbitMQ (`RabbitMqHealthCheck`) | `ready` | `Unhealthy` | 5 s |
| Valkey (`AddRedis`) | `ready` | `Degraded` | 3 s |
| Outbox (`OutboxHealthCheck`) | `ready` | `Degraded` | — |

`MapHealthChecks` filtra por `check.Tags.Contains(tag)`. Pacotes `AspNetCore.HealthChecks.NpgSql` e
`AspNetCore.HealthChecks.Redis` (funciona com Valkey).

Checks próprios:

- `RabbitMqHealthCheck` — conexão aberta. Devolve `context.Registration.FailureStatus`, **não** um
  status fixo, para que a decisão continue no registro.
- `OutboxHealthCheck` — mensagens com tentativas esgotadas, ou pendente mais antiga que 5 min; os
  números vão em `data`.
- `catch` específico, excluindo `OperationCanceledException`.
- Checks **não fazem log próprio**.
- Resposta pública só com o status: nada de descrição, exceção, host ou dado pessoal.

### Kubernetes

- `startupProbe` e `livenessProbe` em `/health/live`; `readinessProbe` em `/health/ready`.
- Liveness **nunca** aponta para ready — dependência caída reiniciaria o pod em laço.
- Startup não espera migration, porque migration não roda no boot.

## OpenTelemetry

Um único `AddObservabilityConfiguration` em `Api/Extensions/`, com `UseOtlpExporter()`:

| Item | Decisão |
|---|---|
| `service.name` | `OpenTelemetry:ServiceName` — falta é erro de boot, não default silencioso |
| `service.version` | versão do assembly |
| `deployment.environment.name` | `IHostEnvironment.EnvironmentName` |
| Endpoint OTLP | `OTEL_EXPORTER_OTLP_ENDPOINT` do deploy, nunca de arquivo versionado |
| Tracing | ASP.NET Core, HttpClient, EF Core + `AddSource` da fonte do serviço e de `RabbitMqTelemetry` |
| Métricas | ASP.NET Core, HttpClient, Runtime + `AddMeter` da fonte do serviço |
| Ruído | `/health/*` filtrado do tracing de ASP.NET Core |
| Logs | `IncludeScopes` e `IncludeFormattedMessage` ligados |

Pacotes `OpenTelemetry.Extensions.Hosting`, `.Instrumentation.AspNetCore`, `.Instrumentation.Http`,
`.Instrumentation.EntityFrameworkCore`, `.Instrumentation.Runtime` e
`.Exporter.OpenTelemetryProtocol`, **todos na mesma versão**.

## Dados sensíveis

| Dado | Tratamento |
|---|---|
| CPF | `***.***.***-34` |
| CNPJ | `**.***.***/****-34` |
| E-mail | `t***@e***.com` |
| Telefone | `(**) ****-5678` |
| Senha, token, API key, connection string, cartão, dado de saúde | Nunca registrar |

Máscaras em `Application/Common/LogSanitizer.cs` (`MaskCpf`, `MaskEmail`, `MaskPhone`). **Prefira
logar o Id da entidade**; mascarar é para quando o dado é indispensável ao diagnóstico. Vale para
logs, spans, métricas, `data` de health check e respostas de erro.

## Níveis de log por ambiente

| Categoria | Development | Staging | Production |
|---|---|---|---|
| Default | `Debug` | `Information` | `Information` |
| `Microsoft.AspNetCore` | `Information` | `Warning` | `Warning` |
| `Microsoft.EntityFrameworkCore` | `Information` | `Warning` | `Warning` |
| `System.Net.Http.HttpClient` | `Information` | `Warning` | `Error` |
| `Microsoft.Extensions.Diagnostics.HealthChecks` | `Debug` | `Information` | `Warning` |

Nível por situação:

| Situação | Nível |
|---|---|
| Caso de uso concluído (evento de negócio) | `Information` |
| Rejeição esperada (400/404/422) | `Information` |
| Retry, dependência opcional degradada, outbox atrasado | `Warning` |
| 500, mensagem para DLQ | `Error` |
| Configuração obrigatória ausente no boot | `Critical` |
| Detalhe de fluxo | `Debug` |

## Configuração e segredos

| Camada | Contém | Versionado |
|---|---|---|
| `appsettings.json` / `appsettings.{Environment}.json` | Config não sensível: timeouts, feature flags, URLs públicas, nomes de fila, CORS | Sim |
| Variáveis de ambiente (`__`) | Overrides de staging/produção e segredos injetados pelo orquestrador | Não |
| `dotnet user-secrets` | Segredos de desenvolvimento local (no projeto `Api`) | Não |

- Connection string, senha, chave de API, client secret e token **não têm entrada em nenhum
  `appsettings*.json`**, nem com valor vazio. Connection string pode aparecer sem senha.
- Não use `.env` nem pacote para lê-lo.
- Seção tipada com `IOptions<T>`, `const string SectionName`, `ValidateDataAnnotations()` e
  `ValidateOnStart()`.
- Arrays extensos ficam em `appsettings.json`; env vars para valores escalares.
- `appsettings.Local.json` ou similar pessoal está no `.gitignore`.
- Em Kubernetes, segredo entra por `secretKeyRef`, nunca literal no manifesto.

## Container

Dockerfile multi-stage `mcr.microsoft.com/dotnet/sdk:10.0` → `mcr.microsoft.com/dotnet/aspnet:10.0`,
rodando com usuário `app`. `HostOptions.ShutdownTimeout` maior que um lote do outbox e que o
processamento de uma mensagem.

## Infraestrutura local

Um `docker-compose.yml` versionado por repositório; Testcontainers usa as **mesmas tags**.

| Ferramenta | Imagem | Uso |
|---|---|---|
| PostgreSQL | `postgres:18` | Banco relacional padrão |
| MongoDB | `mongo:8` | Só quando o requisito pedir documento |
| Valkey | `valkey/valkey:8.1-alpine` | Cache distribuído (fork BSD-3 do Redis; Redis 7.4+ mudou para RSAL/SSPL/AGPL) |
| RabbitMQ | `rabbitmq:4.3-management-alpine` | Mensageria |

Revisar a cada 6–12 meses, **não a cada projeto**. Tag de major fixa (`postgres:18`), nunca `latest`
nem patch exato sem motivo registrado.

- `name:` do compose e prefixo de `container_name` com o nome do projeto.
- Todo serviço tem `healthcheck`.
- Portas padrão da ferramenta; para dois projetos em paralelo, mude só a porta publicada
  (`"5433:5432"`).
- Serviço não usado pelo projeto é removido do compose.
- Credenciais do compose são só locais.
