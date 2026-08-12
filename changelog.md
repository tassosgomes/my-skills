# Changelog das skills TSG Flow

## 2026-08-12 — Lint Spectral para contratos OpenAPI

### Objetivo

Evitar que a `tsg-flow-contract-creator` entregue contratos OpenAPI 3.1 com exemplos depreciados
ou inconsistentes com JSON Schema.

### Mudanças

- Adicionado o ruleset `skills/tsg-flow-contract-creator/rulesets/openapi.yaml`, baseado em
  `spectral:oas`, com validações para OpenAPI 3.1, `example` depreciado em Schema Objects e
  `examples` como array nesse contexto.
- Adicionado o guia operacional `references/spectral.md`, incluindo o comando reproduzível com
  `npx @stoplight/spectral-cli`.
- Atualizada a `SKILL.md` para tornar o lint parte obrigatória da validação e do protocolo de saída.
- Atualizado o template OpenAPI para usar `examples`, mapas nomeados em Media Type Objects e
  união de tipos com `null` no lugar de `nullable`.

## 2026-08-08 — Renomeação dos creators para `tsg-flow-*`

### Objetivo

Alinhar as etapas de definição de produto e planejamento ao mesmo namespace das skills de execução
`tsg-flow-orchestrator`, `tsg-flow-implementer`, `tsg-flow-validator` e `tsg-flow-integrator`.

### Mudanças

- `flow-prd-creator` → `tsg-flow-prd-creator`.
- `flow-techspec-creator` → `tsg-flow-techspec-creator`.
- `flow-task-creator` → `tsg-flow-task-creator`.
- `flow-frontend-techspec-creator` → `tsg-flow-frontend-techspec-creator`.
- `flow-gate-creator` → `tsg-flow-gate-creator`.
- Promovidos para a fonte canônica os estágios `tsg-flow-vision-creator`,
  `tsg-flow-domain-decomposer`, `tsg-flow-domain-creator` e `tsg-flow-contract-creator`.
- As versões genéricas antigas foram preservadas em `snapshots/creators-pre-tsg-rename/` e não são
  mais skills ativas.
- Corrigidos os handoffs entre PRD, contrato, TechSpec, frontend e Tasks.
- Mantido o namespace `flow-qa-*` para o pipeline de QA, fora do escopo desta renomeação.

## 2026-08-08 — Fluxo standard por task com revisão full do PRD

### Objetivo

Simplificar o AI Flow para features médias e grandes descritas por PRD, TechSpec e tasks, mantendo
isolamento de responsabilidades e proteção Git sem gerar telemetria redundante.

### Mudanças de comportamento

- Removidos os perfis `fast` e `strict` do fluxo principal.
- `standard` tornou-se o único perfil: implementer, validator focused e integrator por task.
- O Plan Mode do harness fica como alternativa para alterações pequenas fora do AI Flow.
- O validator `focused` valida uma task por vez; não executa a auditoria completa do PRD.
- Adicionado `validator --mode=full` no encerramento, depois dos checkpoints de todas as tasks.
- O `full` revisa o diff inteiro contra a base do PRD, integração entre tasks, rastreabilidade,
  arquitetura, segurança, performance, regressões e testes.
- O `full` carrega `design-patterns` em modo Review e produz recomendações sem aplicar refatorações
  automaticamente.
- O integrator cria um checkpoint/commit após cada task aprovada. O commit é tratado como seguro de
  recuperação e não como obrigação de manter um PR com poucos commits.
- `prepare-prd-branch` retorna o `BASE_REF` usado pelo gate e pela revisão full.
- `complete-prd` só pode ocorrer após `FULL VALIDATION APROVADA`.
- Adicionado `reopen-task` para reabrir com commit de estado uma task concluída quando o full identificar
  um bloqueio atribuível a ela.

### Preflight e intervenção

- O implementer executa um preflight antes de editar código.
- O preflight retorna `TASK READY` ou `TASK BLOCKED`.
- Lacuna ou contradição material de PRD, TechSpec ou task interrompe o fluxo imediatamente e não consome
  uma tentativa de implementação.
- Foi adicionado o estado canônico `blocked` ao Kanban.
- `--max-attempts` assume `3` e aceita no máximo `5`.
- Falha de gate ou reprovação do validator conta como tentativa.
- Ao atingir o limite, o orquestrador preserva o último checkpoint, informa timeline, bloqueios e ação
  necessária e aguarda intervenção humana.
- O implementer não pode executar retries indefinidos dentro da própria chamada.

### Qualidade e memória

- Removidos `quality-ledger.jsonl`, `quality-ledger.md` e registros repetitivos de aprovação limpa.
- Relatórios de task e do PRD permanecem como evidência operacional focada.
- A memória padrão passa a ser composta por tasks, código e commits; decisões excepcionais ficam na
  sessão ou em relatório de bloqueio, sem diário automático.

### Contrato do gate

- Adicionado `--base=<ref>` para escopo de diff desde a base do PRD.
- Adicionado `--all-tests` para a suíte completa, reservado ao `full` final.
- `--filter=<expr>` continua sendo o caminho focused por task.
- O gate não executa a suíte completa por padrão.

### Arquivos principais alterados

- `skills/tsg-flow-orchestrator/`
- `skills/tsg-flow-implementer/`
- `skills/tsg-flow-validator/`
- `skills/tsg-flow-integrator/`
- `skills/flow-task-creator/`
- `skills/flow-gate-creator/`

## 2026-08-08 — Renomeação para a família `tsg-*`

As quatro skills do fluxo foram renomeadas para tornar explícito que esta é a versão final
customizada:

- `ai-flow-orchestrator` → `tsg-flow-orchestrator`
- `ai-flow-implementer` → `tsg-flow-implementer`
- `ai-flow-validator` → `tsg-flow-validator`
- `ai-flow-integrator` → `tsg-flow-integrator`

As referências ativas foram atualizadas. Snapshots e auditorias históricas que registram a
família `ai-*` foram preservados sem alteração.
