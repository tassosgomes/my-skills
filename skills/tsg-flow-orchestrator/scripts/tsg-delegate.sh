#!/usr/bin/env bash
# Transporte Herdr: resultado final por arquivo, identificado pela chamada.
# stdout: DELEGATE, ROUTE, VERDICT, RESULT, REPORT (quando aplicavel), LOG, LEDGER.
# Exit 0 = resultado de worker valido (inclusive rejeicao); 2 = transporte; 3 = uso.
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
HERDR="${HERDR_BIN_PATH:-herdr}"
ROLE="" KIND="" PRD_DIR="" TASK="" MODE="" ATTEMPT="" BASE_REF=""
MODEL="" TIMEOUT_MS=900000 READ_LINES=200 RATIO=0.4 KEEP_PANE=0
DELIVERY="" RESULT_FILE="" PANE_ID="" LEDGER=""
ROUTE_SOURCE="explicit" ROUTE_NOTE="" ROUTE_MODEL="" ROUTE_EFFORT=""
EFFORT="" TASK_KIND="" MODEL_FLAG="--model"

die() { printf 'tsg-delegate: %s\n' "$1" >&2; exit 3; }
usage() {
  printf '%s\n' 'tsg-delegate.sh --role=implementer|validator|integrator [--kind=KIND]' \
    '  --prd-dir=PATH [--task=N] [--mode=MODE] [--attempt=N/MAX] [--base-ref=SHA]' \
    '  [--delivery=branch|pr|merge] [--model=NAME] [--effort=LEVEL]' \
    '  [--timeout-ms=N] [--lines=N] [--keep-pane]' \
    '' \
    'Sem --kind, o kind vem da politica de roteamento: TSG_ROUTING_FILE,' \
    '<repo>/.tsg-flow/routing.json ou scripts/routing.default.json, nessa ordem.'
}

for arg in "$@"; do
  case "$arg" in
    --role=*) ROLE="${arg#*=}" ;;
    --kind=*) KIND="${arg#*=}" ;;
    --prd-dir=*) PRD_DIR="${arg#*=}" ;;
    --task=*) TASK="${arg#*=}" ;;
    --mode=*) MODE="${arg#*=}" ;;
    --attempt=*) ATTEMPT="${arg#*=}" ;;
    --base-ref=*) BASE_REF="${arg#*=}" ;;
    --delivery=*) DELIVERY="${arg#*=}" ;;
    --model=*) MODEL="${arg#*=}" ;;
    --effort=*) EFFORT="${arg#*=}" ;;
    --timeout-ms=*) TIMEOUT_MS="${arg#*=}" ;;
    --lines=*) READ_LINES="${arg#*=}" ;;
    --ratio=*) RATIO="${arg#*=}" ;;
    --keep-pane) KEEP_PANE=1 ;;
    -h|--help) usage; exit 0 ;;
    *) die "argumento desconhecido: $arg" ;;
  esac
done

[[ -n "$ROLE" && -n "$PRD_DIR" ]] || die "role e prd-dir obrigatorios"
[[ "$TIMEOUT_MS" =~ ^[1-9][0-9]*$ && "$READ_LINES" =~ ^[1-9][0-9]*$ ]] || die "timeout/lines invalidos"
[[ "$RATIO" =~ ^0\.[0-9]*[1-9][0-9]*$ ]] || die "ratio deve estar entre 0 e 1"
[[ -z "$KIND" || "$KIND" =~ ^[a-zA-Z0-9_-]+$ ]] || die "kind invalido"
[[ -z "$EFFORT" || "$EFFORT" =~ ^[a-z][a-z0-9_-]*$ ]] || die "effort invalido"
[[ -z "$TASK" || "$TASK" =~ ^[0-9]+(\.[0-9]+)?$ ]] || die "task invalida"
[[ -z "$ATTEMPT" || "$ATTEMPT" =~ ^[1-9][0-9]*/[1-9][0-9]*$ ]] || die "attempt invalido"
[[ -z "$DELIVERY" || "$DELIVERY" =~ ^(branch|pr|merge)$ ]] || die "delivery invalido"

case "$ROLE" in
  implementer)
    MODE="${MODE:-implement}"
    [[ "$MODE" =~ ^(implement|fix)$ && -n "$TASK" ]] || die "implementer exige task e modo implement/fix"
    ;;
  validator)
    MODE="${MODE:-focused}"
    [[ "$MODE" =~ ^(focused|revalidation|full)$ ]] || die "modo validator invalido"
    if [[ "$MODE" == full ]]; then
      [[ -n "$BASE_REF" && -z "$TASK" ]] || die "full exige base-ref e nao aceita task"
    else
      [[ -n "$TASK" ]] || die "validator exige task"
    fi
    ;;
  integrator)
    [[ "$MODE" =~ ^(prepare-prd-branch|checkpoint-task|reopen-task|prepare-integration|complete-prd)$ ]] ||
      die "modo integrator invalido"
    if [[ "$MODE" == checkpoint-task || "$MODE" == reopen-task ]]; then
      [[ -n "$TASK" ]] || die "modo exige task"
    fi
    ;;
  *) die "role invalido" ;;
esac

command -v "$HERDR" >/dev/null 2>&1 || die "herdr nao encontrado"
command -v jq >/dev/null 2>&1 || die "jq necessario"
[[ -d "$PRD_DIR" ]] || die "prd-dir inexistente"
PRD_DIR="$(cd "$PRD_DIR" && pwd -P)" || die "prd-dir inacessivel"
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || die "fora de repositorio Git"
LOG_DIR="${TSG_DELEGATE_LOG_DIR:-$REPO_ROOT/.tsg-flow/delegate-logs}"
mkdir -p "$LOG_DIR" || die "nao foi possivel criar logs"
LEDGER="$LOG_DIR/runs.jsonl"

# --- Roteamento -------------------------------------------------------------
# Resolve kind, modelo e argumentos nativos a partir da politica. --kind explicito vence
# a politica inteira: escalonamento e anti-afinidade so atuam quando o kind nao foi imposto.
ROUTING_FILE="${TSG_ROUTING_FILE:-}"
if [[ -z "$ROUTING_FILE" ]]; then
  if [[ -f "$REPO_ROOT/.tsg-flow/routing.json" ]]; then
    ROUTING_FILE="$REPO_ROOT/.tsg-flow/routing.json"
  else
    ROUTING_FILE="$SCRIPT_DIR/routing.default.json"
  fi
fi
[[ -f "$ROUTING_FILE" ]] || die "politica de roteamento inexistente: $ROUTING_FILE"
jq -e '.schema_version == 1' "$ROUTING_FILE" >/dev/null 2>&1 ||
  die "politica de roteamento invalida: $ROUTING_FILE"

ATTEMPT_N=1
[[ -n "$ATTEMPT" ]] && ATTEMPT_N="${ATTEMPT%%/*}"
TASK_FILE="$PRD_DIR/${TASK}_task.md"
if [[ -n "$TASK" && -f "$TASK_FILE" ]]; then
  TASK_KIND="$(sed -n '/^---[[:space:]]*$/,/^---[[:space:]]*$/{s/^task_kind:[[:space:]]*\([a-z][a-z]*\).*/\1/p}' \
    "$TASK_FILE" | head -1)"
  [[ "$TASK_KIND" == vertical || "$TASK_KIND" == enabling ]] ||
    die "task_kind ausente ou invalido em $TASK_FILE (use vertical|enabling)"
fi

if [[ -z "$KIND" ]]; then
  PEER_KIND=""
  if [[ -n "$TASK" && -f "$LEDGER" ]]; then
    PEER_KIND="$(jq -rs --arg prd "$PRD_DIR" --arg task "$TASK" '
      [ .[] | select(.role == "implementer" and .prd_dir == $prd and .task == $task
                     and (.kind | type) == "string") ] | last | .kind // empty' \
      "$LEDGER" 2>/dev/null)" || PEER_KIND=""
  fi
  ROUTE_JSON="$(jq -c --arg role "$ROLE" --arg mode "$MODE" --arg tkind "$TASK_KIND" \
    --arg peer "$PEER_KIND" --argjson attempt "$ATTEMPT_N" '
    def matches($r): ($r.role == $role)
      and (($r.mode // null) == null or $r.mode == $mode)
      and (($r.task_kind // null) == null or $r.task_kind == $tkind);
    ([ .routes[] | select(matches(.)) ] | first) as $route
    | if $route == null then { kind: null, note: "sem rota" }
      else ([$route.kind] + ($route.escalation // (.escalation // {})[$role] // [])) as $ladder
      | (if $attempt <= 1 then $route.kind
         else $ladder[[$attempt - 1, ($ladder | length) - 1] | min] end) as $escalated
      | (.anti_affinity // {}) as $aa
      | (if ($aa.enabled // false)
            and ((($aa.roles // []) | index($role)) != null)
            and $peer != "" and $escalated == $peer
         then ([ (($aa.preference // [])[]) | select(. != $peer) ] | first) // $escalated
         else $escalated end) as $final
      | { kind: $final,
          model: (if $final == $route.kind then ($route.model // null) else null end),
          effort: (if $final == $route.kind then ($route.effort // null) else null end),
          note: ([ (if $escalated != $route.kind
                    then "escalonado da tentativa \($attempt)" else empty end),
                   (if $final != $escalated
                    then "anti-afinidade com implementer \($peer)" else empty end) ]
                 | join("; ")) }
      end' "$ROUTING_FILE")" || die "falha ao avaliar $ROUTING_FILE"
  KIND="$(printf '%s' "$ROUTE_JSON" | jq -r '.kind // empty')"
  [[ -n "$KIND" ]] || die "roteamento nao resolveu kind para role=$ROLE mode=$MODE; use --kind"
  # O modelo da rota vale para o kind da rota. Trocado o kind por escalonamento ou
  # anti-afinidade, o modelo antigo nao existe no agente novo: cai no padrao do kind.
  ROUTE_MODEL="$(printf '%s' "$ROUTE_JSON" | jq -r '.model // empty')"
  ROUTE_EFFORT="$(printf '%s' "$ROUTE_JSON" | jq -r '.effort // empty')"
  ROUTE_NOTE="$(printf '%s' "$ROUTE_JSON" | jq -r '.note // ""')"
  ROUTE_SOURCE="policy"
fi

KIND_JSON="$(jq -c --arg kind "$KIND" '(.kinds[$kind] // {})' "$ROUTING_FILE")"
MODEL_FLAG="$(printf '%s' "$KIND_JSON" | jq -r '.model_flag // "--model"')"
# Precedencia: valor da chamada, valor da rota, padrao do kind. Vale para modelo e esforco.
[[ -z "$MODEL" ]] && MODEL="$ROUTE_MODEL"
[[ -z "$MODEL" ]] && MODEL="$(printf '%s' "$KIND_JSON" | jq -r '.model // empty')"
[[ -z "$EFFORT" ]] && EFFORT="$ROUTE_EFFORT"
[[ -z "$EFFORT" ]] && EFFORT="$(printf '%s' "$KIND_JSON" | jq -r '.effort // empty')"
mapfile -t KIND_EXTRA_ARGS < <(printf '%s' "$KIND_JSON" | jq -r '(.extra_args // [])[]')

# O esforco de raciocinio nao tem grafia comum. Tres formas, nesta ordem de resolucao:
# 1. model_template: o esforco faz parte do proprio nome do modelo (cursor).
# 2. effort_args: argumento separado (claude --effort, codex -c model_reasoning_effort=...).
# 3. nenhuma das duas: o kind nao expoe esforco por chamada (opencode leva no --agent).
# O caso 3 registra o descarte em vez de aceitar em silencio um esforco que nunca chegou.
MODEL_TEMPLATE="$(printf '%s' "$KIND_JSON" | jq -r '.model_template // empty')"
EFFORT_ARGS=()
if [[ -n "$EFFORT" ]]; then
  if [[ -n "$MODEL_TEMPLATE" && -n "$MODEL" ]]; then
    MODEL="${MODEL_TEMPLATE//\{model\}/$MODEL}"
    MODEL="${MODEL//\{effort\}/$EFFORT}"
  else
    mapfile -t EFFORT_TEMPLATE < <(printf '%s' "$KIND_JSON" | jq -r '(.effort_args // [])[]')
    if ((${#EFFORT_TEMPLATE[@]} == 0)); then
      ROUTE_NOTE="${ROUTE_NOTE:+$ROUTE_NOTE; }effort $EFFORT ignorado: $KIND nao expoe esforco"
      EFFORT=""
    else
      for tpl in "${EFFORT_TEMPLATE[@]}"; do EFFORT_ARGS+=("${tpl//\{effort\}/$EFFORT}"); done
    fi
  fi
fi
# --- Fim do roteamento ------------------------------------------------------

RUN_DIR="$(mktemp -d "$LOG_DIR/run.XXXXXXXX")" || die "nao foi possivel reservar run"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
RUN_ID="${RUN_DIR##*/}"
RESULT_FILE="$RUN_DIR/result.json"
LOG_FILE="$RUN_DIR/transcript.log"
AGENT_NAME="tsg-$ROLE-$(printf '%s' "$RUN_ID" | tr '[:upper:].' '[:lower:]-')"
START_TS=$SECONDS
REPORT_PATH=""
if [[ "$ROLE" == validator ]]; then
  if [[ "$MODE" == full ]]; then REPORT_PATH="$PRD_DIR/prd_review.md"
  else REPORT_PATH="$PRD_DIR/${TASK}_task_review.md"; fi
fi

# shellcheck disable=SC2329 # chamado pelo trap EXIT
cleanup() {
  if [[ -n "$PANE_ID" && "$KEEP_PANE" -eq 0 ]]; then
    "$HERDR" pane close "$PANE_ID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

# Uma linha por chamada no ledger: base para comparar kind/modelo por entrega aprovada.
# Nunca decide resultado; falha de escrita nao derruba a delegacao.
ledger() {
  local result="$1" outcome="$2" reason="${3:-}" gate=""
  [[ -f "$RESULT_FILE" && ! -L "$RESULT_FILE" ]] &&
    gate="$(jq -r '.gate // empty' "$RESULT_FILE" 2>/dev/null)"
  jq -nc --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --arg run "$RUN_ID" --arg role "$ROLE" \
    --arg mode "$MODE" --arg prd "$PRD_DIR" --arg task "$TASK" --arg attempt "$ATTEMPT" \
    --arg task_kind "$TASK_KIND" --arg kind "$KIND" --arg model "$MODEL" \
    --arg effort "$EFFORT" \
    --arg route "$ROUTE_SOURCE" --arg note "$ROUTE_NOTE" --arg result "$result" \
    --arg outcome "$outcome" --arg gate "$gate" --arg reason "$reason" \
    --argjson elapsed "$((SECONDS - START_TS))" '
    def opt: if . == "" then null else . end;
    { ts: $ts, run_id: $run, role: $role, mode: $mode, prd_dir: $prd,
      task: ($task | opt), task_kind: ($task_kind | opt), attempt: ($attempt | opt),
      kind: $kind, model: ($model | opt), effort: ($effort | opt),
      route: $route, route_note: ($note | opt),
      result: $result, outcome: $outcome, gate: ($gate | opt),
      elapsed_s: $elapsed, reason: ($reason | opt) }' >>"$LEDGER" 2>/dev/null || true
}

emit() {
  printf 'DELEGATE result=%s role=%s kind=%s run_id=%s pane=%s elapsed=%ss%s\n' \
    "$1" "$ROLE" "$KIND" "$RUN_ID" "${PANE_ID:-none}" "$((SECONDS - START_TS))" "${3:+ reason=$3}"
  printf 'ROUTE: kind=%s model=%s effort=%s source=%s%s\n' \
    "$KIND" "${MODEL:-default}" "${EFFORT:-default}" "$ROUTE_SOURCE" \
    "${ROUTE_NOTE:+ note=$ROUTE_NOTE}"
  printf 'VERDICT: %s\nRESULT: %s\n' "$2" "$RESULT_FILE"
  [[ -n "$REPORT_PATH" && -f "$REPORT_PATH" ]] && printf 'REPORT: %s\n' "$REPORT_PATH"
  printf 'LOG: %s\nLEDGER: %s\n' "$LOG_FILE" "$LEDGER"
  ledger "$1" "$2" "${3:-}"
}
fail() { emit transport_failure TRANSPORT_FAILURE "$1"; exit 2; }

ARGS=("tsg-flow-$ROLE" "--prd-dir=$PRD_DIR" "--mode=$MODE" "--run-id=$RUN_ID" "--result-file=$RESULT_FILE")
[[ -n "$TASK" ]] && ARGS+=("--task=$TASK")
[[ -n "$ATTEMPT" ]] && ARGS+=("--attempt=$ATTEMPT")
[[ -n "$BASE_REF" ]] && ARGS+=("--base-ref=$BASE_REF")
[[ -n "$DELIVERY" ]] && ARGS+=("--delivery=$DELIVERY")
printf -v INVOCATION '%q ' "${ARGS[@]}"

SCHEMA="$(jq -n --arg run "$RUN_ID" --arg role "$ROLE" --arg mode "$MODE" \
  --arg prd "$PRD_DIR" --arg task "$TASK" --arg attempt "$ATTEMPT" --arg report "$REPORT_PATH" \
  '{schema_version:1,run_id:$run,role:$role,mode:$mode,prd_dir:$prd,task:$task,attempt:$attempt,
    outcome:"SUBSTITUIR",gate:"SUBSTITUIR",report:(if $report=="" then null else $report end)}')"
PROMPT="$INVOCATION

Transporte desta chamada:
- Nao faca perguntas; devolva bloqueio operacional se faltar decisao material ou autorizacao.
- Grave o resultado final em $RESULT_FILE, somente depois de terminar a etapa e salvar o relatorio.
- Use exatamente a identidade abaixo; substitua outcome e gate pelos valores correspondentes.
$SCHEMA
- Implementer outcomes: implementation_complete, task_blocked, gate_failed, gate_error.
- Validator outcomes: approved, rejected, validation_error.
- Integrator outcomes por modo: prepare-prd-branch=branch_ready; checkpoint-task=checkpoint_ok;
  reopen-task=task_reopened; prepare-integration=integration_ready; complete-prd=prd_complete.
  Qualquer modo pode devolver integration_blocked ou revalidation_required.
- Gate: passed, static_passed, failed, error ou not_run. Implementacao completa e validator aprovado
  exigem passed/static_passed; gate_failed exige failed; gate_error/validation_error exigem error.
- Validator: inclua no relatorio a linha exata Run: $RUN_ID.
  Full approved tambem exige validated_commit, validated_tree e base_ref como SHAs completos.
- Integrator: inclua branch e commit em sucesso; branch_ready/integration_ready exigem base_ref;
  integration_ready tambem exige target_ref. Bloqueios incluem reason.
- TASK READY e apenas preflight. Nunca grave implementation_complete antes do gate aprovado.
- Conteudo longo fica no disco. Encerre o terminal com um resumo curto, sem depender de tokens de veredito."

PANE_JSON="$("$HERDR" pane split --current --direction right --ratio "$RATIO" \
  --cwd "$REPO_ROOT" --no-focus 2>&1)" || {
  printf '%s\n' "$PANE_JSON" >"$LOG_FILE"; fail pane_split_failed
}
PANE_ID="$(printf '%s' "$PANE_JSON" | jq -r '.result.pane.pane_id // empty' 2>/dev/null)"
[[ -n "$PANE_ID" ]] || { printf '%s\n' "$PANE_JSON" >"$LOG_FILE"; fail pane_split_failed; }

AGENT_ARGS=()
# A grafia da flag de modelo vem da politica: claude aceita apenas --model, codex e opencode
# aceitam ambas. Nao assuma -m para um kind novo sem conferir a CLI dele.
[[ -n "$MODEL" ]] && AGENT_ARGS+=("$MODEL_FLAG" "$MODEL")
((${#EFFORT_ARGS[@]} > 0)) && AGENT_ARGS+=("${EFFORT_ARGS[@]}")
((${#KIND_EXTRA_ARGS[@]} > 0)) && AGENT_ARGS+=("${KIND_EXTRA_ARGS[@]}")
if [[ -n "${TSG_AGENT_EXTRA_ARGS:-}" ]]; then
  # Argumentos simples separados por espaco; sem eval, globbing ou expansao de comandos.
  read -r -a EXTRA_ARGS <<<"$TSG_AGENT_EXTRA_ARGS"
  AGENT_ARGS+=("${EXTRA_ARGS[@]}")
fi
START_ARGS=(agent start "$AGENT_NAME" --kind "$KIND" --pane "$PANE_ID" --timeout 120000)
(("${#AGENT_ARGS[@]}" > 0)) && START_ARGS+=(-- "${AGENT_ARGS[@]}")
"$HERDR" "${START_ARGS[@]}" >"$LOG_FILE" 2>&1 || fail agent_start_failed
# agent start pode reportar pronto antes do pane aceitar paste+Enter de forma confiavel:
# um prompt disparado sem intervalo perde o Enter e trava em agent_prompt_stalled.
sleep 1

PROMPT_RC=0
"$HERDR" agent prompt "$AGENT_NAME" "$PROMPT" --wait --until idle --until "done" \
  --timeout "$TIMEOUT_MS" >>"$LOG_FILE" 2>&1 || PROMPT_RC=$?
# Uma leitura para diagnostico; o transcript nunca decide o resultado.
"$HERDR" agent read "$AGENT_NAME" --source recent-unwrapped --lines "$READ_LINES" >>"$LOG_FILE" 2>&1 || true
((PROMPT_RC == 0)) || fail timeout_or_blocked
[[ -f "$RESULT_FILE" && ! -L "$RESULT_FILE" ]] || fail result_missing

jq -e --arg run "$RUN_ID" --arg role "$ROLE" --arg mode "$MODE" --arg prd "$PRD_DIR" \
  --arg task "$TASK" --arg attempt "$ATTEMPT" --arg report "$REPORT_PATH" '
  def sha: type == "string" and test("^[0-9a-f]{40}([0-9a-f]{24})?$");
  def nonempty: type == "string" and length > 0;
  .schema_version == 1 and .run_id == $run and .role == $role and .mode == $mode
  and .prd_dir == $prd and .task == $task and .attempt == $attempt
  and (.gate | IN("passed","static_passed","failed","error","not_run"))
  and (if $role == "implementer" then
    (.outcome == "implementation_complete" and (.gate | IN("passed","static_passed")))
    or (.outcome == "task_blocked" and .gate == "not_run")
    or (.outcome == "gate_failed" and .gate == "failed")
    or (.outcome == "gate_error" and .gate == "error")
  elif $role == "validator" then
    .report == $report and (
      (.outcome == "approved" and (.gate | IN("passed","static_passed"))
        and (if $mode == "full" then
          (.validated_commit | sha) and (.validated_tree | sha) and (.base_ref | sha)
        else true end))
      or (.outcome == "rejected" and (.gate | IN("passed","static_passed","failed")))
      or (.outcome == "validation_error" and .gate == "error"))
  else
    ((.outcome | IN("integration_blocked","revalidation_required")) and (.reason | nonempty))
    or ((.branch | nonempty) and (.commit | sha) and
      (if $mode == "prepare-prd-branch" then .outcome == "branch_ready" and (.base_ref | sha)
       elif $mode == "checkpoint-task" then .outcome == "checkpoint_ok"
       elif $mode == "reopen-task" then .outcome == "task_reopened"
       elif $mode == "prepare-integration" then
         .outcome == "integration_ready" and (.base_ref | sha) and (.target_ref | sha)
       else .outcome == "prd_complete" end))
  end)' "$RESULT_FILE" >/dev/null 2>&1 || fail result_invalid

if [[ -n "$REPORT_PATH" ]]; then
  [[ -f "$REPORT_PATH" ]] || fail report_missing
  grep -Fqx "Run: $RUN_ID" "$REPORT_PATH" || fail report_stale
fi
OUTCOME="$(jq -r '.outcome' "$RESULT_FILE")"
emit ok "$OUTCOME"
exit 0
