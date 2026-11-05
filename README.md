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
npx skills add tassosgomes/my-skills/flow-qa
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
de uma vez (ex.: todo o `tsg-flow`, para não instalar `tsg-flow-next` sem as etapas que ela encadeia).
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

- **PRD ativo:** o `work/*/run-state.json` modificado por último, relido a cada 3 segundos (o
  layout antigo, `tasks/prd-*/flow-state.json`, ainda é lido). Rode o Claude Code na raiz do projeto.
- **Realizado/total:** checkboxes do `tasks.md`.
- **Fase:** `status:` do frontmatter de `<num>_task.md` (`in_progress`, `validating`, `blocked`, `done`).
  Com todas as tasks `done`, mostra integração até o `phase` do `run-state.json` indicar conclusão.
- A faixa some quando não há PRD em orquestração; o botão **Ocultar** a esconde na sessão.

Testes: `claude plugin test mods/flow-progress`. Validação: `claude plugin validate mods/flow-progress`.

---

## Visão geral das skills

> :star: Skills de minha autoria.

### Pipeline TSG de Produto e Implementação

| Skill | Etapa | Propósito |
|-------|-------|-----------|
| :star: [tsg-flow-product](skills/tsg-flow-product/) | Produto | Visão, Domain Map, baseline arquitetural e backlog de capacidades em `docs/product/`, uma etapa por vez |
| :star: [tsg-flow-next](skills/tsg-flow-next/) | Por capacidade | Verifica pré-requisitos, declara a fatia e encadeia domain doc, PRD, contrato, TechSpec e tasks até o plano aprovado |
| :star: [tsg-flow-prd-creator](skills/tsg-flow-prd-creator/) | PRD | Conduz discovery e cria requisitos de produto rastreáveis |
| :star: [tsg-flow-contract-creator](skills/tsg-flow-contract-creator/) | Integration Contracts | Define contratos OpenAPI, AsyncAPI e ODCS para a implementação da feature |
| :star: [tsg-flow-techspec-creator](skills/tsg-flow-techspec-creator/) | TechSpec | Traduz o PRD em fatias, contratos e decisões — backend, frontend ou full-stack |
| :star: [tsg-flow-task-creator](skills/tsg-flow-task-creator/) | Tasks | Gera tasks verticais, rastreáveis e prontas para agentes |

São três pontos de entrada: `tsg-flow-product` (uma vez por produto), `tsg-flow-next` (por
capacidade) e `tsg-flow-orchestrator` (execução, que coordena `tsg-flow-implementer`,
`tsg-flow-validator` e `tsg-flow-integrator`). As demais são etapas que a `next` encadeia.
Artefatos duráveis ficam em `docs/`, os de cada entrega em `work/<cap>-<slug>/`.

> **Em comparação:** [tsg-flow-orchestrator-v2](skills/tsg-flow-orchestrator-v2/) junta os quatro papéis
> da execução numa skill só. Fica fora do grupo `tsg-flow` até a decisão; instale à parte e siga o
> [roteiro de comparação](docs/tsg-flow-orchestrator-v2-eval.md). A `flow-qa` pertence ao pipeline de QA, fora do
TSG Flow.

### Pipeline de QA

| Skill | Tipo | Propósito |
|-------|------|-----------|
| :star: [flow-qa](#flow-qa) | Workflow | Rodada independente de QA: plano a partir dos requisitos, execução UI/API/persistência, evidências e relatório |

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

## flow-qa

**Papel:** QA independente que valida requisitos pelo comportamento observável — o esperado vem do
PRD/TechSpec, nunca do código nem dos testes do implementer. Substitui as três skills `flow-qa-*`
(orchestrator, task-runner, report-builder).

**Fases:** Discover → Plan (`qa_test_plan.md`, casos `CT-NN` amarrados a requisito, aprovado antes
de executar) → Prepare (`qa-evidence/`, `qa_session.json` só com nomes de env vars) → Execute (UI,
API, persistência) → Evaluate (`PASS | FAIL | BLOCKED | NOT_EXECUTED`) → Report (`qa_report.md`).

**Automação de UI:** `none`, `ephemeral` (Playwright dentro de `qa-evidence/`, padrão) ou `persist`
(na suíte já existente do projeto, só quando há valor claro de regressão).

**Regras-chave:** aprovado só com zero `FAIL` e zero `BLOCKED`; retry apenas para falha transitória
de infraestrutura, registrado; nunca altera a aplicação, enfraquece assertions ou sugere correção.
PDF só quando pedido e com a skill `pdf` disponível.

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
