# Roteamento entre agentes — referência de valores

Referência de configuração do transporte Herdr. O contrato de uso está em
[references/transport.md](references/transport.md); aqui ficam os campos da política e os valores
de modelo aceitos por cada agente.

O arquivo padrão é [scripts/routing.default.json](scripts/routing.default.json). Para sobrescrever
por projeto, copie para `.tsg-flow/routing.json` no repositório alvo, ou aponte `TSG_ROUTING_FILE`.

## Campos

```jsonc
{
  "schema_version": 1,
  "kinds": {
    "<kind>": {
      "model_flag": "--model",   // grafia da flag na CLI daquele agente
      "model": null,             // modelo padrão do kind; null usa o padrão da CLI
      "model_template": null,    // opcional; compõe esforço dentro do modelo: {model}/{effort}
      "effort_args": [],         // template do esforço como argumento; {effort} é substituído
      "effort": null,            // esforço padrão do kind
      "extra_args": []           // argumentos nativos sempre passados a esse kind
    }
  },
  "routes": [
    {
      "role": "implementer",     // implementer | validator | integrator
      "mode": "full",            // opcional; casa o modo da chamada
      "task_kind": "vertical",   // opcional; vertical | enabling, do campo task_kind no frontmatter
      "kind": "codex",           // agente da primeira tentativa
      "model": "...",            // opcional; vale só enquanto o kind for o da rota
      "effort": "max",           // opcional; mesma regra do model
      "escalation": ["claude"]   // kinds das tentativas 2+; sem repetir o kind base
    }
  ],
  "escalation": { "<role>": ["..."] },   // fallback quando a rota não declara escalation
  "anti_affinity": {
    "enabled": true,
    "roles": ["validator"],              // papéis que nunca reusam o kind do implementer
    "preference": ["claude", "codex"]    // ordem de escolha do substituto
  }
}
```

Vale a primeira rota que casa. Rota sem `mode` casa qualquer modo; sem `task_kind`, qualquer task.
Deixe as rotas específicas acima das genéricas.

**Precedência**, idêntica para modelo e esforço: valor da chamada (`--model` / `--effort`) → valor
da rota → padrão do kind → padrão da CLI.

`model` e `effort` da rota só se aplicam enquanto o kind continuar sendo o da rota. Se escalonamento
ou anti-afinidade trocarem o agente, aquele nome de modelo e aquele nível de esforço não existem no
agente novo, e a resolução cai para o padrão do kind.

## Valores de modelo por agente

O `model` é literalmente o texto passado à flag de modelo da CLI daquele agente. Cada agente tem
seu próprio vocabulário — não há nome canônico entre eles.

### claude — verificado

Aceita alias da última versão ou nome completo; ambos funcionam. Preço por 1M tokens
(entrada/saída), para escolher o tier:

| Valor | Preço in/out | Uso no fluxo |
|---|---|---|
| `claude-opus-5` (ou `opus`) | $5 / $25 | Revisão full: mutação, arquitetura, rastreabilidade |
| `claude-sonnet-5` (ou `sonnet`) | $2 / $10 | Revisão focused, escalonamento do implementer |
| `claude-haiku-4-5` (ou `haiku`) | $1 / $5 | Tier barato: commit, checkpoint, boilerplate |
| `claude-fable-5-1` (ou `fable`) | $10 / $50 | Só quando correção valer mais que custo |

Conferir os aceitos: `claude --help | grep -A6 -- --model`.

### codex — verificado

`codex` aceita `-m, --model <MODEL>` e `--model` por extenso. Os nomes recomendados pela
[documentação oficial](https://developers.openai.com/pt-BR/docs/models) são:

| Valor | Uso no fluxo |
|---|---|
| `gpt-6-astra` | Maior capacidade para tarefas complexas de ponta a ponta |
| `gpt-5.6-sol` | Código, pesquisa e raciocínio complexos |
| `gpt-5.6-terra` | Trabalho cotidiano equilibrado |
| `gpt-5.6-luna` | Tarefas claras, repetíveis e de menor custo |
| `gpt-5.3-codex-spark` | Iterações de código quase instantâneas; prévia com acesso limitado |

`gpt-5.6` também é aceito como alias/modelo padrão nos exemplos da CLI. A instalação local
atual usa `gpt-5.6-luna` como padrão. A disponibilidade varia conforme o método de login, plano
e liberação gradual; enquanto `model` for `null`, vale o padrão da CLI. `gpt-5.5`, `gpt-5.4`,
`gpt-5.4-mini`, `gpt-5.2` e `gpt-5.3-codex` são nomes legados e não devem ser usados em novas
rotas sem confirmar que ainda estão disponíveis para a conta.

### opencode — a pesquisar

Formato `provider/model`. Liste os disponíveis com `opencode models`; os provedores autenticados
saem de `opencode providers`. Hoje a instalação local oferece, entre outros, os provedores
`opencode`, `opencode-go`, `zai`, `openai` e `zai-coding-plan`.

### cursor — modelos mapeados, esforço a confirmar

Binário `cursor-agent`; o Herdr reconhece o kind `cursor` e traz `cursor-agent` como alias no
manifesto de detecção. `--model` por extenso.

O vocabulário é o mais rico dos quatro — 227 modelos, com o esforço **embutido no nome**:

| Exemplo | Leitura |
|---|---|
| `claude-opus-5-low` / `-medium` / `-high` | Opus 5 1M nos três níveis |
| `claude-opus-5-thinking-high` / `-thinking-xhigh` | Opus 5 com thinking |
| `claude-sonnet-5-thinking-high` / `-thinking-xhigh` | Sonnet 5 com thinking |
| `gpt-5.3-codex-low` … `-xhigh` | Codex 5.3 por nível |
| sufixo `-fast` em qualquer um | variante rápida, preço premium |

Liste os seus com `cursor-agent --list-models`.

Duas formas de configurar, e a segunda ainda precisa da sua confirmação no primeiro uso:

1. **Nome achatado** — ponha o nome inteiro em `model` e deixe `effort` fora:
   `{ "kind": "cursor", "model": "claude-opus-5-thinking-xhigh" }`. Funciona hoje, sem depender de
   sintaxe extra; o custo é que o ledger não separa modelo de esforço.
2. **Forma parametrizada** — o `--help` documenta
   `'claude-opus-4-8[context=1m,effort=high,fast=false]'`, e a política traz
   `model_template: "{model}[effort={effort}]"` para compor isso a partir de `model` + `effort`.
   Mantém o esforço como campo próprio no ledger. **Não consegui verificar quais modelos aceitam
   a forma entre colchetes** — confirme na primeira execução antes de fixar.

### agy (Antigravity) — verificado

`--model` por extenso, e **flag dedicada de esforço**: `--effort (low|medium|high)`. Catálogo
enxuto, 14 modelos — liste com `agy models`:

| Modelo | Níveis disponíveis |
|---|---|
| `gemini-3.8-flash` / `3.7-flash` / `3.6-flash` | `-high`, `-medium`, `-low` |
| `gemini-3.1-pro` | `-high`, `-low` — **não tem `-medium`** |
| `claude-sonnet-4-6` | sem sufixo (é a variante Thinking) |
| `claude-opus-4-6-thinking` | sem sufixo |
| `gpt-oss-120b-medium` | sufixo fixo no nome |

Aqui o nível aparece **duas vezes**: no sufixo do nome e na flag `--effort`. Qual vence, ou se
interagem, eu não consegui verificar. A política usa a flag (`effort_args`), que mantém o esforço
como campo próprio no ledger; se você quiser fixar pelo nome, ponha o nome inteiro em `model` e
deixe `effort` fora.

Atenção ao escolher: os modelos Claude do `agy` são geração 4.6, enquanto o CLI do `claude` te dá
Opus 5 e Sonnet 5. Ou seja, o `agy` não é o lugar para a revisão full. O nicho dele é o outro
extremo — `gemini-3.x-flash-low` como tier barato de trabalho mecânico, e diversidade de provedor
na anti-afinidade.

`--dangerously-skip-permissions`, `--sandbox` e `--mode` existem e entram em `extra_args` se você
precisar deles. Não desligue controles de autorização por conveniência.

## Esforço de raciocínio

O esforço é a primeira alavanca que troca qualidade por custo **dentro** de um modelo, e é
ortogonal à escolha de agente. Vale medir antes de descer de modelo: esforço baixo num modelo mais
novo costuma igualar ou superar esforço alto na geração anterior, e um modelo só significa um
namespace de cache.

Não existe grafia comum. São três formas, resolvidas nesta ordem:

1. `model_template` — o esforço faz parte do nome do modelo, como no `cursor`.
2. `effort_args` — argumento separado, como no `claude` e no `codex`.
3. Nenhuma das duas — o kind não expõe esforço por chamada, como o `opencode`.

| Agente | `effort_args` | Níveis |
|---|---|---|
| `claude` | `["--effort", "{effort}"]` | `low`, `medium`, `high`, `xhigh`, `max` |
| `codex` | `["-c", "model_reasoning_effort=\"{effort}\""]` | a pesquisar; não há flag dedicada |
| `cursor` | `model_template` — vai **dentro** do nome do modelo | `low`, `medium`, `high`, `xhigh` |
| `opencode` | `[]` — sem esforço por chamada | vai na config do agente, via `--agent` |
| `agy` | `["--effort", "{effort}"]` | `low`, `medium`, `high` |

Kind sem nenhuma das duas formas **não** aceita esforço em silêncio: o script descarta o pedido, anota
`effort <nível> ignorado` na linha ROUTE e grava `effort: null` no ledger. Assim um esforço que
nunca chegou ao agente não vira conclusão errada na hora de comparar provedores.

Verificado no CLI local: `claude` aceita os cinco níveis com qualquer um dos modelos acima,
inclusive `haiku`. Conferir: `claude --help | grep -A1 -- --effort`.

## Ajustes comuns

Commit e checkpoint no tier mais barato do Claude, em vez do opencode — trabalho mecânico, que
não paga raciocínio:

```json
{ "role": "integrator", "kind": "claude", "model": "claude-haiku-4-5", "effort": "low",
  "escalation": ["codex"] }
```

Fixar um modelo barato para todo trabalho `enabling`, mantendo a escada:

```json
{ "role": "implementer", "task_kind": "enabling", "kind": "opencode",
  "model": "opencode/claude-haiku-4-5", "escalation": ["codex", "claude"] }
```

Aprovação e sandbox têm flags diferentes em cada agente, então elas vão em `extra_args` por kind —
uma string global não serve a uma execução com kinds misturados. `TSG_AGENT_EXTRA_ARGS` continua
válida e é aplicada depois. Não desligue controles de autorização por conveniência.

## Verificação

```bash
node --test tests/tsg-flow.test.mjs   # a partir da raiz deste repositório
```

Os testes cobrem rota por papel/modo/`task_kind`, escada de escalonamento com clamp,
anti-afinidade, precedência e grafia das flags de modelo e esforço, esforço composto dentro do
nome do modelo, esforço descartado por kind que não o expõe, política inválida e ledger por chamada.
Usam um substituto de Herdr; nenhum modelo real é chamado.
