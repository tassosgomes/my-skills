# Operação — Actuator, telemetria, configuração e infraestrutura local

## Health e probes

Os grupos de probe do Actuator decidem o endpoint; o registro é um `HealthIndicator` por dependência.

```yaml
management:
  server.port: 8081                       # Actuator fora da porta pública
  endpoints.web.exposure.include: health,info
  endpoint.health:
    show-details: never
    probes.enabled: true                  # liga /actuator/health/{liveness,readiness} fora do k8s também
    group:
      liveness.include: livenessState
      readiness.include: readinessState,db,rabbit
```

| Indicador | Grupo | Observação |
|---|---|---|
| `livenessState` | liveness | Nada além dele |
| `db` (DataSource) | readiness | Automático com JDBC |
| `rabbit` | readiness | Automático com Spring AMQP |
| `redis` (Valkey) | nenhum | Cache é opcional: visível em `/actuator/health`, fora do readiness |
| Outbox | nenhum | Métrica e alerta, não health (ver [`messaging.md`](messaging.md)) |

- **O default é o contrário do que parece:** sem `group.readiness.include`, o readiness do Boot
  **não** inclui banco nem broker — só `readinessState`. E `/actuator/health` agrega tudo, inclusive
  o cache opcional: nunca aponte probe para ele.
- O Actuator não tem estado "degradado". Dependência opcional fica fora do grupo de readiness, não
  com status customizado.
- Timeout: o indicador `db` não tem timeout próprio; quem limita é o `connection-timeout` do HikariCP
  (3 s, contra 30 s do padrão). Indicador próprio usa timeout explícito.
- Indicador próprio não loga e não põe exceção nem host no `Health.down()`: com `show-details=never`
  isso não sai na resposta, mas sai no `/actuator/health` interno e em dump.

### Kubernetes

- `startupProbe` e `livenessProbe` em `/actuator/health/liveness`; `readinessProbe` em
  `/actuator/health/readiness`, na porta de gerência.
- Liveness **nunca** inclui dependência — banco caído reiniciaria o pod em laço.
- Startup não espera migration, porque migration não roda no boot.
- `spring.lifecycle.timeout-per-shutdown-phase` (padrão 30 s) maior que um lote do outbox e que o
  processamento de uma mensagem; `terminationGracePeriodSeconds` maior que ele.

## OpenTelemetry

`spring-boot-starter-opentelemetry` no `api`: Micrometer Observation → ponte OpenTelemetry → OTLP.
Sem Java agent: agent e starter juntos duplicam spans.

| Item | Decisão |
|---|---|
| `service.name` | `spring.application.name` — obrigatório; ausência é erro de partida (`@ConfigurationProperties` validado ou checagem no `main`) |
| `service.version` | `build-info` do `spring-boot-maven-plugin` |
| `deployment.environment.name` | `management.opentelemetry.resource-attributes` vindo do deploy |
| Endpoint OTLP | `OTEL_EXPORTER_OTLP_ENDPOINT` / propriedade de ambiente do deploy, nunca de arquivo versionado |
| Tracing | HTTP server/client, JDBC, AMQP pela instrumentação do Boot + Observations do serviço |
| Métricas | Mesmas fontes + JVM; exportadas por OTLP (sem endpoint Prometheus para scrape) |
| Amostragem | `management.tracing.sampling.probability` por ambiente: 1.0 fora de produção |
| Ruído | Requisições do Actuator fora do tracing (`ObservationPredicate` sobre o path) |

- A application usa só `ObservationRegistry` (`micrometer-observation`). Observation pronta é
  `Observation.createNotStarted("catalog.category.import", registry)
  .lowCardinalityKeyValue("source", "csv").observe(() -> ...)`.
- `lowCardinalityKeyValue` vira dimensão de métrica **e** atributo de span; `highCardinalityKeyValue`
  só atributo de span. Id, e-mail, documento: nunca low cardinality.
- `@Observed` em método exige `ObservedAspect` e passa pelo proxy — mesma restrição de `final` e
  auto-invocação do `@Transactional`. Prefira a API programática no caso de uso.
- Contador de negócio que não é duração (itens importados): `MeterRegistry` em `infra`/`api` via
  listener do evento, nunca `MeterRegistry` na application.

## Logs

- `logging.structured.format.console: ecs` (ou `logstash`, conforme o coletor) — JSON nativo do Boot
  no stdout. `traceId`/`spanId` entram pelo MDC automaticamente.
- `{}` do SLF4J só interpola; **não** cria campo. Campo pesquisável:
  `log.atInfo().addKeyValue("categoryId", id).log("Category created")`.
- MDC só para contexto que vale para o request/mensagem inteiro (tenant, `messageId`), sempre em
  try/finally ou `MDC.putCloseable`. Com virtual threads o MDC continua por thread — não vaza, mas
  também não atravessa `@Async` sem `TaskDecorator`.
- `logback-spring.xml` só se o formato estruturado não bastar; nunca appender de arquivo em container.

## Dados sensíveis

| Dado | Tratamento |
|---|---|
| CPF | `***.***.***-34` |
| CNPJ | `**.***.***/****-34` |
| E-mail | `t***@e***.com` |
| Telefone | `(**) ****-5678` |
| Senha, token, API key, connection string, cartão, dado de saúde | Nunca registrar |

Máscaras em `application.common.LogSanitizer` (`maskCpf`, `maskEmail`, `maskPhone`). **Prefira
logar o Id da entidade**; mascarar é para quando o dado é indispensável ao diagnóstico. Vale para
logs, spans, key values, detalhe de health e respostas de erro.

- `toString()` de record com dado pessoal imprime tudo: sobrescreva no record ou nunca logue o
  objeto inteiro.
- `spring.jpa.show-sql` e `org.hibernate.orm.jdbc.bind` em `TRACE` imprimem parâmetros: só em dev local.

## Níveis de log por ambiente

| Categoria | dev | staging | produção |
|---|---|---|---|
| `root` | `INFO` | `INFO` | `INFO` |
| `com.company.project` | `DEBUG` | `INFO` | `INFO` |
| `org.springframework.web` | `INFO` | `WARN` | `WARN` |
| `org.hibernate.SQL` | `DEBUG` | `WARN` | `WARN` |
| `org.springframework.amqp` | `INFO` | `WARN` | `WARN` |
| `org.springframework.boot.actuate.health` | `DEBUG` | `INFO` | `WARN` |

Nível por situação:

| Situação | Nível |
|---|---|
| Caso de uso concluído (evento de negócio) | `INFO` |
| Rejeição esperada (400/404/409/422) | `INFO` |
| Retry, dependência opcional fora, outbox atrasado | `WARN` |
| 500, mensagem para DLQ | `ERROR` |
| Configuração obrigatória ausente no boot | falha de partida (exceção), não log |
| Detalhe de fluxo | `DEBUG` |

## Configuração e segredos

| Camada | Contém | Versionado |
|---|---|---|
| `application.yml` / `application-{profile}.yml` | Config não sensível: timeouts, feature flags, URLs públicas, nomes de fila, CORS | Sim |
| Variáveis de ambiente | Overrides por ambiente e segredos injetados pelo orquestrador | Não |
| `spring-boot-docker-compose` | Conexões de dev, lidas do `docker-compose.yml` | Compose sim, credencial só local |

- Connection string, senha, chave de API, client secret e token **não têm entrada em nenhum
  `application*.yml`**, nem com valor vazio. URL de conexão pode aparecer sem senha.
- Não use `.env` nem `spring.config.import` de arquivo pessoal fora do `.gitignore`.
- Seção tipada: `record` com `@ConfigurationProperties("catalog.outbox")` e `@Validated`, prefixo em
  minúsculas com hífen. `@DurationUnit`/`Duration` para tempo, nunca `long` em milissegundos.
- `spring-boot-configuration-processor` como annotation processor: gera metadados e a IDE passa a
  completar e validar as chaves próprias.
- Lista longa fica em YAML; variável de ambiente para escalar (`CATALOG_OUTBOX_BATCHSIZE`).
- Em Kubernetes, segredo entra por `secretKeyRef`, nunca literal no manifesto.

## Container

- Imagem por Dockerfile multi-stage: build com `eclipse-temurin:25-jdk` e `./mvnw -B verify`;
  runtime `eclipse-temurin:25-jre` com usuário não-root, camadas extraídas por
  `java -Djarmode=tools -jar app.jar extract --layers --launcher` (dependências mudam menos que o
  código, e o cache de camada aproveita isso). `spring-boot:build-image` (Buildpacks) é alternativa
  aceita quando a esteira já usa.
- `-XX:MaxRAMPercentage=75`; nada de `-Xmx` fixo — o limite vem do cgroup.
- Partida lenta medida: AOT cache do JDK 25 (`-XX:AOTCacheOutput` num treino no build,
  `-XX:AOTCache` no runtime). Só com medição de antes e depois.
- Logs em stdout; nenhum arquivo dentro do container.

## Infraestrutura local

Um `docker-compose.yml` versionado por repositório, usado pelo `spring-boot-docker-compose` em dev;
Testcontainers usa as **mesmas tags**.

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
