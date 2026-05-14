# my-skills

Repositório de skills que utilizo no meu dia a dia. Cada skill vive em `skills/<nome>/SKILL.md` e segue o formato com frontmatter (`name`, `description`) seguido do corpo normativo.

---

## Visão geral das skills

### Pipeline de QA

| Skill | Tipo | Propósito |
|-------|------|-----------|
| [flow-qa-orchestrator](#flow-qa-orchestrator) | Orquestrador | Coordena pipeline de QA E2E (entrevista → plano → execução → relatório) |
| [flow-qa-task-runner](#flow-qa-task-runner) | Subagente | Executa testes de uma user story (UI/API/DB) com fidelidade total |
| [flow-qa-report-builder](#flow-qa-report-builder) | Consolidador | Gera relatório final consolidado (Markdown/PDF) da sessão de QA |

### Segurança

| Skill | Tipo | Propósito |
|-------|------|-----------|
| [security-audit-workflow](#security-audit-workflow) | Workflow | Auditoria de segurança stack-agnóstica via sub-agents e Docker |

### Java / Spring Boot

| Skill | Tipo | Propósito |
|-------|------|-----------|
| [java-architecture](#java-architecture) | Normativo | Clean Architecture / Hexagonal, CQRS type-safe, Repository Pattern, multi-módulo Maven |
| [java-code-quality](#java-code-quality) | Transversal | HARD RULES de naming, métodos, DI, exceptions, records, logging |
| [java-dependency-config](#java-dependency-config) | Baseline | Dependências e configurações padrão Spring Boot 3+ (JPA, Flyway, MapStruct, Resilience4j) |
| [java-observability](#java-observability) | Normativo | Logging JSON + OpenTelemetry, tracing com Jaeger, métricas Prometheus, Health Checks |
| [java-performance](#java-performance) | Code review | JPA otimizado, N+1, QueryDSL, caching (Caffeine/Redis), WebClient, HikariCP |
| [java-testing](#java-testing) | Normativo | JUnit 5 + AssertJ + Mockito, Testcontainers, Playwright E2E, Dev Containers |

---

## flow-qa-orchestrator

**Papel:** QA Lead que conduz uma sessão completa de testes a partir de um PRD/TechSpec.

**Fluxo (8 fases):**
1. **Recebimento** — lê PRD/techspec e identifica user stories, endpoints, fluxos.
2. **Entrevista** — extrai expectativas do usuário (escopo, ambiente, auth, banco, formato do relatório).
3. **Análise & Planejamento** — monta tasks por user story (`qa_task_NN_<slug>`), identifica dependências e fases (paralelo/sequencial).
4. **Aprovação do plano** — apresenta o plano e aguarda revisão.
5. **Autorização de execução** — exige confirmação explícita antes de iniciar.
6. **Setup** — cria `qa-evidence/` e `qa_session.json` (sem credenciais hardcoded; só nomes de env vars).
7. **Execução** — dispara `flow-qa-task-runner` por task, respeitando dependências.
8. **Consolidação** — chama `flow-qa-report-builder` para gerar o relatório final.

**Regras-chave:** não escreve código de produção, não sugere correções, não inicia sem aprovação, não expande escopo por conta própria.

---

## flow-qa-task-runner

**Papel:** QA Engineer que executa os testes de **uma única** user story.

**Capacidades:**
- **API** via cURL (request/response logado em `requests.log`).
- **UI** via Playwright (screenshots em momentos críticos, vídeos, console do browser).
- **Banco** via Docker CLI (PostgreSQL/MySQL/MongoDB) para validar persistência.

**Fluxo:** lê `qa_session.json` → planeja casos (happy path + bordas + negativos em `test_plan.md`) → autentica se necessário → executa cada CT → gera `qa_report_task_NN.md`.

**Gate anti-jeitinho (regra absoluta):** proibido modificar testes para forçar PASS, usar `try/catch` silencioso, ignorar assertions, alterar dados no banco para validar, ou sugerir correções de código. Ao falhar: para imediatamente, captura todas as evidências, registra expected vs actual com precisão.

**Retry:** apenas para instabilidade de rede/timeout (máx 2 retentativas, 2s entre elas). Nunca para erro de lógica de negócio.

---

## flow-qa-report-builder

**Papel:** Último passo do pipeline QA — escreve o relatório executivo consolidado.

**Inputs:** `qa_session.json` + lista de `qa_report_task_NN.md` + formato (`markdown` | `pdf` | `ambos`).

**Estrutura do relatório (`qa_report_consolidated.md`):**
- **Sumário executivo** — métricas agregadas + resultado binário (APROVADO só se zero falhas).
- **Features testadas** — tabela com status por task.
- **Escopo excluído** — registra o que foi acordado não testar.
- **Resultado por feature** — casos executados, status, evidências.
- **Detalhes das falhas** — expected vs actual, erro completo, console do browser, caminhos de evidência (screenshot/vídeo/log).
- **Recomendações de investigação** — aponta o que investigar (sem sugerir como corrigir).
- **Índice de evidências** — árvore de arquivos.

**Regras:** nunca omite falha, nunca suaviza linguagem ("falhou" é "falhou"), nunca sugere correções, sempre cita evidências com caminho específico.

---

## security-audit-workflow

**Papel:** Workflow normativo de auditoria de segurança orientado por sub-agents reais com execução em Docker.

**Stacks suportadas:** Java, Node/TS, Python, Go, Rust, .NET, containers, IaC (Terraform/Kubernetes).

**Fluxo (5 fases):**
- **Fase 0 — Reconhecimento:** detecta stack(s) e superfície de ataque (API REST, worker, CLI, persistência, auth, cripto, HTTP outbound). Produz `security_profile.json`.
- **Fase 1 — Scope Resolution:** se houver PRD/TechSpec/OpenAPI, deriva escopo dirigido; senão, fallback para superfície completa com aviso. Precedência: `--scope` manual > docs > full. Produz `scope.json`.
- **Fase 2 — Test Case Design:** cruza escopo com OWASP Top 10 2021 (A01–A10), gera matriz aplicável, casos não aplicáveis ficam `skipped` (não removidos), apresenta `test_plan.md` para aprovação humana.
- **Fase 3 — Sub-agents (paralelo):** sast-agent (Semgrep), sca-agent (Trivy/OWASP DC), secrets-agent (Gitleaks), container-agent (Hadolint + Trivy image), auth-agent, crypto-agent, iac-agent (Checkov). Cada um recebe contrato YAML padronizado em `templates/contracts/`.
- **Fase 4 — Consolidação:** normaliza para SARIF 2.1.0, deduplica cross-tool por `partialFingerprints`, prioriza por `severidade × asset_multiplier × exploitability_factor`, gera `security_report.md` com tiers CRITICAL/HIGH/MEDIUM/LOW.

**Execução zero-install:** ferramentas rodam via imagens Docker oficiais com versões pinadas em `tools/tools.json`, orquestradas pelo wrapper Python `tools/run.py` (multiplataforma).

**Hard rules:** Fase 3 não roda sem `test_plan.md` aprovado (exceto `--auto-approve` em CI/CD); sub-agents nunca travam o pipeline (marcam `NOT_EXECUTED` e seguem); SARIF é o formato canônico; toda execução produz `security_report.md`.

**Estrutura interna:**
```
security-audit-workflow/
├── SKILL.md                 # workflow normativo
├── templates/
│   ├── contracts/           # contratos YAML por sub-agent
│   └── outputs/             # exemplos: security_profile, scope, test_plan, security_report
└── tools/
    ├── README.md
    ├── tools.json           # mapping tool → image → comando
    └── run.py               # wrapper Docker multiplataforma
```

---

## java-architecture

**Papel:** Define padrões obrigatórios de arquitetura, camadas e estrutura de projeto para Spring Boot 3+ / Java 21.

**Modelo arquitetural:** Clean Architecture / Hexagonal com 4 camadas — `domain` (puro, sem Spring/JPA), `application` (use cases + transações), `api` (controllers finos) e `infra` (persistência + adapters).

**Pilares normativos:**
- **Repository Pattern** com port no `domain` e implementação no `infra`; MapStruct obrigatório; nunca expor entidade JPA fora do `infra`.
- **CQRS type-safe** com `Command<R>` / `Query<R>` e `Dispatcher` resolvendo handlers via `GenericTypeResolver` — proibido lookup por nome de bean ou reflexão frágil.
- **Tratamento de erros** via `DomainException` base + `@RestControllerAdvice` retornando `ProblemDetail` (RFC 7807); stacktrace nunca exposto.
- **Result Pattern** restrito a integrações resilientes; fluxo padrão é exception-driven.

**Estrutura multi-módulo Maven:** `domain` → `application` → `api`/`infra` com `pom.xml` por módulo; organização interna por feature/domínio; convenção `OrderEntity` (infra) vs `Order` (domain); proibido prefixo `I` em interfaces.

---

## java-code-quality

**Papel:** Skill transversal aplicada após qualquer geração de código Java. Estabelece HARD RULES numeradas (bloqueantes) e soft guidelines (preferenciais).

**Categorias cobertas:**
- **Global (GR-01..GR-10):** código em inglês, Java 17+, features modernas (records, sealed, switch expressions), `Optional` em vez de `null`, exceptions específicas (nunca `Exception`/`RuntimeException` direto), constructor injection obrigatório, `@Autowired` em field/setter proibido.
- **Naming (NC-01..NC-08):** PascalCase/camelCase/UPPER_SNAKE_CASE, métodos começam com verbo, sem prefixo `I` em interfaces, `is/has` para booleanos.
- **Métodos (MD-01..MD-08):** responsabilidade única, máximo 3 parâmetros, sem flag params, Command-Query Separation, máximo 2 níveis de aninhamento, guard clauses.
- Demais blocos: classes, DI, null handling, exceptions, collections, records, sealed classes, logging, estilo, DTOs, MapStruct, Bean Validation.

**Quando aplicar:** após gerar código, em revisão de PR, ao padronizar naming ou validar clean code.

---

## java-dependency-config

**Papel:** Define o baseline de dependências e configuração de infraestrutura para projetos Spring Boot 3+.

**Stack baseline (pom.xml/build.gradle):** Spring Boot Starter Web + JPA + Validation + Actuator, Micrometer Prometheus, PostgreSQL driver, Flyway, WebClient (WebFlux), Resilience4j (retry + circuit breaker), Spring Cache, MapStruct, springdoc-openapi.

**Configurações padronizadas:**
- **JPA + HikariCP** com pool tunado, `open-in-view: false`, `ddl-auto: validate` em prod.
- **Flyway migrations** em `db/migration` com convenção `V001__descricao.sql`.
- **Profiles** dev / test / prod com overrides via `application-<profile>.yml`.
- **Spotless** para formatação automática.

**Quando acionar:** criação de projeto novo, adição de integração (DB, cache, messaging), configuração de profiles, setup de migrations.

---

## java-observability

**Papel:** Skill normativa de observabilidade — auditoria automática para garantir logging, métricas, tracing e health checks corretos.

**Pilares:**
- **Logging estruturado JSON** com campos obrigatórios (`timestamp`, `level`, `service.name`, `trace.trace_id`, `trace.span_id`, `context`); sanitização de dados sensíveis (LGPD/PCI-DSS); Logback configurado por profile.
- **Tracing distribuído** com OpenTelemetry + Jaeger; correlação `trace_id`/`span_id` propagada via MDC; spans em pontos críticos (controllers, use cases, integrações externas).
- **Métricas customizadas** com Micrometer exportando para Prometheus; counters/timers/gauges para regras de negócio.
- **Health Checks** via Spring Boot Actuator — liveness, readiness e startup probes prontos para Kubernetes; checks customizados para dependências externas.

**Quando acionar:** implementar logging, configurar probes K8s, adicionar métricas, setup de tracing, auditoria pré-produção.

---

## java-performance

**Papel:** Guia normativo para revisão de performance — ideal para code review e PR review automático.

**Áreas cobertas:**
- **JPA/Hibernate:** fetch join para evitar N+1, projeções (interface ou record) para queries de leitura, paginação eficiente (evitar `count` desnecessário), `@EntityGraph` quando aplicável.
- **Queries dinâmicas:** QueryDSL ou Spring Data Specification (proibido string concatenation).
- **Caching:** Caffeine para cache local em processos curtos, Redis para cache distribuído entre instâncias; chaves padronizadas; TTL sempre definido.
- **Batch processing** com `EntityManager` + `flush`/`clear` em janelas controladas.
- **WebClient** com pool de conexões, timeouts explícitos, retry com backoff via Resilience4j.
- **HikariCP** com tamanho de pool dimensionado por carga; nunca usar valores default em produção.

---

## java-testing

**Papel:** Define a estratégia de testes obrigatória — pode bloquear geração de código sem teste correspondente.

**Camadas de teste:**
- **Unitários** com JUnit 5 + AssertJ + Mockito; padrão AAA (Arrange-Act-Assert); naming `methodName_Condition_ExpectedBehavior`; cobertura > 70% para lógica de negócio.
- **Integração** com Spring Boot Test + Testcontainers (PostgreSQL real, nunca H2); fixtures reutilizáveis por feature.
- **E2E** com Playwright cobrindo os fluxos críticos do usuário.

**Infraestrutura de teste:**
- Dev Containers para ambiente isolado e reprodutível.
- `@DynamicPropertySource` para injetar credenciais dos Testcontainers.
- Helpers/builders para reduzir setup duplicado.

**Quando acionar:** criar/revisar testes, garantir cobertura, configurar Testcontainers, setup de ambiente de teste.
