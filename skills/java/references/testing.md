# Testes — geradores, containers e arquitetura

Nome de método, sufixo `Test`/`IT` e escolha de camada estão no `SKILL.md`. Aqui está a montagem.

## Onde cada teste mora

Em Maven o teste fica no módulo que ele exercita — não existe árvore `tests/` espelhando `src/`.

| Tipo | Módulo / sufixo | O que exercita | Dependências reais | Dublês |
|---|---|---|---|---|
| Arquitetura | `architecture-tests`, `*Test` | Fronteiras e convenções estruturais | bytecode de todos os módulos | nenhum |
| Unitário | `domain`, `application`, `*Test` | Agregados, value objects, restrições de Input, casos de uso | nenhuma | Mockito para ports |
| Integração | `infra-*`, `*IT` | Adapter + JPA + Flyway; queries; outbox; relay; listeners | PostgreSQL (e RabbitMQ quando preciso) em Testcontainers | só serviços externos ao processo |
| End-to-end | `api`, `*IT` | Rota, binding, serialização, status, ProblemDetail, autorização, persistência | contexto completo + Testcontainers | autenticação de teste |
| Apoio | `test-support` (scope `test` nos outros) | Geradores de dados e `ContainersConfig` | — | — |

`*Test` roda no Surefire (`mvn test`), `*IT` no Failsafe (`mvn verify`). Teste de integração com
sufixo `Test` roda na fase errada e some quando alguém roda só `test`.

## Unitário

- Caso de uso instanciado com `new`, ports com `mock(...)` e `Clock.fixed(...)`. Sem contexto Spring,
  sem `@ExtendWith(SpringExtension.class)`.
- **A validação de `@Valid` não roda sem o proxy.** Teste de restrição do Input usa o `Validator` do
  Jakarta direto (`Validation.buildDefaultValidatorFactory()`); o caso de uso testado com `new`
  assume Input válido.
- `verify` só das interações que **são** o comportamento: `add` chamado uma vez — ou, no caminho de
  falha, `verify(repository, never()).add(any())`.
- Caso inválido em `@ParameterizedTest` com `@MethodSource` que devolve `Arguments.of(input,
  mensagemEsperada)`: entrada e mensagem juntas.
- Teste de agregado confere o evento levantado e a versão do Id (`category.id().version()` = 7).
- AssertJ sempre (`assertThat`, `assertThatThrownBy(...).isInstanceOf(...)`); nada de
  `assertEquals` do JUnit.

## Geradores de dados

Um `{Agregado}Data` por agregado em `test-support`, com `Faker` (`net.datafaker`) em
`Locale.of("pt", "BR")` e semente fixa por execução, respeitando os limites do agregado
(`Category.NAME_MAX_LENGTH`) e expondo os inválidos nomeados (`tooLongName()`, `blankName()`).
Testes **só combinam** geradores; não geram dados próprios nem repetem números mágicos.

## Integração

- `ContainersConfig` em `test-support`: `@TestConfiguration(proxyBeanMethods = false)` com beans
  `@ServiceConnection PostgreSQLContainer` (e `RabbitMQContainer`), tags iguais às do
  `docker-compose.yml`. Importada com `@Import(ContainersConfig.class)` em todo `*IT`.
- O contexto (e os containers) é reaproveitado entre classes **enquanto a configuração for
  idêntica**. Cada combinação diferente de `@MockitoBean`, `@TestPropertySource` ou profile cria
  outro contexto com outros containers. Evite mock em `*IT`; se precisar, concentre-o numa classe
  base comum.
- Testcontainers 2 renomeou artefatos (`testcontainers-postgresql`, `testcontainers-rabbitmq`) e
  pacotes (`org.testcontainers.postgresql.PostgreSQLContainer`). As classes antigas em
  `org.testcontainers.containers.*` ainda existem, deprecadas: use as novas.
- Schema pelo Flyway na partida do contexto; `ddl-auto=validate` — se o mapeamento divergir da
  migration, o contexto não sobe.
- **Nenhum `*IT` é `@Transactional`.** O rollback automático do teste esconde flush, constraint
  avaliada no commit, outbox, `AFTER_COMMIT` e o próprio `MANDATORY` do adapter (o teste já abriu a
  transação). Limpeza por `TRUNCATE ... CASCADE` montado a partir do metamodelo JPA mais as tabelas
  técnicas, no `@BeforeEach` — não de uma lista escrita à mão que envelhece.
- Teste do adapter: execute pelo caso de uso ou por um `TransactionTemplate`; o assert lê com
  `JdbcClient` (ou outra transação), nunca com o mesmo persistence context — o cache de primeiro
  nível esconderia um mapeamento errado.
- Todo teste de caso de uso que levanta evento confere a linha no outbox (`type`, `processed_on`
  nulo); o cenário de falha confere que **nem dados nem outbox** foram gravados.
- Repositório: `Optional.empty()` quando não encontra, paginação em `@ParameterizedTest` e ordenação
  com desempate por Id.
- Consumidor e inbox: entregar **a mesma mensagem duas vezes** e conferir um único efeito. Espera
  assíncrona com Awaitility, nunca `Thread.sleep`.

## End-to-end

`@SpringBootTest(webEnvironment = RANDOM_PORT)` com `RestTestClient` (ou `MockMvcTester` quando não
precisar de servidor real), `@Import(ContainersConfig.class)`:

- Listener e relay desligados por propriedade (`outbox.relay.enabled=false`,
  `spring.rabbitmq.listener.simple.auto-startup=false`): sem broker no teste, o assert é a **linha do
  outbox**, não a publicação.
- Autenticação: `JwtDecoder` de teste que aceita um token montado com as `Roles.*` pedidas; sem
  token, a requisição é anônima — é assim que se testa 401/403.
- `Clock` substituído por `Clock.fixed` num `@TestConfiguration` comum a toda a suíte (senão cada
  variação cria outro contexto).
- Cobre um caminho feliz por endpoint e os erros que dependem do pipeline (400/401/403/404/409/422),
  conferindo `type` e `status` do ProblemDetail — não cada regra interna.

## Cliente HTTP de saída

Teste do adapter real contra servidor HTTP controlado (WireMock ou `MockRestServiceServer` ligado
ao `RestClient.Builder`): confere caminho, headers, autenticação, timeout e o mapeamento de 404 para
`Optional.empty()`.

## Arquitetura

Um módulo `architecture-tests` por projeto, dependendo de todos os módulos de produção. As regras
prontas estão em [`../assets/architecture-tests/`](../assets/architecture-tests/) — copie e troque
`com.company.project`.

- `@AnalyzeClasses(packages = ..., importOptions = DoNotIncludeTests.class)`; regras como
  `@ArchTest static final ArchRule`.
- `UUID.randomUUID()`, `Instant.now()` e Jackson 2 **não** são verificados aqui — o forbiddenapis
  quebra o build antes, e mais barato.
- Regra nova nasce de uma decisão do `SKILL.md`; não crie regra por gosto pessoal.
- Exceção a uma regra é explícita no próprio teste (`.that(...).and().doNotHaveSimpleName(...)`) com
  o motivo em `.because(...)` — nunca removendo a regra nem usando `FreezingArchRule` para esconder
  violação nova.
- Todo módulo de produção é dependência de `architecture-tests`: módulo esquecido é fronteira sem
  verificação.
- **Não desligue `failOnEmptyShould`** (`archunit.properties`): regra cujo `that()` não acha classe
  falha, e isso quase sempre é pacote escrito errado.

No monolito modular, as regras de camada valem por módulo e a fronteira entre módulos é do Spring
Modulith (`ApplicationModules.of(ProjectApplication.class).verify()`) — ver
[`solution-formats.md`](solution-formats.md).

## Dev Containers

Os testes não mudam; muda de onde vem o Docker.

| Ambiente | Containers dos testes |
|---|---|
| Máquina com Docker | Testcontainers |
| Dev Container | Testcontainers via Docker-outside-of-Docker (socket montado) |
| CI | Testcontainers |

Sem acesso a Docker no Dev Container, `TESTCONTAINERS_HOST_OVERRIDE` aponta para o host; nunca troque
o banco por H2 para "rodar sem Docker".
