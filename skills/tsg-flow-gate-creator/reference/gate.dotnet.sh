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
#   scripts/ai-flow/gate.sh [--filter=<expr>]... [--base=<ref>] [--all-tests] [--sln=<path>] [--skip-tests]
#
# Saida: bloco compacto (<= ~60 linhas). Exit 0 = APROVADO, 1 = REPROVADO.

set -uo pipefail

MAX_OUTPUT_LINES=40
SLN=""
SKIP_TESTS=0
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
    -h|--help)     sed -n '2,20p' "$0"; exit 0 ;;
    *) echo "GATE: ERRO"; echo "argumento desconhecido: $arg"; exit 2 ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "GATE: ERRO"; echo "nao esta em um repositorio git"; exit 2
}
cd "$REPO_ROOT" || exit 2

if [[ -z "$SLN" ]]; then
  SLN="$(find . -maxdepth 2 -name '*.sln' -not -path './.git/*' | head -1)"
fi
if [[ -z "$SLN" ]]; then
  echo "GATE: ERRO"; echo "nenhum .sln encontrado (use --sln=<path>)"; exit 2
fi

# ---------------------------------------------------------------------------
# Escopo: arquivos alterados desde BASE_REF (= checkpoint focused ou base do PRD)
# ---------------------------------------------------------------------------
mapfile -t CHANGED < <(
  { git diff --name-only "$BASE_REF" -- 2>/dev/null
    git ls-files --others --exclude-standard 2>/dev/null
  } | sort -u | grep -v '^$'
)
mapfile -t CHANGED_CS < <(printf '%s\n' "${CHANGED[@]:-}" | grep -E '\.cs$' || true)

fail() {
  local etapa="$1" cmd="$2" out="$3"
  echo "GATE: REPROVADO"
  echo "etapa: $etapa"
  echo "comando: $cmd"
  echo "--- output (ultimas ${MAX_OUTPUT_LINES} linhas) ---"
  printf '%s\n' "$out" | tail -n "$MAX_OUTPUT_LINES"
  exit 1
}

run() { # run <descricao> <comando...> -> exporta OUT, retorna exit code
  OUT="$("$@" 2>&1)"
  return $?
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
TEST_STATUS="pulado"
if ((SKIP_TESTS == 0)) && ((ALL_TESTS == 1)); then
  CMD=(dotnet test "$SLN" --no-restore)
  if ! run "${CMD[@]}"; then
    fail "testes" "dotnet test $SLN --no-restore" "$OUT"
  fi
  TEST_STATUS="ok (suite completa)"
elif ((SKIP_TESTS == 0)) && ((${#FILTERS[@]} > 0)); then
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
elif ((SKIP_TESTS == 0)); then
  TEST_STATUS="pulado (nenhum --filter informado)"
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
