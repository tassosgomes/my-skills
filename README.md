# my-skills

Repositório de skills que utilizo no meu dia a dia. Cada skill vive em `skills/<nome>/SKILL.md` e segue o formato com frontmatter (`name`, `description`) seguido do corpo normativo.

---

## Visão geral das skills

| Skill | Tipo | Propósito |
|-------|------|-----------|
| [flow-qa-orchestrator](#flow-qa-orchestrator) | Orquestrador | Coordena pipeline de QA E2E (entrevista → plano → execução → relatório) |
| [flow-qa-task-runner](#flow-qa-task-runner) | Subagente | Executa testes de uma user story (UI/API/DB) com fidelidade total |
| [flow-qa-report-builder](#flow-qa-report-builder) | Consolidador | Gera relatório final consolidado (Markdown/PDF) da sessão de QA |
| [security-audit-workflow](#security-audit-workflow) | Workflow | Auditoria de segurança stack-agnóstica via sub-agents e Docker |

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
