#!/usr/bin/env bash
#
# Gate deterministico do TSG Flow.
#
# Roda formatacao, build e testes SEM consumir contexto de LLM: o `tsg-flow-validator`
# executa este script ANTES de ler PRD/techspec/skills. Se o gate reprova, o validator
# devolve REPROVADA imediatamente, sem carregar material de apoio.
#
# A formatacao e escopada nos arquivos alterados desde o ultimo checkpoint commit
# (o integrator commita por task), evitando reprovar a task por debito pre-existente.
#
# Uso:
#   scripts/ai-flow/gate.sh [--filter=<expr>]... [--base=<ref>] [--all-tests] [--static] [--sln=<path>] [--skip-tests]
#
# Saida: bloco compacto (<= ~60 linhas). Exit 0 = APROVADO, 1 = REPROVADO.

set -uo pipefail

MAX_OUTPUT_LINES=40
SLN="${GATE_DOTNET_SOLUTION:-App.sln}" # adapte uma vez ao repositorio alvo
SKIP_TESTS=0
STATIC=0
ALL_TESTS=0
BASE_REF="HEAD"
FILTERS=()

for arg in "$@"; do
  case "$arg" in
    --filter=*)    FILTERS+=("${arg#*=}") ;;
    --base=*)      BASE_REF="${arg#*=}" ;;
    --all-tests)   ALL_TESTS=1 ;;
    --sln=*)       SLN="${arg#*=}" ;;
    --skip-tests)  SKIP_TESTS=1 ;;
    --static)      STATIC=1 ;;
    -h|--help)     sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "GATE: ERRO"; echo "argumento desconhecido: $arg"; exit 2 ;;
  esac
done

# Selecao explicita: ausencia de filtro nunca significa aprovacao comportamental.
MODES=$((ALL_TESTS + STATIC + SKIP_TESTS))
if ((MODES > 1)) || ((MODES > 0 && ${#FILTERS[@]} > 0)) ||
   ((MODES == 0 && ${#FILTERS[@]} == 0)); then
  echo "GATE: ERRO"; echo "use filtros OU --all-tests OU --static OU --skip-tests"; exit 2
fi
for f in "${FILTERS[@]}"; do
  if [[ -z "${f//[[:space:]]/}" ]]; then
    echo "GATE: ERRO"; echo "filtro vazio"; exit 2
  fi
done
if [[ ! "${GATE_TIMEOUT_SECONDS:-600}" =~ ^[1-9][0-9]*$ ]]; then
  echo "GATE: ERRO"; echo "GATE_TIMEOUT_SECONDS deve ser inteiro positivo"; exit 2
fi
command -v timeout >/dev/null 2>&1 || {
  echo "GATE: ERRO"; echo "timeout indisponivel; configure equivalente no gate"; exit 2
}
export CI=true TERM=dumb NO_COLOR=1
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "GATE: ERRO"; echo "nao esta em um repositorio git"; exit 2
}
cd "$REPO_ROOT" || exit 2
BASE_REF="$(git rev-parse --verify "$BASE_REF^{commit}" 2>/dev/null)" || {
  echo "GATE: ERRO"; echo "base Git invalida"; exit 2
}

if [[ ! -f "$SLN" ]]; then
  echo "GATE: ERRO"; echo "solution inexistente: $SLN (configure o gate ou --sln)"; exit 2
fi
export DOTNET_CLI_UI_LANGUAGE=en-US VSLANG=1033

# ---------------------------------------------------------------------------
# Escopo: arquivos alterados desde BASE_REF (= checkpoint focused ou base do PRD)
# ---------------------------------------------------------------------------
mapfile -d '' -t CHANGED < <(
  { git diff --name-only -z "$BASE_REF" --
    git ls-files --others --exclude-standard -z
  } | sort -zu
)
CHANGED_CS=()
for file in "${CHANGED[@]}"; do
  # Deletados contam no diff, mas nao sao passados a formatadores.
  if [[ -f "$file" && "$file" =~ \.cs$ ]]; then
    CHANGED_CS+=("$file")
  fi
done

fail() {
  local etapa="$1" cmd="$2" out="$3"
  echo "GATE: REPROVADO"
  echo "etapa: $etapa"
  echo "comando: $cmd"
  echo "--- output (ultimas ${MAX_OUTPUT_LINES} linhas) ---"
  printf '%s\n' "$out" | tail -n "$MAX_OUTPUT_LINES"
  exit 1
}

run() {
  local rc=0
  OUT="$(timeout "${GATE_TIMEOUT_SECONDS:-600}" "$@" 2>&1)" || rc=$?
  if ((rc == 124 || rc == 137 || rc == 126 || rc == 127)); then
    echo "GATE: ERRO"
    echo "ambiente/timeout ao executar: $1"
    printf '%s\n' "$OUT" | tail -n "$MAX_OUTPUT_LINES"
    exit 2
  fi
  return "$rc"
}

# ---------------------------------------------------------------------------
# 1. Formatacao (escopada nos .cs alterados)
# ---------------------------------------------------------------------------
FORMAT_STATUS="pulado (nenhum .cs alterado)"
if ((${#CHANGED_CS[@]} > 0)); then
  CMD=(dotnet format "$SLN" --verify-no-changes --no-restore --include "${CHANGED_CS[@]}")
  if ! run "${CMD[@]}"; then
    fail "format" "dotnet format $SLN --verify-no-changes --no-restore --include <${#CHANGED_CS[@]} arquivos da task>" "$OUT"
  fi
  FORMAT_STATUS="ok (${#CHANGED_CS[@]} arquivos)"
fi

# ---------------------------------------------------------------------------
# 2. Build
# ---------------------------------------------------------------------------
CMD=(dotnet build "$SLN" --no-restore)
if ! run "${CMD[@]}"; then
  fail "build" "dotnet build $SLN --no-restore" "$OUT"
fi
BUILD_SUMMARY="$(printf '%s\n' "$OUT" | grep -oE '[0-9]+ (Error|Warning)\(s\)' | tr '\n' ' ')"
BUILD_STATUS="ok ${BUILD_SUMMARY:-}"

# ---------------------------------------------------------------------------
# 3. Testes (apenas os filtros declarados nos criterios de sucesso da task)
# ---------------------------------------------------------------------------
TEST_STATUS="nao aplicavel (static)"
((SKIP_TESTS == 1)) && TEST_STATUS="pulado (diagnostico; nao aprova task)"
if ((SKIP_TESTS == 0 && STATIC == 0)) && ((ALL_TESTS == 1)); then
  CMD=(dotnet test "$SLN" --no-build --no-restore)
  if ! run "${CMD[@]}"; then
    fail "testes" "dotnet test $SLN --no-build --no-restore" "$OUT"
  fi
  TEST_STATUS="ok (suite completa)"
elif ((SKIP_TESTS == 0 && STATIC == 0)) && ((${#FILTERS[@]} > 0)); then
  RESULTS=()
  for f in "${FILTERS[@]}"; do
    CMD=(dotnet test "$SLN" --no-build --no-restore --filter "$f")
    if ! run "${CMD[@]}"; then
      fail "testes" "dotnet test $SLN --no-build --no-restore --filter \"$f\"" "$OUT"
    fi
    # "Passed!  - Failed: 0, Passed: 95, ..." — soma o que rodou
    SUM="$(printf '%s\n' "$OUT" | grep -oE 'Passed:[[:space:]]+[0-9]+' | grep -oE '[0-9]+' | awk '{s+=$1} END {print s+0}')"
    if [[ "${SUM:-0}" == "0" ]]; then
      fail "testes" "dotnet test $SLN --no-build --no-restore --filter \"$f\"" \
        "Filtro nao selecionou nenhum teste. A suite exigida pela task provavelmente nao existe.
$OUT"
    fi
    RESULTS+=("$f=${SUM}")
  done
  TEST_STATUS="ok (${RESULTS[*]})"

fi

# ---------------------------------------------------------------------------
# 4. Higiene do diff
# ---------------------------------------------------------------------------
if ! run git diff --check "$BASE_REF" --; then
  fail "diff-check" "git diff --check $BASE_REF" "$OUT"
fi

echo "GATE: APROVADO"
echo "arquivos alterados: ${#CHANGED[@]} (.cs: ${#CHANGED_CS[@]})"
echo "format: $FORMAT_STATUS"
echo "build: $BUILD_STATUS"
echo "testes: $TEST_STATUS"
exit 0
