# Frontmatter e `flow-state.json` — formato canônico

Duas estruturas, com uma regra entre elas: **nada é duplicado**. A verdade sobre um artefato
(versão, status, origem) mora no frontmatter do próprio arquivo. O `flow-state.json` guarda só o
que não cabe em documento nenhum: quais artefatos são esperados, o progresso por capacidade, as
próximas ações, as decisões e o estado da fundação.

Estado que copia documento é a dessincronia de novo, só que em JSON.

## Frontmatter

Todo artefato do fluxo abre com:

```yaml
---
tsg_artifact: domain-map
product: code-4-coders
version: 1.1
status: approved
updated: 2026-09-20
sources: vision.md@1.1
---
```

| Campo | Regra |
|---|---|
| `tsg_artifact` | `vision`, `domain-map`, `architecture-baseline`, `capability-backlog`, `domain`, `prd`, `contract`, `techspec`, `tasks` |
| `product` | igual em todos os artefatos do mesmo produto |
| `version` | versão **deste** documento; sobe quando ele é revisado |
| `status` | `draft`, `in_review`, `approved`, `superseded` |
| `updated` | `YYYY-MM-DD` |
| `sources` | `caminho@versão`, separados por vírgula. Vazio só na visão, que é a raiz |

`sources` é o campo que faz o gate funcionar. Ele declara **a versão corrente de cada origem no
momento em que este documento foi escrito**. Quando a origem sobe de versão e o documento não é
revisitado, a comparação acusa — e é a única forma de saber isso sem reler tudo.

Formato plano (`caminho@versão`) de propósito: é parseável pelo mesmo leitor de frontmatter que o
`validate_plan.py` do `tsg-flow-task-creator` já usa, sem depender de pyyaml.

## Origens obrigatórias por tipo

O que o gate exige que cada tipo declare. O que é **opcional** não está aqui: um PRD pode não ter
domain doc (domínio de uma capacidade só) e uma TechSpec de UI sem API não tem contrato.

| Tipo | Exige declarar |
|---|---|
| `vision` | — |
| `domain-map` | `vision` |
| `architecture-baseline` | `vision`, `domain-map` |
| `capability-backlog` | `vision`, `domain-map`, `architecture-baseline` |
| `domain` | `vision`, `domain-map`, `capability-backlog` |
| `prd` | `capability-backlog` |
| `contract` | `prd` — o contrato sai do PRD, não da TechSpec; a TechSpec o consome |
| `techspec` | `prd` |
| `tasks` | `prd`, `techspec` |

## `flow-state.json`

Na raiz do projeto.

```json
{
  "schema": "tsg-flow-state/1",
  "product": "code-4-coders",
  "updated": "2026-09-20",

  "artifacts": {
    "vision": "vision.md",
    "domain-map": "context/domain-map.md",
    "architecture-baseline": "context/architecture-baseline.md",
    "capability-backlog": "backlog/capabilities.md"
  },

  "foundation": {
    "status": "pending",
    "services": [{ "name": "identity", "path": null, "phase": 1 }],
    "platform_ready": false
  },

  "capability_stages": ["backlog", "domain", "prd", "techspec", "contract",
                        "tasks", "in_progress", "done", "descartada"],
  "capabilities": [
    { "id": "CAP-001", "stage": "backlog", "mvp_order": 1, "artifacts": {} }
  ],

  "next_actions": [
    { "id": "NA1", "what": "...", "skill": "tsg-flow-domain-creator", "blocked_by": [] }
  ],
  "open_decisions": [
    { "id": "OD2", "ref": "vision.md A1", "what": "...", "owner": "negócio", "blocks": ["CAP-028"] }
  ],
  "decisions": [
    { "id": "OD1", "what": "...", "decision": "...", "decided_at": "2026-09-20" }
  ]
}
```

**`artifacts`** guarda só o caminho. Versão e status vêm do frontmatter.

**`capabilities`** guarda só o progresso. Título, domínio, prioridade, fase e dependências vêm de
`capabilities.md`, que é a fonte. O gate confere que os dois lados têm o mesmo conjunto de IDs.

**`foundation`** existe porque em greenfield a Fase 0 (serviços, esteira, broker, banco) acontece
fora do fluxo. O gate detecta o que é detectável — o projeto existe no caminho declarado — e repete
o que foi declarado. `path: null` significa "ainda não definido" e não é cobrado.

**`open_decisions`** é o que mais resolve o problema de continuidade: decisão em aberto com dono,
que hoje vive enterrada numa tabela de riscos. `blocks` aceita ID de capacidade, e é assim que o
veredito de uma capacidade sabe que ela está travada por uma decisão de negócio, não por falta de
documento. Decisão resolvida migra para `decisions`, com o racional.

## O gate

```bash
python3 scripts/validate_state.py <raiz>                      # 0 aprovado, 1 reprovado
python3 scripts/validate_state.py <raiz> --status             # onde o fluxo parou
python3 scripts/validate_state.py <raiz> --capability CAP-001 # veredito de uma capacidade
python3 scripts/validate_state.py <raiz> --strict             # avisos viram erros
```

Verifica: artefato declarado existe; frontmatter completo e válido; tipo do frontmatter bate com o
do estado; origens obrigatórias declaradas; **versão de origem igual à versão corrente dela**;
artefato `approved` não pendura em origem `draft`; IDs de capacidade batem entre estado e backlog;
dependências entre capacidades existem; serviço declarado como pronto existe no disco.

Erro é bloqueante. Aviso não: `updated` anterior ao da origem é heurístico — pega o caso "editaram
o documento e não subiram a versão", mas é indício, não prova.
