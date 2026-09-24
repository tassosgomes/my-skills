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
  `{PRD_DIR}/<N>_task.md` (nome gravado pelo task-creator; `<N>.0_task.md` também é aceito), não
  de uma heurística do script. Sem o arquivo da task, a chamada para com erro de uso em vez de
  cair na rota genérica. O campo `kind` é reservado para o
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
iniciado mas bloqueado durante a inicialização (como o diálogo de confiança de pasta do `claude`
num diretório novo).

O Herdr declara alguns agentes prontos antes de a TUI aceitar input, e o prompt colado nesse
intervalo é descartado. Depois do start, o script espera `start_settle_s` do kind (padrão 1;
`TSG_START_SETTLE_S` sobrescreve). Valores medidos: opencode renderiza a TUI cerca de 3s depois
do start (6), agy perdeu o prompt com 3s (8), codex perdeu uma vez com 1s (3).
Nenhum intervalo fixo garante a entrega: com 8s, o agy ainda perdeu 1 prompt em 3. Por isso o
script confere a chegada pelo marcador `--run-id=<run_id>` no pane. Com o agente parado (stall
sem turno, ou turno "concluído" sem resultado) e sem o marcador na tela, o prompt comprovadamente
não chegou, e o script o reenvia até `TSG_PROMPT_RESENDS` vezes (2). Prompt que chegou nunca é
reenviado.

`agent prompt --wait` aceita os estados padrão do Herdr (`idle`, `done`, `blocked`). Um bloqueio
é relatado como `agent_blocked`; `agent_prompt_stalled` recebe motivo próprio.
O Herdr exige `working` em 5s, sem ajuste; um agente lento para abrir o turno excede essa janela
com o prompt já aceito. Em stall, o script espera até `TSG_STALL_RECOVERY_MS` (30000) por
`working`: se o turno aparecer, acompanha-o até o fim; se não, o prompt se perdeu e a falha é
relatada como `agent_prompt_stalled`.
A detecção do agy marca `idle` entre chamadas de ferramenta. Se o resultado ainda não existe
quando o turno parece terminado, o script dá `TSG_IDLE_GRACE_MS` (20000) para o agente voltar a
`working` e continua aguardando dentro do timeout da chamada. Em qualquer falha
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
