# my-skills

Repositório de skills que utilizo no meu dia a dia. `skills/` é a fonte canônica: cada skill ativa vive em `skills/<nome>/SKILL.md` e segue o formato com frontmatter (`name`, `description`) seguido do corpo normativo. `novas/` é apenas staging para comparação e não deve ser usado como fonte de instalação.

Comece pela [ordem de execução do TSG Flow](docs/tsg-flow-execution-order.md), com rotas para produto
novo, feature isolada e frontend. O [guia de uso](docs/tsg-flow-guide.md) detalha contratos,
retomada e ADRs permanentes em `docs/adr/`. O
[diagrama do fluxo](docs/diagrams/tsg-flow-pipeline.md) mostra a cadeia e o ciclo por task.

---

## Instalação

Para instalar todas as skills deste repositório:

```bash
npx skills add tassosgomes/my-skills
```

Para instalar uma skill específica:

```bash
npx skills add tassosgomes/my-skills/<nome-da-skill>
```

Exemplos:

```bash
npx skills add tassosgomes/my-skills/flow-qa-orchestrator
npx skills add tassosgomes/my-skills/tsg-flow-prd-creator
npx skills add tassosgomes/my-skills/tsg-flow-techspec-creator
npx skills add tassosgomes/my-skills/tsg-flow-task-creator
npx skills add tassosgomes/my-skills/mermaid
npx skills add tassosgomes/my-skills/java-architecture
```

Funciona com qualquer harness suportado pela CLI `skills` (Claude Code, Codex, GitHub Copilot,
Cursor, Windsurf, etc.) — use `-a <agente>` para direcionar um harness específico ou `-a '*'`
para todos os detectados. Repositórios privados funcionam via SSH (`git@github.com:...`) ou
HTTPS com `gh auth login` / `GITHUB_TOKEN`.

### Instalação por grupo

O repositório declara grupos de skills em [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json):
`tsg-flow`, `flow-qa`, `dotnet`, `java` e `react`. Rodando `npx skills add tassosgomes/my-skills`
sem `-s`, o picker interativo agrupa as skills por família e permite selecionar um grupo inteiro
de uma vez (ex.: todo o `tsg-flow`, para não instalar `tsg-flow-implementer` sem `tsg-flow-orchestrator`).
Cada `SKILL.md` do grupo também documenta a família no próprio frontmatter (`metadata.group`) —
é só uma convenção legível para humanos, quem decide o agrupamento real no instalador é o
`marketplace.json`.

O agrupamento é uma conveniência de instalação, não uma dependência obrigatória: `-s <skill>`
continua instalando skills avulsas normalmente.

---

## Visão geral das skills

> :star: Skills de minha autoria.

### Pipeline TSG de Produto e Implementação

| Skill | Etapa | Propósito |
|-------|-------|-----------|
| :star: [tsg-flow-vision-creator](skills/tsg-flow-vision-creator/) | Vision | Define a visão macro e os limites do sistema |
| :star: [tsg-flow-domain-decomposer](skills/tsg-flow-domain-decomposer/) | Domain Map | Decompõe a visão em bounded contexts conceituais |
| :star: [tsg-flow-architecture-baseline](skills/tsg-flow-architecture-baseline/) | Baseline | Define restrições arquiteturais reutilizáveis |
| :star: [tsg-flow-capability-backlog](skills/tsg-flow-capability-backlog/) | Capacidades | Prioriza MVP e evolução por capacidades de negócio |
| :star: [tsg-flow-domain-creator](skills/tsg-flow-domain-creator/) | Domain | Detalha um domínio, suas features e regras de negócio |
| :star: [tsg-flow-prd-creator](skills/tsg-flow-prd-creator/) | PRD | Conduz discovery e cria requisitos de produto rastreáveis |
| :star: [tsg-flow-contract-creator](skills/tsg-flow-contract-creator/) | API Contract | Define o contrato OpenAPI como fonte de verdade |
| :star: [tsg-flow-techspec-creator](skills/tsg-flow-techspec-creator/) | TechSpec | Traduz o PRD em fatias, contratos e decisões — backend, frontend ou full-stack |
| :star: [tsg-flow-task-creator](skills/tsg-flow-task-creator/) | Tasks | Gera tasks verticais, rastreáveis e prontas para agentes |

O fluxo de execução utiliza ainda `tsg-flow-orchestrator`, `tsg-flow-implementer`,
`tsg-flow-validator` e `tsg-flow-integrator`. As skills `flow-qa-*` pertencem ao pipeline de QA
e permanecem com esse namespace nesta etapa.

### Pipeline de QA

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [flow-qa-orchestrator](#flow-qa-orchestrator) | Orquestrador | Coordena pipeline de QA E2E (entrevista → plano → execução → relatório) |
| :star: [flow-qa-task-runner](#flow-qa-task-runner) | Subagente | Executa testes de uma user story (UI/API/DB) com fidelidade total |
| :star: [flow-qa-report-builder](#flow-qa-report-builder) | Consolidador | Gera relatório final consolidado (Markdown/PDF) da sessão de QA |

### Documentação

| Skill | Tipo | Propósito |
|-------|------|-----------|
| [mermaid](#mermaid) | Gerador | Gera diagramas Mermaid de alta qualidade a partir de documentos de requisitos e especificações de arquitetura |
| [find-docs](#find-docs) | Utilitário | Busca documentação atualizada de qualquer lib via Context7 MCP ou CLI |

### Testes

| Skill | Tipo | Propósito |
|-------|------|-----------|
| [test-guide](#test-guide) | Guia | Escreve e audita testes em todas as camadas (unit, integration, E2E) — stack-agnóstico |

### Segurança

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [security-audit-workflow](#security-audit-workflow) | Workflow | Auditoria de segurança stack-agnóstica via sub-agents e Docker |

### APIs

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [restful-api](#restful-api) | Normativo | Padrões REST/HTTP agnósticos de stack: URLs, versionamento, paginação, RFC 9457, OpenAPI 3 |

### Java / Spring Boot

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [java-architecture](#java-architecture) | Normativo | Clean Architecture / Hexagonal, CQRS type-safe, Repository Pattern, multi-módulo Maven |
| :star: [java-code-quality](#java-code-quality) | Transversal | HARD RULES de naming, métodos, DI, exceptions, records, logging |
| :star: [java-dependency-config](#java-dependency-config) | Baseline | Dependências e configurações padrão Spring Boot 3+ (JPA, Flyway, MapStruct, Resilience4j) |
| :star: [java-observability](#java-observability) | Normativo | Logging JSON + OpenTelemetry, tracing com Jaeger, métricas Prometheus, Health Checks |
| :star: [java-performance](#java-performance) | Code review | JPA otimizado, N+1, QueryDSL, caching (Caffeine/Redis), WebClient, HikariCP |
| :star: [java-testing](#java-testing) | Normativo | JUnit 5 + AssertJ + Mockito, Testcontainers, Playwright E2E, Dev Containers |

### .NET / ASP.NET Core

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [dotnet-index](#dotnet-index) | Índice | Mapa de navegação entre os 8 módulos de skills .NET |
| :star: [dotnet-architecture](#dotnet-architecture) | Normativo | Clean Architecture com `src/`+`tests/`, UUIDv7, agregados e eventos, um caso de uso por classe (sem MediatR), endpoints Minimal API, API simples/Monolito Modular/Microsserviços com fronteiras verificadas por ArchUnitNET |
| :star: [dotnet-code-quality](#dotnet-code-quality) | Transversal | Convenções do time: idioma, pasta = namespace, `sealed`, sufixo `Async`, limites de tamanho, cancelamento pós-commit |
| :star: [dotnet-dependency-config](#dotnet-dependency-config) | Baseline | .NET 10 com versões centralizadas, pacotes permitidos e proibidos, EF Core + PostgreSQL, migrations, RabbitMQ com outbox/inbox, configuração e segredos, containers locais |
| :star: [dotnet-observability](#dotnet-observability) | Normativo | Health checks e probes, ActivitySource/Meter, atributos semânticos, logging e níveis |
| :star: [dotnet-performance](#dotnet-performance) | Code review | Consultas de leitura por projeção, escrita em lote, paginação, cache de Output, HttpClient com resilience handler |
| :star: [dotnet-production-readiness](#dotnet-production-readiness) | Checklist | OpenTelemetry OTLP, sanitização de dados sensíveis, níveis por ambiente, gate de deploy |
| :star: [dotnet-program-setup](#dotnet-program-setup) | Normativo | `Program.cs` com extensions por concern, pipeline único, OpenAPI nativo + Scalar |
| :star: [dotnet-testing](#dotnet-testing) | Normativo | xUnit v3 + AwesomeAssertions + Moq + Bogus, Testcontainers, E2E da API, testes de arquitetura com ArchUnitNET |

### React / Vite / TypeScript

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [react](#react) | Normativo | Padrao unico: estrutura e fronteiras de feature (via ESLint), camada de API, estado, formularios, erros, qualidade, testes, runtime config 12-factor, container, subpath e telemetria |

---

## flow-qa-orchestrator

**Papel:** QA Lead que conduz uma sessão completa de testes a partir de um PRD/TechSpec.

**Fluxo (8 fases):**
1. **Recebimento** — lê PRD/techspec e identifica user stories, endpoints, fluxos.
2. **Entrevista** — extrai expectativas do usuário (escopo, ambiente, auth, banco, formato do relatório).
3. **Análise & Planejamento** — monta tasks por user story (`qa_task_NN_<slug>`), identifica dependências e fases (paralelo/sequencial).
4. **Aprovação do plano** — apresenta o plano e aguarda revisão.
5. **Autorização de execução** — exige confirmação explícita antes de iniciar.
6. **Setup** — cria `qa-evidence/`, grava `qa_test_plan.md` em disco (plano aprovado completo) e `qa_session.json` (sem credenciais hardcoded; só nomes de env vars). O plano é sempre persistido antes de qualquer subagente ser disparado.
7. **Execução** — dispara `flow-qa-task-runner` por task, respeitando dependências.
8. **Consolidação** — chama `flow-qa-report-builder` para gerar o relatório final.

**Regras-chave:** não escreve código de produção, não sugere correções, não inicia sem aprovação, não expande escopo por conta própria.

> **Relatório em PDF:** para gerar o `qa_report_consolidated.pdf` o `flow-qa-report-builder` depende da skill `pdf`. Instale-a com `npx skills add pdf` caso queira saída em PDF além de Markdown.

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

## test-guide

**Papel:** Guia normativo para escrita e auditoria de testes em todas as camadas — unit, integration e E2E. Stack-agnóstico.

**Dois modos de uso:**

**Escrita de testes** — aplica critérios de valor antes de escrever qualquer teste:
- Vale testar: lógica com branching, fronteiras de segurança, integridade de dados, tratamento de erros, fluxos críticos, race conditions, edge cases, integrações externas.
- Não vale testar: comportamento de framework, passthrough de validação, mirror tests, cobertura duplicada entre camadas, wiring sem transformação, estrutura estática.
- Limite de 3 mocks por teste; acima disso, reescrever como integração.

**Auditoria de testes** — 3 fases:
1. **Entender** — lê configs de teste, CI e convenções do projeto antes de julgar.
2. **Explorar, contar e classificar** — lê o código de produção para ter contexto, mapeia todos os arquivos de teste, distribui por agentes paralelos, cada um classifica cada caso como **Remover / Manter / Ausente**.
3. **Relatório** — tabela de métricas agregadas, lista de testes a remover (com categoria e motivo), testes críticos ausentes e saúde de mocks.

**Modos de execução da auditoria:** Report only (padrão) · Report + Delete · Report + Scaffold · Full automation.

---

## mermaid

**Papel:** Especialista em diagramas técnicos — gera diagramas Mermaid de alta qualidade a partir de PRDs e especificações de arquitetura.

**Fluxo (9 fases):**
1. **Análise profunda do PRD** — lê o documento completo, detecta idioma, extrai atores, endpoints, fluxos, decisões, contratos e itens fora de escopo.
2. **Avaliação de significância** — filtra candidatos a diagrama por cinco critérios (fluxo principal, parte difícil, decisão arquitetural, contrato público, relação entre componentes). Diagrama elegível apenas se passar em ao menos um critério.
3. **Seleção de tipo** — escolhe `sequenceDiagram`, `flowchart TD`, `flowchart LR`, `classDiagram` ou `erDiagram` conforme o que melhor comunica cada elemento.
4. **Poda e otimização** — limita a 6–8 diagramas (máx. 10); remove redundâncias; divide visões densas (>10 nós).
5. **Preparação de rótulos** — máx. 3 palavras por nó, acentos corretos no idioma do PRD, termos técnicos mantidos em inglês.
6. **Geração do documento** — produz um único arquivo `[output-folder]/[prd-name]-diagrams.md` com todos os diagramas embutidos.
7. **Qualidade Mermaid** — aplica guardrails de sintaxe (sem `\\n` em rótulos, IDs ASCII, aspas em subgraphs com espaços, sem expressões complexas como `min(`, `++`).
8. **Revisão interna** — relê o PRD e o documento gerado, corrige inconsistências silenciosamente antes de gravar.
9. **Validação** — checklist final: idioma, acentos, contagem de diagramas, sem itens inventados, sem itens excluídos.

**Regras-chave:** nunca inventa elementos ausentes no PRD; sem emojis em nenhum lugar; saída sempre em arquivo único; não inclui seções Analysis/Rationale/Design Decisions no final.

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

---

## find-docs

**Papel:** Busca documentação atualizada, referências de API e exemplos de código para qualquer tecnologia, via Context7.

**Método de acesso (prioridade):**
1. **Context7 MCP** — se `mcp__plugin_context7_context7__resolve-library-id` estiver disponível, usa diretamente sem CLI.
2. **ctx7 CLI** — fallback quando o MCP não está disponível (`npx ctx7@latest`).

**Fluxo em dois passos:** resolve o nome da biblioteca para um ID Context7 → consulta a documentação com esse ID.

**Quando usar:** qualquer pergunta sobre sintaxe de API, opções de configuração, migração de versão, debugging de comportamento específico de biblioteca ou setup de CLI — mesmo para libs conhecidas como React, Next.js, Prisma ou Spring Boot, pois o training data pode estar desatualizado.

---

## restful-api

**Papel:** Normativo transversal para design de APIs REST/HTTP — agnóstico de linguagem e framework (aplica-se igualmente a .NET, Java, Node.js, Python, Go, etc.).

**Pilares:**
- **Roteamento:** URLs em inglês e plural, navegabilidade em recursos aninhados (`/customers/{id}/invoices`), kebab-case.
- **Versionamento:** via path (`/v1/`, `/v2/`) com política de deprecação explícita.
- **Paginação:** padrão cursor ou offset com envelope JSON padronizado (`data`, `meta`, `links`).
- **Erros:** RFC 9457 Problem Details — `type`, `title`, `status`, `detail`, `instance`; nunca expor stacktrace.
- **Contrato:** design-first com OpenAPI 3; validação de contrato com Spectral linter.
- **Status codes:** semântica correta (201 Created, 204 No Content, 422 Unprocessable Entity, 409 Conflict).

**Quando acionar:** criar ou revisar endpoints, padronizar contratos entre times, configurar OpenAPI, validar consistência de API.

---

## dotnet-index

**Papel:** Router das skills .NET — mapeia a tarefa ao módulo certo sem carregar todos.

| Módulo | Escopo |
|--------|--------|
| `dotnet-architecture` | Camadas, UUIDv7, agregados, casos de uso, endpoints Minimal API, formatos de solução |
| `dotnet-code-quality` | Convenções do time aplicadas a um diff |
| `dotnet-dependency-config` | Baseline de pacotes, EF Core, migrations, RabbitMQ + outbox/inbox, configuração, containers locais |
| `dotnet-observability` | Health checks, probes, tracing, métricas, logging |
| `dotnet-performance` | Leitura, escrita em lote, paginação, cache, HttpClient |
| `dotnet-production-readiness` | Gate de deploy |
| `dotnet-program-setup` | `Program.cs`, extensions por concern, OpenAPI/Scalar |
| `dotnet-testing` | xUnit v3, Testcontainers, E2E, ArchUnitNET |

**Quando acionar:** só para escolher ou combinar módulos; tarefas comuns acionam a skill do domínio direto.

---

## dotnet-architecture

**Papel:** Decisões de estrutura para serviços .NET C# / ASP.NET Core.

**Modelo arquitetural:** Clean Architecture com `src/` e `tests/` na raiz — `Domain` (SeedWork, agregados, eventos, portas de persistência), `Application` (um caso de uso por pasta), `Api` (endpoints Minimal API, envelope, exception handler) e um projeto de infraestrutura por tecnologia (`Infra.Data`, `Infra.Messaging`).

**Formatos de solução:** API simples (padrão), Monolito Modular (módulos que só se enxergam por `Contracts`) e Microsserviços (banco por serviço, contrato em pacote NuGet).

**Decisões:**
- **Minimal API** com um `{Agregado}Endpoints` por agregado, `MapGroup`, `TypedResults` e handlers estáticos nomeados; controllers não são usados.
- **UUIDv7** (`Guid.CreateVersion7()`) gerado no domínio; `Guid.NewGuid()` e `DateTime.Now` banidos por `BannedSymbols.txt`.
- **Casos de uso** com interface própria, sem MediatR; FluentValidation chamada no caso de uso; mapeamento manual `From{Entidade}`.
- **Repository por agregado** retornando `null`; eventos gravados no outbox pelo `IUnitOfWork`.
- **Erros** em `ProblemDetails` por um único `IExceptionHandler`: 400, 404, 422, 500.
- **Fronteiras** verificadas por `ProjectName.ArchitectureTests` (ArchUnitNET).

**Quando acionar:** criar serviço, módulo, feature, caso de uso ou endpoint; definir ou revisar camadas e agregados.

---

## dotnet-code-quality

**Papel:** Convenções próprias do time aplicadas a um diff; boas práticas universais de C# são pressupostas.

**Convenções:** código, logs e exceções em inglês; pasta = namespace com pastas de agrupamento no plural; classes `sealed`, primary constructor para construtor único de DI e clássico quando há N construtores ou comportamento; sufixo `Async` (inclusive handlers de endpoint); `CancellationToken` obrigatório e por último; até 3 parâmetros, ~50 linhas por método e ~300 por classe; limpeza pós-commit com `CancellationToken.None`; sem `try/catch` de tradução fora do exception handler.

**Quando aplicar:** revisão de PR ou refatoração em que qualidade é objetivo.

---

## dotnet-dependency-config

**Papel:** Baseline de dependências e infraestrutura para projetos .NET.

**Baseline:** .NET 10 (LTS) com `global.json`, `Directory.Build.props` e `Directory.Packages.props`; EF Core + Npgsql (Oracle só por política); Scrutor; FluentValidation; `Microsoft.Extensions.Http.Resilience`; `RabbitMQ.Client` 7 direto; Valkey; OpenTelemetry. Proibidos: AutoMapper, MediatR, FluentAssertions, `Http.Polly`, wrappers de RabbitMQ.

**Convenções:**
- **EF Core:** nomes `snake_case`, Id `uuid` com `ValueGeneratedNever`, `dotnet-ef` fixado, `has-pending-model-changes` na CI, migration fora do boot em produção.
- **Mensageria:** exchange `topic`, filas quorum com DLQ e `x-delivery-limit`, routing key `{servico}.{agregado}.{evento}.v{n}`, publicação só pelo worker de outbox com `FOR UPDATE SKIP LOCKED`, inbox para efeitos não idempotentes.
- **Configuração:** nenhum segredo em `appsettings*.json`, env vars no deploy, `dotnet user-secrets` local, options com `ValidateOnStart`.
- **Containers locais:** PostgreSQL 18, MongoDB 8, Valkey 8.1, RabbitMQ 4.3, as mesmas tags nos Testcontainers.

**Quando acionar:** adicionar pacote, banco, cache, mensageria, migration ou configuração.

---

## dotnet-observability

**Papel:** Sinais operacionais do serviço.

**Pilares:**
- **Health checks:** `/health/live` sem dependência externa e `/health/ready` com as obrigatórias; opcionais `Degraded`; checks próprios de RabbitMQ e outbox.
- **Tracing e métricas:** uma `ActivitySource` e um `Meter` por serviço; atributos semânticos do OpenTelemetry; sem dado pessoal nem Id como dimensão.
- **Logging:** templates estruturados, scopes em consumidores e workers, tabela de níveis por situação.

**Quando acionar:** implementar health checks, probes, spans, métricas ou logs.

---

## dotnet-performance

**Papel:** Decisões de performance aplicadas só com medição.

**Áreas:** leitura por projeção em `IXxxQueries`; `ExecuteUpdate/Delete` só sem regra nem evento; paginação offset com limite e keyset para volume; cache do Output com chave versionada e invalidação pós-commit; HttpClient com `AddStandardResilienceHandler` e retry só em método seguro.

**Quando acionar:** gargalo, latência, query lenta, cache, paginação profunda ou tuning de HttpClient.

---

## dotnet-production-readiness

**Papel:** Gate agregado antes de release ou deploy.

**Pilares:** OpenTelemetry com OTLP e resource completo; máscaras de CPF, CNPJ, e-mail e telefone; níveis de log por ambiente; Dockerfile multi-stage não root; alertas de outbox e DLQ; checklist de telemetria, resiliência, dados, segurança e entrega.

**Quando acionar:** preparar deploy, auditoria pré-produção.

---

## dotnet-program-setup

**Papel:** Mantém `Program.cs` como índice do bootstrap.

**Pilares:** um arquivo de extensão por concern (`AddXxxConfiguration`, `UseXxx`, `MapXxx`); ordem do pipeline só em `UseApplicationPipeline`, que chama `MapApiEndpoints`; policies com constantes `Policies`/`Roles`; OpenAPI nativo 3.1 + Scalar só em Development.

**Quando acionar:** novo serviço, novo concern de bootstrap ou `Program.cs` que cresceu demais.

---

## dotnet-testing

**Papel:** Estratégia de testes .NET.

**Stack:** xUnit v3 no Microsoft.Testing.Platform, AwesomeAssertions, Moq, Bogus, Testcontainers e ArchUnitNET.

**Camadas:**
- **Arquitetura:** regras ArchUnitNET por formato (API simples, Monolito Modular, Microsserviços).
- **Unitários:** agregados e casos de uso isolados, fixtures em camadas.
- **Integração:** caso de uso + repositório + `UnitOfWork` contra PostgreSQL em Testcontainers, com migrations e outbox.
- **E2E da API:** `WebApplicationFactory` + Testcontainers, asserts de contrato e de efeito.

**Organização:** árvore espelhada de `src/`, `Test`/`TestFixture`/`TestDataGenerator`, `DisplayName` + `Trait`, `TestContext.Current.CancellationToken`.

**Quando acionar:** criar, revisar ou diagnosticar testes; criar regras de arquitetura.

---

## react

**Papel:** Padrao unico de React + Vite + TypeScript. Consolida as sete skills anteriores
(`react-architecture`, `react-code-quality`, `react-observability`, `react-production-readiness`,
`react-runtime-config`, `react-subpath-deploy`, `react-testing`).

**Forma:** declara a decisao, nao ensina a implementar. O modelo ja sabe escrever o codigo; a skill
diz qual das alternativas equivalentes este projeto usa e onde cada coisa mora.

**Arquitetura:** derivada do [bulletproof-react](https://github.com/alan2207/bulletproof-react), com
dois desvios deliberados e declarados — config de runtime por `window.RUNTIME_ENV` em vez de
`import.meta.env` (12-factor, imagem imutavel) e zonas de ESLint geradas a partir de `src/features`
em vez de escritas a mao.

**Pilares:**
- **Estrutura unica** (sem niveis "pequeno/medio/grande"): `app/`, `components/`, `config/`,
  `features/`, `hooks/`, `lib/`, `stores/`, `testing/`, `types/`, `utils/`.
- **Tres fronteiras executaveis**, nao convencionais: fluxo unidirecional
  (compartilhado -> features -> app), sem import entre features e sem barrel — todas garantidas por
  `assets/eslint.config.js`.
- **Camada de API:** um arquivo por endpoint em `features/*/api/`, exportando schema Zod, fetcher e
  hook React Query.
- **Estado por natureza do dado:** componente, aplicacao, cache de servidor, formulario e URL — dado
  de servidor nunca em store global.
- **Testes:** integracao como centro de gravidade; MSW como unica fronteira de mock.
- **Runtime e deploy:** uma imagem para todos os ambientes; subpath como propriedade da aplicacao.

**Assets verificados:** `eslint.config.js` (testado contra violacoes reais e contra falso positivo),
`tsconfig.json` (compila em TypeScript 7, sem `baseUrl`), `Dockerfile`, `nginx.conf.template`,
`docker/40-runtime-env.sh` e `ingress.yaml` (validados em container, incluindo deep link em subpath).

**Quando acionar:** qualquer trabalho React — criar projeto ou feature, revisar diff, escrever teste,
containerizar, servir em subpath ou instrumentar.
