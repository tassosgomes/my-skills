# my-skills

Repositório de skills que utilizo no meu dia a dia. Cada skill vive em `skills/<nome>/SKILL.md` e segue o formato com frontmatter (`name`, `description`) seguido do corpo normativo.

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
npx skills add tassosgomes/my-skills/common-mermaid-creator
npx skills add tassosgomes/my-skills/java-architecture
```

---

## Visão geral das skills

> :star: Skills de minha autoria.

### Pipeline de QA

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [flow-qa-orchestrator](#flow-qa-orchestrator) | Orquestrador | Coordena pipeline de QA E2E (entrevista → plano → execução → relatório) |
| :star: [flow-qa-task-runner](#flow-qa-task-runner) | Subagente | Executa testes de uma user story (UI/API/DB) com fidelidade total |
| :star: [flow-qa-report-builder](#flow-qa-report-builder) | Consolidador | Gera relatório final consolidado (Markdown/PDF) da sessão de QA |

### Documentação

| Skill | Tipo | Propósito |
|-------|------|-----------|
| [common-mermaid-creator](#common-mermaid-creator) | Gerador | Gera diagramas Mermaid de alta qualidade a partir de PRDs e especificações de arquitetura |
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
| :star: [dotnet-index](#dotnet-index) | Índice | Mapa de navegação entre os 7 módulos de skills .NET |
| :star: [dotnet-architecture](#dotnet-architecture) | Normativo | Clean Architecture com camadas numeradas, CQRS nativo, Repository Pattern, FluentValidation |
| :star: [dotnet-code-quality](#dotnet-code-quality) | Transversal | Naming conventions, SOLID, async/await, CancellationToken, DI, estilo C# |
| :star: [dotnet-dependency-config](#dotnet-dependency-config) | Baseline | NuGet baseline, EF Core + PostgreSQL, Mapster, Polly, RabbitMQ, NuGet library authoring |
| :star: [dotnet-observability](#dotnet-observability) | Normativo | Health Checks, Kubernetes probes, OpenTelemetry logging integrado a tracing |
| :star: [dotnet-performance](#dotnet-performance) | Code review | EF Core otimizado, IMemoryCache/Redis, HttpClient + Polly, paginação, IAsyncEnumerable |
| :star: [dotnet-production-readiness](#dotnet-production-readiness) | Checklist | OpenTelemetry OTLP, logs JSON estruturados, sanitização de dados sensíveis, deploy checklist |
| :star: [dotnet-testing](#dotnet-testing) | Normativo | xUnit + AwesomeAssertions + Moq, WebApplicationFactory + Testcontainers, Playwright E2E |

### React / Vite / TypeScript

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [react-architecture](#react-architecture) | Normativo | Estrutura de pastas (flat/feature-based), path aliases `@/`, public API via `index.ts` |
| :star: [react-code-quality](#react-code-quality) | Transversal | Naming em inglês, componentes ~300 linhas, TypeScript strict, hooks patterns, props tipadas |
| :star: [react-observability](#react-observability) | Normativo | OpenTelemetry Web, propagação W3C Trace Context, `useTracing` hook, erros globais |
| :star: [react-production-readiness](#react-production-readiness) | Checklist | Agregadora: telemetria, runtime config, erros, CI pipeline, Dockerfile |
| :star: [react-runtime-config](#react-runtime-config) | Normativo | 12-factor runtime config, `window.RUNTIME_ENV`, Dockerfile multi-stage, `envsubst` |
| :star: [react-subpath-deploy](#react-subpath-deploy) | Normativo | Deploy em subpath Kubernetes: Vite base path, React Router basename, Nginx SPA fallback |
| :star: [react-testing](#react-testing) | Normativo | Vitest + React Testing Library + MSW, `renderHook`, `userEvent`, queries semânticas, 70%+ |

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

## common-mermaid-creator

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

**Papel:** Ponto de entrada para as skills .NET — mapeia tarefas aos módulos corretos sem precisar ler todos.

| Módulo | Escopo |
|--------|--------|
| `dotnet-architecture` | Camadas, estrutura de pastas, CQRS, Repository Pattern, error handling |
| `dotnet-code-quality` | Naming, SOLID, async/await, CancellationToken, DI |
| `dotnet-dependency-config` | NuGet baseline, EF Core, Mapster, Polly, messaging, NuGet library |
| `dotnet-observability` | Health checks, Kubernetes probes, OpenTelemetry logging |
| `dotnet-performance` | EF Core queries, caching, HttpClient, paginação |
| `dotnet-production-readiness` | OTLP, logs JSON, sanitização, deploy checklist |
| `dotnet-testing` | xUnit, Testcontainers, Playwright E2E |

**Quando acionar:** ao iniciar qualquer tarefa .NET e querer direcionar para o módulo certo sem abrir todos.

---

## dotnet-architecture

**Papel:** Define padrões obrigatórios de arquitetura e estrutura de projeto para .NET C# / ASP.NET Core.

**Modelo arquitetural:** Clean Architecture com camadas numeradas — `Domain` (puro, sem infraestrutura), `Application` (use cases + FluentValidation), `Api` (controllers finos) e `Infrastructure` (EF Core, adapters).

**Pilares normativos:**
- **CQRS nativo** (sem MediatR) com `ICommand<R>` / `IQuery<R>`, handlers e `Dispatcher` com DI — proibido lookup por nome.
- **Repository Pattern** com interface no `Domain` e implementação no `Infrastructure`; Mapster para mapeamento; nunca expor entidade EF fora do `Infrastructure`.
- **Tratamento de erros** via `IExceptionHandler` + `ProblemDetails` (RFC 9457); Custom Exceptions por domínio; Result Pattern apenas para integrações resilientes.
- **FluentValidation** nos handlers de command/query.

**Quando acionar:** criar microserviço, criar módulo/feature, definir ou revisar camadas, implementar endpoints CQRS.

---

## dotnet-code-quality

**Papel:** Skill transversal aplicada após qualquer geração de código C#. Define HARD RULES e guidelines de estilo.

**Categorias cobertas:**
- **Nomenclatura:** PascalCase (tipos, propriedades), camelCase (variáveis locais, parâmetros), kebab-case (rotas); sem prefixo `I` em interfaces (exceto contratos externos); `is/has/can` para booleanos.
- **async/await:** sempre propagar `CancellationToken`, nunca `.Result`/`.Wait()`, `ConfigureAwait(false)` em libraries.
- **DI:** constructor injection obrigatório; `[FromServices]` proibido em controllers; registrar por interface.
- **Estilo:** guard clauses, máx 2 níveis de aninhamento, responsabilidade única, sem flag params.

**Quando aplicar:** após gerar código, em revisão de PR, ao padronizar naming.

---

## dotnet-dependency-config

**Papel:** Define o baseline de dependências e configuração de infraestrutura para projetos .NET C# / ASP.NET Core.

**Stack baseline:** EF Core + Npgsql (PostgreSQL padrão; Oracle como alternativa suportada), Mapster, FluentValidation, Polly (retry + circuit breaker), RabbitMQ com CloudEvents, `IOptions<T>` para configuração tipada.

**Configurações padronizadas:**
- **EF Core:** `AsNoTracking` como padrão em queries de leitura; migrations versionadas; Unit of Work explícito; interceptors para auditoria.
- **Connection strings** sempre via variável de ambiente; nunca hardcoded.
- **NuGet library authoring:** estrutura de projeto para publicação de packages profissionais.

**Quando acionar:** criar projeto, adicionar DB/cache/messaging, alterar baseline de libs, publicar NuGet.

---

## dotnet-observability

**Papel:** Skill normativa de observabilidade — health checks, logging integrado a tracing e monitoramento para .NET.

**Pilares:**
- **Health Checks** com `AspNetCore.Diagnostics.HealthChecks` — liveness, readiness e startup probes prontos para Kubernetes; checks customizados para regras de negócio e dependências externas.
- **Logging com OpenTelemetry:** scopes de log para correlação com `TraceId`/`SpanId`; campos obrigatórios por evento; sanitização de dados sensíveis (LGPD/PCI-DSS).
- **ActivitySource** para spans customizados em pontos críticos.
- Configuração diferenciada por ambiente (dev/staging/prod).

**Quando acionar:** implementar health checks, configurar probes K8s, integrar logging a tracing, auditoria pré-produção.

---

## dotnet-performance

**Papel:** Guia normativo para revisão de performance — ideal para code review e PR review automático.

**Áreas cobertas:**
- **EF Core:** `AsNoTracking` em leitura, `AsSplitQuery` para coleções múltiplas, Compiled Queries para hot paths, projeções com `Select`, `ExecuteUpdateAsync`/`ExecuteDeleteAsync` para bulk.
- **Caching:** `IMemoryCache` para cache local de processo curto, `IDistributedCache`/Redis para cache distribuído; TTL sempre definido; eviction policies explícitas.
- **HttpClient:** `IHttpClientFactory` obrigatório; Polly para retry e circuit breaker; timeouts explícitos.
- **Paginação eficiente** com cursor ou keyset; evitar `Count()` desnecessário.
- **Streaming** com `IAsyncEnumerable<T>` para grandes volumes.

---

## dotnet-production-readiness

**Papel:** Checklist consolidado de prontidão para produção — bloqueia deploy que não atenda aos requisitos mínimos.

**Pilares:**
- **OpenTelemetry OTLP** como padrão oficial de exportação; `service.name` obrigatório; auto-instrumentações ativas.
- **Logs JSON estruturados** com campos obrigatórios (`timestamp`, `level`, `traceId`, `spanId`, `service`).
- **Sanitização de dados sensíveis** — CPF, email, telefone, tokens nunca aparecem em logs.
- **Níveis de log por ambiente:** `Debug` em dev, `Information` em staging, `Warning` em prod.
- **Checklist de deploy:** type-check, lint, testes, build, health probes, OTLP configurado, secrets via env vars.

**Quando acionar:** preparar serviço para produção, revisar logs, configurar OpenTelemetry, validar deploy.

---

## dotnet-testing

**Papel:** Define a estratégia de testes obrigatória para .NET — pode bloquear geração de código sem teste correspondente.

**Camadas de teste:**
- **Unitários** com xUnit + AwesomeAssertions + Moq; padrão AAA; naming `MethodName_Condition_ExpectedBehavior`; cobertura > 80% para lógica de negócio.
- **Integração** com `WebApplicationFactory` + Testcontainers (PostgreSQL real; nunca SQLite/InMemory para lógica crítica); fixtures reutilizáveis por feature.
- **E2E** com Playwright cobrindo fluxos críticos.

**Infraestrutura de teste:**
- Dev Containers para ambiente isolado e reprodutível.
- `IAsyncLifetime` para setup/teardown de containers.
- Helpers/builders para reduzir setup duplicado.

**Quando acionar:** criar/revisar testes, garantir cobertura, configurar Testcontainers, setup de ambiente.

---

## react-architecture

**Papel:** Define padrões obrigatórios de estrutura de projeto para React + Vite + TypeScript.

**Modelo de organização:** três modos que evoluem com o projeto — flat (pequeno), intermediário (médio) e feature-based (grande). Separação clara entre `shared/` (UI reutilizável) e `features/` (lógica de domínio).

**Pilares normativos:**
- **Path aliases** com `@/` configurados no `vite.config.ts` e `tsconfig.json`; imports absolutos obrigatórios.
- **Convenções:** pastas em `kebab-case`, arquivos de componente em `PascalCase.tsx`.
- **Public API via `index.ts`** — cada feature/módulo exporta apenas o que é público; imports internos proibidos de fora.
- **Agrupamento por domínio** dentro de `features/`; componentes de UI genéricos ficam em `shared/ui/`.

**Quando acionar:** criar projeto React novo, criar feature, refatorar estrutura, revisar PR com mudanças de imports.

---

## react-code-quality

**Papel:** Skill transversal aplicada após qualquer geração de código React + TypeScript. Define HARD RULES e guidelines.

**Categorias cobertas:**
- **Global:** código em inglês, TypeScript strict (`strict: true`), proibido `any` em produção (usar `unknown` + narrowing).
- **Componentes:** máx ~300 linhas; responsabilidade única; nomes em PascalCase; props tipadas com `interface` (não `type` para props de componente).
- **Hooks:** `useState` tipado explicitamente; `useEffect` com cleanup obrigatório; `useCallback`/`useMemo` apenas com justificativa documentada.
- **Imports:** organizados por grupos (externos → internos → relativos); aliases `@/` obrigatórios.
- **Renderização condicional:** sem `&&` com não-booleanos (usar ternário ou componente dedicado).

**Quando aplicar:** após gerar TSX, em revisão de PR, ao padronizar naming.

---

## react-observability

**Papel:** Skill normativa de telemetria e observabilidade para frontend React + TypeScript.

**Pilares:**
- **OpenTelemetry Web:** `WebTracerProvider` com `BatchSpanProcessor` e exporter OTLP HTTP; inicializado apenas em produção (`import.meta.env.PROD`).
- **Propagação W3C Trace Context** para APIs via interceptors de `fetch`/`axios` — correlação E2E com o backend.
- **`useTracing` hook** para spans customizados em componentes e fluxos críticos.
- **Erros globais:** captura automática de `error` e `unhandledrejection`; sanitização de dados sensíveis (LGPD/PCI-DSS) — nunca logar CPF, tokens, cartões.

**Quando acionar:** bootstrapping do projeto, instrumentar fluxos críticos, diagnóstico de UX/performance, checklist de prod readiness.

---

## react-production-readiness

**Papel:** Skill agregadora de validação pré-produção para React + Vite + TypeScript — consolida verificações de todos os módulos React em um checklist único.

**Verifica:**
- Telemetria OpenTelemetry inicializada apenas em prod, `service.name` configurado, propagação W3C ativa.
- Runtime config via `window.RUNTIME_ENV` (não `import.meta.env` para configs entre ambientes).
- Tratamento global de erros e sanitização de dados sensíveis.
- CI pipeline completo: type-check → lint → test → build.
- Dockerfile multi-stage otimizado.
- Cobertura de testes ≥ 70%.

**Quando acionar:** antes de merge, antes de deploy, auditoria de repositório frontend.

---

## react-runtime-config

**Papel:** Define o padrão 12-factor para configuração em runtime e containerização de frontends React + Vite.

**Princípio fundamental:** uma única imagem Docker para todos os ambientes; diferenças entre dev/staging/prod apenas em variáveis de ambiente aplicadas em tempo de execução — sem rebuild da imagem.

**Pilares normativos:**
- **`runtime-env.template.js`** com `envsubst` gerando `runtime-env.js` no start do container.
- **`window.RUNTIME_ENV`** como single source of truth; `runtimeConfig.ts` tipado consumindo essa variável.
- **Proibido** usar `import.meta.env` para configs que variam entre ambientes.
- **Dockerfile multi-stage:** stage Node para build + stage nginx para runtime; script `entrypoint 40-runtime-env.sh` com validação que falha cedo se variável obrigatória estiver ausente.

**Quando acionar:** criar/atualizar Dockerfile, padronizar variáveis por ambiente, onboarding de novo frontend, PR review de infra.

---

## react-subpath-deploy

**Papel:** Configura projetos React + Vite para deploy em subpath no Kubernetes — resolve os três problemas clássicos de SPAs em subpath.

**Problemas resolvidos:**
- **Referência de assets** — `base` no `vite.config.ts` dinâmico via variável de ambiente.
- **Roteamento client-side** — `basename` no React Router configurado para o subpath.
- **Nginx SPA fallback** — `try_files` correto para history API em subpath.

**Artefatos gerados:** `vite.config.ts` atualizado, `nginx.conf.template` com subpath, `Ingress` Kubernetes com múltiplos paths.

**Caso de uso típico:** múltiplas POCs ou serviços compartilhando um único host (`host/poc-01`, `host/poc-02`).

**Quando acionar:** deploy de SPA em subpath, compartilhar host entre projetos, "rodar frontend em `/meu-path`".

---

## react-testing

**Papel:** Define a estratégia de testes obrigatória para React + Vite + TypeScript — pode bloquear geração de código sem teste.

**Stack:** Vitest + React Testing Library + `jest-dom` + MSW.

**Pilares:**
- **Testes de componentes:** padrão AAA; queries semânticas (`getByRole`, `getByLabelText`) — proibido `getByTestId` como primeira opção; `userEvent` para interações (não `fireEvent`).
- **Testes de hooks:** `renderHook` + `act` para hooks com efeitos assíncronos.
- **Mock de API com MSW:** `server/handlers` por feature, reset entre testes (`server.resetHandlers()`); nunca mockar `fetch` diretamente.
- **Formulários** com `react-hook-form`: testar submit, validação e mensagens de erro.
- Cobertura mínima 70%; checklist de CI: lint → type-check → test → build.

**Quando acionar:** criar testes, revisar cobertura, configurar MSW, corrigir bug com teste regressivo.
