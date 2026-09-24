# Transporte por Herdr

Use `scripts/tsg-delegate.sh` a partir do repositório alvo. Cada chamada cria pane e worker novos,
aguarda conclusão e valida um JSON em diretório exclusivo por run_id.

```text
<caminho-da-skill>/scripts/tsg-delegate.sh --role=validator \
  --prd-dir=tasks/prd-exemplo --task=1.0 --mode=focused --attempt=1/3
```

Para full, omita task e forneça --base-ref. Integrator aceita todos os modos do seu SKILL.md,
incluindo prepare-integration. Não há mais dependência de um veredito extraído do terminal.
Use `--context-file=<path>` para decisões adicionais de uma chamada. O script copia o arquivo
para o diretório do run antes de iniciar o worker; não misture essas decisões ao plano da task.
Essa cópia fica retida com os logs, então registre decisões sem credenciais.

## Roteamento entre agentes

`--kind` é opcional. Omitido, o kind vem da política, resolvida em `TSG_ROUTING_FILE`,
`<repo>/.tsg-flow/routing.json` ou `scripts/routing.default.json`, nessa ordem. Informar `--kind`
desliga a política inteira para aquela chamada — inclusive escalonamento e anti-afinidade.

O princípio: **rebaixe o modelo onde o veredito é objetivo, suba onde é julgamento.** O gate com
exit code, o `gate_expect` e a revisão independente são o que torna limitado o custo de errar o
roteamento; o pior caso é consumir uma tentativa.

- **Rota:** primeira entrada de `routes` que casa `role` e, quando declarados, `mode` e `task_kind`.
  `task_kind` vem exclusivamente do campo `task_kind` (`vertical` ou `enabling`) no frontmatter de
  `{PRD_DIR}/<task>_task.md`, não de uma heurística do script. O campo `kind` é reservado para o
  agente (`--kind`) e não é aceito como sinônimo.
- **Escalonamento:** `escalation` lista os kinds das tentativas 2 em diante, sem repetir o kind
  base; a última entrada se repete quando as tentativas acabam. Serve para não repetir o mesmo
  modelo numa tentativa que já falhou — modelo fraco erra mais em processo (adaptar ou pular o
  comando do gate) do que em código. Declarada na rota, ou por papel como fallback.
- **Anti-afinidade:** para os papéis em `anti_affinity.roles`, o kind escolhido nunca é o que
  implementou aquela task. A origem é o próprio ledger, não uma suposição. Diversidade de provedor
  reduz ponto cego compartilhado; não elimina.
- **Modelo e esforço:** mesma precedência — valor da chamada (`--model` / `--effort`), valor da
  rota, padrão do kind, padrão da CLI. Ambos valem só enquanto o kind for o da rota: trocado o
  agente por escalonamento ou anti-afinidade, aquele nome de modelo e aquele nível de esforço não
  existem no agente novo. A composição é por kind porque a grafia diverge em três
  formas: `model_template` quando o esforço faz parte do nome do modelo (`cursor`), `effort_args`
  quando é argumento separado (`claude --effort`, `codex -c model_reasoning_effort=...`), e
  nenhuma das duas quando o agente não expõe esforço por chamada (`opencode`, via `--agent`).
  O terceiro caso descarta o esforço pedido e registra o descarte na linha ROUTE e no ledger, em
  vez de aceitá-lo em silêncio. O esforço é a alavanca que troca
  qualidade por custo dentro de um modelo, e vale medir antes de descer de modelo.
  Valores por agente estão no [README da skill](../README.md#valores-de-modelo-por-agente).
- **extra_args por kind:** aprovação e sandbox têm flags diferentes em cada agente, então uma
  string global não serve a uma execução com kinds misturados. `TSG_AGENT_EXTRA_ARGS` continua
  válida e é aplicada depois. Não desligue controles de autorização por conveniência.

## Resultado

- DELEGATE result=ok: o envelope é válido, não necessariamente a etapa aprovada.
- ROUTE: kind, modelo, esforço e origem (`policy` ou `explicit`); `note` registra escalonamento,
  anti-afinidade e esforço descartado.
- VERDICT: outcome do JSON. Resultado de negócio pertence ao orquestrador.
- RESULT: caminho do JSON, contendo identidade da chamada e resultado final.
- REPORT: relatório do implementer no diretório do run ou review do validator na task/PRD;
  inclui Run da chamada para impedir reutilização de relatório antigo.
- LOG: saída de inicialização/espera e trecho final de diagnóstico do terminal.
- LEDGER: `runs.jsonl`, uma linha por chamada.

Exit 0 significa envelope válido; 2 é falha de transporte; 3 é erro de uso.
Outcome gate_error/validation_error é infraestrutura mesmo com exit 0 do transporte.
Timeout continua sendo falha mesmo se o worker escreveu um resultado parcial ou completo:
reconcilie seus efeitos antes de repetir. Nunca use TASK READY como implementação concluída.
`agent start` exige que o pane novo já esteja no prompt do shell interativo. O script repete
somente `agent_pane_busy`, por até 20 segundos (ajustável com `TSG_START_SHELL_TIMEOUT_S`).
Se o shell não ficar disponível, registra `pane process-info` e a tela do pane no LOG.
Outros erros de start não são repetidos: `agent_not_ready`, por exemplo, indica um agente
iniciado mas bloqueado durante a inicialização.

`agent prompt --wait` aceita os estados padrão do Herdr (`idle`, `done`, `blocked`). Um bloqueio
é relatado como `agent_blocked`; `agent_prompt_stalled` recebe motivo próprio. Em qualquer falha
de transporte depois que um agente pode ter iniciado, o script mantém o pane e informa seu ID
na linha DELEGATE para diagnóstico. Consulte `agent get <pane-id>`, `agent read <pane-id>` e, se a
detecção estiver errada, `agent explain <pane-id> --json`. Um timeout ou `agent_prompt_stalled`
não prova que o prompt deixou de chegar: reconcilie arquivos e commits antes de nova delegação.
Feche o pane preservado
depois da inspeção com `herdr pane close <id>`.

## Ambiente e operação

Herdr e jq devem estar disponíveis. Execute de dentro de um pane Herdr (`HERDR_ENV=1`), pois
`pane split --current` usa o pane do chamador. A [skill do Herdr](https://herdr.dev/docs/agent-skill/)
ensina agentes dentro do Herdr a operar o CLI; o [agent guide](https://herdr.dev/agent-guide.md)
orienta diagnóstico. Instalar a skill por si só não altera este script.
Configure o modo não interativo conforme o runtime e autoridade
já existente; não desligue controles de autorização por conveniência.
TSG_AGENT_EXTRA_ARGS aceita argumentos simples separados por espaço, sem interpretação de shell.
Use --model somente para escolhas já configuradas/autorizadas.

O script mantém os arquivos em .tsg-flow/delegate-logs/ por padrão; TSG_DELEGATE_LOG_DIR pode alterar
o local. Não inclua logs/resultados nos checkpoints por rotina. Sua retenção é independente das ADRs.
Não aumente --lines para transportar um relatório: leia REPORT/RESULT do disco.

## Ledger

`{LOG_DIR}/runs.jsonl` recebe uma linha por chamada, sucesso ou falha de transporte, com `ts`,
`run_id`, `role`, `mode`, `prd_dir`, `task`, `task_kind`, `attempt`, `kind`, `model`, `effort`,
`route`,
`route_note`, `result`, `outcome`, `gate`, `elapsed_s` e `reason`. Falha ao gravar não derruba a
delegação, e o ledger nunca decide resultado — ele existe para comparar kind e modelo por entrega
aprovada, e é a fonte da anti-afinidade.
Quando `--context-file` é usado, `context_file` aponta para a cópia mantida no diretório do run.

Só é possível comparar provedores com tentativas, gates e retrabalho no mesmo lugar; número de
linhas de prompt não mede nada. Duas leituras diretas:

```bash
# custo por kind: chamadas, tempo e aprovações
jq -rs 'group_by(.kind)[] | {kind: .[0].kind, chamadas: length,
  ok: ([.[] | select(.result == "ok")] | length), s: ([.[].elapsed_s] | add)}' \
  .tsg-flow/delegate-logs/runs.jsonl

# onde cada kind falha: gate reprovado, erro de ambiente ou transporte
jq -rs 'group_by(.kind + "/" + (.outcome // "-"))[]
  | "\(.[0].kind)\t\(.[0].outcome)\t\(length)"' .tsg-flow/delegate-logs/runs.jsonl
```

## Limite de confiança

O envelope comprova identidade e conclusão do protocolo, não correção do código. O orquestrador
confere commits e estados; o validator faz a revisão independente. O schema é enviado no próprio
pedido ao worker, mantendo as skills de papel utilizáveis também por subagentes nativos.
