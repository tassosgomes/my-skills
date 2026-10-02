---
name: java
description: "Use em qualquer trabalho Java / Spring Boot: criar serviço ou módulo, endpoint, caso de uso, agregado, camadas e módulos Maven, JPA/Hibernate e Flyway, mensageria RabbitMQ com outbox, configuração e segredos, observabilidade, performance, testes, convenções de código e gate de produção. Este é o padrão do time — aplique-o em vez de decidir caso a caso."
metadata:
  group: java
---

# Padrão Java / Spring Boot

Este documento é a decisão, não o tutorial. Você sabe escrever Java e Spring; o que está aqui é
**qual** das alternativas equivalentes este time usa e **onde** cada coisa mora. Quando o padrão e o
hábito divergirem, o padrão vence. Divergir dele exige dizer por quê no PR.

Boas práticas universais — convenções de nome da Oracle, constructor injection, SOLID, `Optional`
como retorno e não como campo — são pressupostas e não se repetem aqui.

## Stack fechada

| Papel | Escolha | Não use |
|---|---|---|
| Plataforma | Java 25 (LTS), Spring Boot 4.1 (Framework 7, Jakarta EE 11) | Boot 3 em serviço novo |
| Build | Maven multi-módulo com Maven Wrapper; versões só no POM raiz | Gradle, versão declarada em módulo |
| Camadas | Clean Architecture: módulos `domain`, `application`, `api`, um `infra-*` por tecnologia | módulo único, `common`/`shared` genérico |
| API HTTP | `@RestController` por agregado, servlet stack | WebFlux, `RouterFunction` |
| Concorrência | Código síncrono + virtual threads (`spring.threads.virtual.enabled=true`) | reativo, `CompletableFuture` como estilo |
| Casos de uso | Uma classe concreta por caso de uso, anotada `@UseCase` | `Command`/`Query` + dispatcher, interface por caso de uso, "Service" com N métodos |
| Mapeamento | Manual: `static from(...)` no Output, mapper à mão no adapter | ModelMapper, Dozer; MapStruct só com volume justificado |
| Validação | Jakarta Bean Validation no Input, validada na fronteira do caso de uso | `@Valid` no controller como única validação |
| Identificadores | UUIDv7 gerado no domínio (`Ids.newId()`, `uuid-creator`) | `UUID.randomUUID()`, `@GeneratedValue` |
| Tempo | `java.time.Clock` injetado; `Instant` para instantes | `now()` sem `Clock`, `LocalDateTime` para instante |
| Null safety | JSpecify `@NullMarked` + NullAway como erro de compilação | `@Nullable` de outros pacotes, null implícito |
| ORM | Spring Data JPA / Hibernate 7, modelo JPA separado do domínio | anotação JPA no domínio |
| Banco | PostgreSQL | Oracle só em legado ou aprovação explícita |
| Migrations | Flyway, SQL versionado | `ddl-auto=update`/`create`, Liquibase em serviço novo |
| JSON | Jackson 3 (`tools.jackson.*`) | `com.fasterxml.jackson.databind` |
| HTTP de saída | HTTP service interface (`@HttpExchange`) sobre `RestClient` | `RestTemplate`, OpenFeign, WebClient |
| Resiliência | `@Retryable`/`@ConcurrencyLimit` do Spring Framework core; Resilience4j só para circuit breaker medido | `spring-retry` |
| Mensageria | Spring AMQP (`RabbitTemplate`, `@RabbitListener`) + outbox obrigatório | publicar fora do outbox, Spring Cloud Stream |
| Cache | Spring Cache: Caffeine local, Valkey via Spring Data Redis | cache de agregado, serialização JDK |
| Documentação da API | springdoc-openapi 3 | springfox |
| Observabilidade | `spring-boot-starter-opentelemetry` + Micrometer Observation, OTLP | Java agent em paralelo ao starter |
| Logs | SLF4J + Logback, JSON nativo do Boot (`logging.structured.format.console`) | `logstash-logback-encoder`, `java.util.logging`, Log4j direto |
| Teste | JUnit Jupiter 6, AssertJ, Mockito, Datafaker | JUnit 4, Hamcrest como asserção principal |
| Banco em teste | Testcontainers 2 com `@ServiceConnection` | H2, HSQLDB, `@DynamicPropertySource` para container |
| Arquitetura verificada | ArchUnit (`archunit-junit5`) | review manual como única fronteira |
| Formatação | Spotless + palantir-java-format | discussão de estilo em review |
| Boilerplate | `record`; o resto escrito explícito no fonte | Lombok |

Versões são piso, não teto: suba minor/patch à vontade, trate major como decisão. Tudo que o Boot
gerencia herda a versão do `spring-boot-starter-parent` — nunca redeclare. Atualização de
dependência é mudança própria — não suba versão não relacionada junto de uma feature.

## Gates — o que falha sozinho

Nenhuma destas depende de alguém lembrar. Os arquivos estão em [`assets/`](assets/) e vão para a
raiz do projeto.

| Regra | Mecanismo | Arquivo |
|---|---|---|
| `UUID.randomUUID()`, `now()` sem `Clock`, `new Date()` | forbiddenapis no build | `config/forbidden-apis.txt` |
| Jackson 2, `jakarta.transaction.Transactional`, `new RestTemplate()` | forbiddenapis | `config/forbidden-apis.txt` |
| Locale/charset padrão (`toLowerCase()`, `String.format`, `formatted`), `System.out` | forbiddenapis (`jdk-unsafe`, `jdk-system-out`) | `pom.xml` |
| Pacote proibido (Lombok, ModelMapper, Dozer, JUnit 4, H2/HSQLDB, spring-retry, OpenFeign, WebFlux, springfox, logstash encoder) | `maven-enforcer-plugin` | `pom.xml` |
| Java < 25, Maven < 3.9 | `maven-enforcer-plugin` | `pom.xml` |
| Null não declarado em código `@NullMarked` | Error Prone + NullAway como erro | `pom.xml`, `.mvn/jvm.config`, `package-info.java` |
| Formatação | `spotless:check` em `verify` | `pom.xml` |
| `api` importando classe de `infra-*` | não compila: infra é `runtime` no POM do `api` | POM do `api` |
| Fronteiras de pacote, `@UseCase` não-`final` e transacional, controller sem repositório, agregado fora do contrato HTTP, `@Transactional` no `api`, field injection | `mvn verify` | `architecture-tests/` |
| Mapeamento JPA divergente do schema | `ddl-auto=validate` nos testes de integração sobre schema do Flyway | `application.yml` de teste |
| Migration versionada já aplicada foi editada, apagada ou renomeada | script na CI | `assets/ci/check-migrations-immutable.sh` |

`ignoreSignaturesOfMissingClasses` está ligado porque um único arquivo de assinaturas serve todos
os módulos. O efeito colateral: **classe** com nome errado é ignorada em silêncio (método errado
numa classe existente falha). Entrada nova só entra depois de você provar num build que ela falha.
Toda entrada atual foi verificada assim.

Ao banir um pacote, edite o `bannedDependencies` **e** a tabela de stack no mesmo commit; duas
fontes que divergem é o modo de falha que este arquivo existe para evitar.

> **`jdk-unsafe` e mensagens.** `"...".formatted(x)` e `String.format` sem `Locale` quebram o build.
> Em mensagem de exceção use concatenação; onde formatação importa, `String.format(Locale.ROOT, ...)`.

## Estrutura

Um único alvo. Não existe "estrutura para projeto pequeno".

```text
project/
├── pom.xml  mvnw  .mvn/{wrapper/, jvm.config}  config/forbidden-apis.txt
├── domain/               com.company.project.domain.{seedwork, <agregado>}
├── application/          com.company.project.application.{common, port, <agregado>}
├── infra-persistence/    com.company.project.infra.persistence.{<agregado>, outbox, inbox}
│                         + src/main/resources/db/migration/
├── infra-messaging/      com.company.project.infra.messaging.{config, topology, publishing, consuming}
├── api/                  com.company.project.api.{<agregado>, config, error, security, messaging}
│                         + com.company.project.ProjectApplication
├── test-support/         geradores de dados por agregado, configuração de containers
└── architecture-tests/
```

```text
api -----------------> application ---> domain
infra-persistence ---> application ---> domain      (só ports e Outputs)
infra-messaging -----> application
api - - - - - - - - -> infra-*         (scope runtime: component scan, nunca import)
```

- **Pacote por agregado dentro de cada módulo** (`domain.category`, `application.category`,
  `infra.persistence.category`). Pacote por tipo (`entity/`, `repository/`, `dto/`, `service/`) é
  proibido — ele obriga tudo a ser `public`.
- **Visibilidade é fronteira.** Em `infra-*`, entidade JPA, interface Spring Data e adapter são
  package-private; só é `public` o que outro módulo precisa. Spring instancia classes
  package-private normalmente.
- **domain** não tem Spring, Jakarta nem Hibernate no classpath — é o POM que garante, não a disciplina.
- **application** depende só de `domain`, `spring-context`, `spring-tx`, `jakarta.validation-api` e
  `micrometer-observation`. Nada de web, data, AMQP, Jackson.
- **infra-\*** implementa ports; nunca chama caso de uso nem lança exceção da application.
- Testes ficam em `src/test/java` do próprio módulo: `*Test` roda no Surefire (`test`), `*IT` no
  Failsafe (`verify`). Diretório e artifactId em kebab-case; pacote em minúsculas, sem `_`.

| Formato | Quando |
|---|---|
| API simples | Padrão; domínio ainda sem fronteiras internas claras |
| Monolito Modular | Fronteiras claras, deploy único — Spring Modulith |
| Microsserviços | Módulos precisam de deploy, escala ou versão independentes |

Comece pela API simples e evolua quando a dor de acoplamento ou de deploy for real.

## Regras não negociáveis

1. Invariante mora no agregado; o caso de uso só orquestra.
2. Caso de uso em `application.<agregado>`: classe `{CasoDeUso}` com `@UseCase` e `@Transactional`
   (ou `readOnly = true`) e método `execute`, `{CasoDeUso}Input` (record) e Output
   `{Agregado}Output` compartilhado no pacote quando servir a mais de um caso de uso.
3. O repositório retorna `Optional`; quem lança `NotFoundException` é o caso de uso.
4. Toda escrita de agregado passa por `repository.add`/`update`, que grava o estado **e** as
   linhas de outbox na transação do caso de uso. Domínio alterado sem `update` é alteração e evento
   perdidos: não existe dirty checking sobre o objeto de domínio.
5. Caso de uso nunca publica no broker — levanta o evento no agregado, o outbox publica.
6. Validação de input → 400, `NotFoundException` → 404, conflito de `@Version` → 409,
   `DomainValidationException` e `RelatedAggregateException` → 422, qualquer outra → 500. Tudo
   sai como `ProblemDetail` por um único `@RestControllerAdvice` que estende
   `ResponseEntityExceptionHandler`.
7. Controller só traduz HTTP para caso de uso: sem `try/catch`, repositório, `@Transactional` ou regra.
8. Agregado referencia outro agregado somente pelo Id.
9. Agregado não aparece no contrato HTTP.
10. Todo projeto tem `architecture-tests` com as regras do formato escolhido.

## Bootstrap e configuração

**A classe `@SpringBootApplication` só tem o `main`.** Configuração mora em uma classe
`@Configuration(proxyBeanMethods = false)` por concern em `api.config` (`OpenApiConfig`,
`SecurityConfig`, `ClockConfig`, `CorsConfig`), sem `AppConfig` genérico. Infra declara a própria
configuração (`infra.messaging.config`) e é achada pelo component scan.

- `ProjectApplication` fica no pacote raiz `com.company.project`, dentro do módulo Maven `api`: o scan
  padrão alcança `infra` sem `scanBasePackages`, e a evolução para Spring Modulith não move a classe.
- Configuração tipada em `record` com `@ConfigurationProperties("prefixo")` e `@Validated`: falha na
  partida, não no primeiro uso. `@ConfigurationPropertiesScan` no `main`. Nada de `@Value` espalhado.
- Código não pergunta qual é o profile. `@Profile` só para ligar ferramenta de dev (UI do OpenAPI);
  comportamento de produção não depende do nome de um profile.
- Um bean `Clock` (`Clock.systemUTC()`) em `ClockConfig`; teste substitui por `Clock.fixed(...)`.
- OpenAPI: `springdoc.api-docs.enabled=false` por padrão, ligado só no profile `dev`.
- Autorização com constantes de `api.security.Roles`, nunca string solta; CORS por configuração,
  nenhuma origem fixa no código.

## Persistência

- Modelo JPA (`{Agregado}JpaEntity`) separado do domínio, package-private em
  `infra.persistence.<agregado>`. O adapter converte nos dois sentidos; o domínio reidrata por
  `restore(...)`, que não valida nem levanta evento.
- O Boot já converte `camelCase` em `snake_case` (`CamelCaseToUnderscoresNamingStrategy`): não
  repita `@Column(name = ...)`. `@Table(name = "categories")` é explícito porque a classe tem sufixo.
- Id `UUID` sem `@GeneratedValue` + `@Version Long version` (wrapper, nulo no novo): sem `@Version`,
  Id atribuído faz o Spring Data tratar todo `save` como `merge` — um `SELECT` antes de cada `INSERT`.
- Adapter de repositório é `@Transactional(propagation = MANDATORY)`: chamado fora de um caso de uso,
  falha em vez de abrir transação própria.
- `spring.jpa.open-in-view=false` (o default do Boot é `true`); `ddl-auto=validate`.
- Migration é step de deploy (Flyway CLI/Job com o mesmo artefato de migrations), nunca no boot:
  Flyway é dependência `test` no `api`, então a autoconfiguração nem existe no jar de produção.
  Nos testes ela roda sobre o Testcontainers.
- Versão da migration por timestamp: `V202610021430__add_category_is_active.sql`. Sequencial
  (`V7__`) colide entre branches.

| Tipo | Escopo |
|---|---|
| Casos de uso, adapters, `@RabbitListener` | singleton (padrão) — sem estado mutável |
| Estado por requisição/mensagem | parâmetro de método, nunca campo |

Bean Spring é singleton: o equivalente a "scoped" de outras stacks é **não ter estado**. Bean com
campo mutável é bug de concorrência.

## Mensageria

- O `OutboxRelay` (`@Scheduled`) é o único publicador, com publisher confirms.
- Topologia declarada como beans `Declarables`; o `RabbitAdmin` declara na conexão e redeclara na
  reconexão: exchange `topic`, filas quorum, DLX/DLQ por fila e `x-delivery-limit`.
- Routing key é contrato versionado: `{servico}.{agregado}.{evento}.v{n}`.
- Consumidor com ack do container (`AUTO`), `default-requeue-rejected=false`, retry com backoff só
  para falha transitória; falha final vai para a DLQ.
- Consumidor com efeito não idempotente usa inbox.

## Configuração e segredos

`application.yml` só com config não sensível; variáveis de ambiente (`SPRING_DATASOURCE_PASSWORD`,
relaxed binding) no deploy; em desenvolvimento, `spring-boot-docker-compose` sobe o
`docker-compose.yml` e injeta as conexões — sem credencial em arquivo. Nenhuma credencial versionada.

## Observabilidade

- Uma `Observation` por operação de negócio observada à parte, criada pelo `ObservationRegistry`
  (`micrometer-observation` é a única dependência de observabilidade na application). A mesma
  Observation gera span **e** timer.
- Bordas (HTTP, JDBC, `RestClient`, AMQP) vêm da instrumentação do Boot; não crie span manual nelas.
- Nome `{servico}.{agregado}.{evento}` em minúsculas com ponto. Id vai em
  `highCardinalityKeyValue` (só no span), nunca em `lowCardinalityKeyValue` (vira dimensão de métrica).
- Probes do Actuator: liveness só com `livenessState`; readiness com as dependências obrigatórias.
  Actuator em porta de gerência separada, expondo só `health` e `info`; `show-details=never`.
- **`{}` do SLF4J não gera campo estruturado** — é só interpolação. Campo consultável vai por
  `log.atInfo().addKeyValue("categoryId", id).log("Category created")` ou MDC. Exceção como último
  argumento. Log agregado depois de loop, nunca um por item.
- **Nenhum dado pessoal** em log, span, key value, detalhe de health ou payload de erro.
- `spring.lifecycle.timeout-per-shutdown-phase` maior que um lote do outbox e que o processamento
  de uma mensagem.

## Performance

**Só com medição ou hipótese declarada.** Otimização que muda semântica, consistência ou contrato é
regressão. Registre o baseline, mude uma coisa por vez, compare no mesmo ambiente.

- Carregar para alterar → agregado pelo repositório. Tela de leitura → projeção via
  `application.port.{Agregado}Queries`, implementada em `infra.persistence.<agregado>`.
- Ordenação sempre determinística, com desempate por Id.
- `@Modifying` JPQL/`JdbcClient` em massa só em manutenção técnica sem regra nem evento: não
  validam, não levantam evento, não gravam outbox, e deixam o persistence context desatualizado.
- Paginação: o formato no fio pertence ao contrato (`tsg-flow-contract-creator`). `Page`/`Pageable`
  do Spring Data não saem do adapter: a application tem `PageInput`/`PageOutput<T>` próprios.
  Offset por padrão; keyset (`ScrollPosition`/`Window`) quando a página profunda doer.
- Cache guarda o **Output**, nunca o agregado; chave `{servico}:{agregado}:{id}:v{n}`; TTL sempre;
  serializador JSON (o padrão do Redis é serialização JDK).
- `@CacheEvict` dentro de `@Transactional` despeja **antes** do commit, e uma leitura concorrente
  recoloca o valor antigo. O cache manager é transaction-aware
  (`RedisCacheManager.builder(...).transactionAware()`; Caffeine via
  `TransactionAwareCacheManagerProxy`), que adia put/evict para depois do commit.

| Cache | Quando |
|---|---|
| Caffeine | Uma instância, ou divergência de segundos entre pods aceitável |
| Valkey (Spring Data Redis) | Várias instâncias precisam da mesma entrada ou da mesma invalidação |
| `@Cacheable(sync = true)` | Stampede medido em cache miss sob carga |

- HTTP de saída: HTTP service interface em `infra`, atrás de um port em `application.port`.
  Timeouts por grupo em `spring.http.serviceclient.<grupo>.{connect-timeout,read-timeout}` (2 s /
  5 s se o contrato não disser outro). `@Retryable` (ligado por `@EnableResilientMethods`) só em
  operação idempotente, com `maxRetries = 3` e backoff com jitter. 404 do sistema externo vira `Optional.empty()`; outras
  falhas propagam.
- Virtual threads não aumentam a concorrência do banco: o pool do HikariCP é o limite real. Proteja
  o pool com `@ConcurrencyLimit` em vez de aumentá-lo às cegas.
- `@EntityGraph`, `hibernate.default_batch_fetch_size` e `jdbc.batch_size` só onde a medição mostrou.
- Ferramentas: spans de JDBC/Hibernate no OpenTelemetry, JFR + JDK Mission Control, `async-profiler`;
  JMH só para código isolado.

## Testes

| Mudança | Teste mínimo |
|---|---|
| Novo módulo, pacote de camada ou dependência entre módulos | arquitetura |
| Invariante de agregado, value object, restrição de Input | unitário |
| Orquestração de caso de uso | unitário |
| Query, mapeamento JPA, migration, outbox no commit | integração (`*IT`) |
| Consumidor RabbitMQ, inbox | integração com RabbitMQ |
| Rota, status, formato da resposta, ProblemDetail, autorização | end-to-end (`*IT` no `api`) |
| Cliente HTTP de saída com mapeamento ou autenticação própria | teste do cliente real contra servidor HTTP controlado |
| Registro de beans e configuração | contexto real subindo em teste de integração |

- Nome do método `metodo_condicao_resultado` (`execute_whenNameIsBlank_throwsValidation`); classe
  `{Alvo}Test` ou `{Alvo}IT`. `@DisplayName` só quando o nome não couber.
- Um gerador de dados por agregado em `test-support` (Datafaker `pt-BR`), expondo também os
  inválidos (`tooLongName()`); testes só combinam geradores.
- Teste de integração **não** é `@Transactional`: o rollback automático esconde flush, constraint
  no commit, outbox e `AFTER_COMMIT`. Limpe com `TRUNCATE ... CASCADE` antes de cada teste.
- Containers como beans `@ServiceConnection` numa `@TestConfiguration` compartilhada. Cada combinação
  diferente de `@MockitoBean` cria outro contexto — e outros containers. Evite mock em `*IT`.
- `verify` do Mockito só das interações que **são** o comportamento (`add`/`update` chamado ou não).
- Tempo por `Clock.fixed`; nada de `isCloseTo(now)`.
- Cobertura de regra de negócio acima de 80% quando o projeto não definir outro limite.
- End-to-end cobre o contrato HTTP: um caminho feliz por endpoint e os erros do pipeline, não cada
  regra interna. E2E de interface (Playwright) é das skills de frontend.

## Convenções de código

O que os gates não pegam sozinhos:

- Código, nomes, comentários, logs e mensagens de exceção em inglês. Exceção: termos da linguagem
  ubíqua registrados no glossário.
- Sem prefixo `I` e sem sufixo `Impl`. Interface só para port (fronteira com mais de uma
  implementação possível); o adapter tem o nome da tecnologia (`CategoryRepositoryAdapter`,
  `RabbitEventPublisher`).
- `final` em classe de domínio, value object e utilitário; `record` para Input, Output, evento e
  value object. **Bean com `@Transactional`, `@Validated`, `@Cacheable` ou `@Retryable` não é
  `final`**: esses recursos são proxy por subclasse e somem em silêncio numa classe `final`.
- Chamada a método do próprio bean não passa pelo proxy: `@Transactional`/`@Cacheable` num método
  chamado de dentro da mesma classe não tem efeito.
- Construtor do bean package-private, sem `@Autowired`.
- **Todo membro existe no fonte.** Nada de geração de código que o leitor — humano ou LLM — não vê
  no `.java`: o comportamento é o que está escrito. O custo de escrever não justifica esconder.
- Explícito não é completo: acessor só existe se alguém o consome. **Agregado não tem setter** — a
  mudança de estado é um método com nome de negócio (`rename`, `deactivate`) que valida. Coleção
  exposta sai como `List.copyOf(...)`, nunca a referência interna.
- Exceção de negócio é unchecked e usa os tipos do projeto (`DomainException`, `UseCaseException`);
  checked exception não faz rollback por padrão. Não lance `RuntimeException`,
  `IllegalArgumentException` ou `IllegalStateException` para regra de negócio.
- `Optional` só como retorno; parâmetro e campo usam `@Nullable`.
- Limites: até 3 parâmetros (acima disso, record de input), método ~50 linhas, classe ~300 linhas,
  no máximo 2 níveis de aninhamento. Sem flag parameter. Constante nomeada no lugar de número mágico.
- Comente o porquê não óbvio; nunca o que o código já diz.

## Antes de release

Gate agregado — a implementação de cada item está nas seções acima; aqui se verifica que existe.

- [ ] `mvn verify` passou: build, gates, arquitetura, unitários, integração e end-to-end.
- [ ] Traces, métricas, logs e probes configurados para o ambiente alvo.
- [ ] Nenhum dado sensível em log, span, métrica ou payload de erro.
- [ ] Segredos e connection strings fora do repositório.
- [ ] Migrations como step de deploy, smoke test e rollback definidos.
- [ ] Alertas de outbox esgotado e DLQ ativos.
- [ ] Falhas bloqueantes têm evidência e responsável.

## Referências sob demanda

Leia só quando a tarefa for essa:

- [`references/architecture.md`](references/architecture.md) — seedwork, agregado, caso de uso,
  validação, controller, repositório e `@RestControllerAdvice`.
- [`references/persistence.md`](references/persistence.md) — modelo JPA, adapter, Flyway,
  auditoria, consultas de leitura e escrita em lote.
- [`references/messaging.md`](references/messaging.md) — topologia, publicação, consumidor, outbox,
  inbox, retry e DLQ com Spring AMQP.
- [`references/testing.md`](references/testing.md) — geradores, Testcontainers, `@ServiceConnection`,
  end-to-end, regras ArchUnit por formato, Dev Containers.
- [`references/operations.md`](references/operations.md) — Actuator e probes, OpenTelemetry, logs
  estruturados, dado sensível, níveis de log, configuração, container.
- [`references/solution-formats.md`](references/solution-formats.md) — Monolito Modular (Spring
  Modulith) e Microsserviços: fronteiras, contratos e regras extras.
- [`assets/`](assets/) — POM raiz, assinaturas proibidas, `jvm.config`, `architecture-tests` e o gate
  de migrations, prontos para copiar.
