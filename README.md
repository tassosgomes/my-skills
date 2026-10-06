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
npx skills add tassosgomes/my-skills/java
```

Funciona com qualquer harness suportado pela CLI `skills` (Claude Code, Codex, GitHub Copilot,
Cursor, Windsurf, etc.) — use `-a <agente>` para direcionar um harness específico ou `-a '*'`
para todos os detectados. Repositórios privados funcionam via SSH (`git@github.com:...`) ou
HTTPS com `gh auth login` / `GITHUB_TOKEN`.

### Instalação por grupo

O repositório declara grupos de skills em [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json):
`tsg-flow`, `flow-qa`, `java` e `react`. Rodando `npx skills add tassosgomes/my-skills`
sem `-s`, o picker interativo agrupa as skills por família e permite selecionar um grupo inteiro
de uma vez (ex.: todo o `tsg-flow`, para não instalar `tsg-flow-implementer` sem `tsg-flow-orchestrator`).
Cada `SKILL.md` do grupo também documenta a família no próprio frontmatter (`metadata.group`) —
é só uma convenção legível para humanos, quem decide o agrupamento real no instalador é o
`marketplace.json`.

O agrupamento é uma conveniência de instalação, não uma dependência obrigatória: `-s <skill>`
continua instalando skills avulsas normalmente.

---

## Mods

`mods/` guarda mods do Claude Code (plugins de hooks que desenham painéis, faixas e status na própria
interface). Não são skills: não passam pelo `npx skills`.

| Mod | Propósito |
|-----|-----------|
| [flow-progress](mods/flow-progress) | Faixa acima do prompt com tasks concluídas/total e a fase atual do TSG Flow: ⚙ desenvolvimento, 🔍 review, ⛔ bloqueada, 🔀 integração |

### Instalação dos mods

Pelo marketplace deste repositório, dentro do Claude Code:

```text
/plugin marketplace add tassosgomes/my-skills
/plugin install flow-progress@my-skills
```

Para testar a partir de um clone local, sem instalar:

```bash
claude --plugin-dir mods/flow-progress
```

### flow-progress

Exemplo da faixa: `prd-xyz ████░░░░░░ 4/10 🔍 review (task 5.0)`.

- **PRD ativo:** o `tasks/prd-*/flow-state.json` modificado por último, relido a cada 3 segundos.
  Rode o Claude Code na raiz do projeto que contém `tasks/`.
- **Realizado/total:** checkboxes do `tasks.md`.
- **Fase:** `status:` do frontmatter de `<num>_task.md` (`in_progress`, `validating`, `blocked`, `done`).
  Com todas as tasks `done`, mostra integração até o `phase` do `flow-state.json` indicar conclusão.
- A faixa some quando não há PRD em orquestração; o botão **Ocultar** a esconde na sessão.

Testes: `claude plugin test mods/flow-progress`. Validação: `claude plugin validate mods/flow-progress`.

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
| :star: [tsg-flow-contract-creator](skills/tsg-flow-contract-creator/) | Integration Contracts | Define contratos OpenAPI, AsyncAPI e ODCS para a implementação da feature |
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

### Java / Spring Boot

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [java](#java) | Normativo | Padrão único: Clean Architecture multi-módulo Maven, casos de uso, JPA/Flyway, outbox RabbitMQ, observabilidade, performance, testes e gates executáveis (enforcer, forbiddenapis, NullAway, ArchUnit) |

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

## java

**Papel:** Padrão único para Java 25 / Spring Boot 4.1 — a decisão, não o tutorial. Substitui as sete skills `java-*`.

**Modelo:** Clean Architecture em módulos Maven (`domain`, `application`, `api`, um `infra-*` por tecnologia), pacote por agregado dentro de cada módulo e visibilidade package-private como fronteira. Uma classe concreta por caso de uso (`@UseCase`), sem dispatcher nem interface por caso de uso; modelo JPA separado do domínio; UUIDv7 gerado no domínio; `Clock` injetado; outbox obrigatório com Spring AMQP.

**Gates executáveis (`assets/`):** POM raiz com `maven-enforcer-plugin` (pacotes proibidos), forbiddenapis (`UUID.randomUUID()`, `now()` sem `Clock`, Jackson 2, locale padrão), Error Prone + NullAway sobre JSpecify, Spotless, `architecture-tests` com ArchUnit e o gate de imutabilidade de migrations Flyway — verificados contra JDK 25 e Boot 4.1.1.

**Referências sob demanda:** arquitetura, persistência, mensageria, testes, operação e formatos (Monolito Modular com Spring Modulith, Microsserviços).

---

## find-docs

**Papel:** Busca documentação atualizada, referências de API e exemplos de código para qualquer tecnologia, via Context7.

**Método de acesso (prioridade):**
1. **Context7 MCP** — se `mcp__plugin_context7_context7__resolve-library-id` estiver disponível, usa diretamente sem CLI.
2. **ctx7 CLI** — fallback quando o MCP não está disponível (`npx ctx7@latest`).

**Fluxo em dois passos:** resolve o nome da biblioteca para um ID Context7 → consulta a documentação com esse ID.

**Quando usar:** qualquer pergunta sobre sintaxe de API, opções de configuração, migração de versão, debugging de comportamento específico de biblioteca ou setup de CLI — mesmo para libs conhecidas como React, Next.js, Prisma ou Spring Boot, pois o training data pode estar desatualizado.

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
