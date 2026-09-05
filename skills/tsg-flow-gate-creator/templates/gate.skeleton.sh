#!/usr/bin/env bash
#
# Gate deterministico do TSG Flow — ESQUELETO
#
# Preencha os blocos marcados [[STACK: ...]] usando a tabela de traducao da skill
# `tsg-flow-gate-creator`. Nao altere a estrutura: o contrato em gate.contract.md
# depende do formato de saida e dos codigos de retorno.
#
# Uso:
#   scripts/ai-flow/gate.sh [--filter=<expr>]... [--base=<ref>] [--all-tests] [--static] [--skip-tests]
#
# Saida: bloco compacto (<= ~60 linhas). Exit 0 = APROVADO, 1 = REPROVADO, 2 = erro.

set -uo pipefail

MAX_OUTPUT_LINES=40
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
    --skip-tests)  SKIP_TESTS=1 ;;
    --static)      STATIC=1 ;;
    -h|--help)     sed -n '2,14p' "$0"; exit 0 ;;
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

# ---------------------------------------------------------------------------
# Escopo: arquivos alterados desde BASE_REF (= checkpoint focused ou base do PRD)
# INVARIANTE 1 — nunca rode format/lint sobre o projeto inteiro.
# ---------------------------------------------------------------------------
# [[STACK: extensoes de codigo-fonte da linguagem, ex: \.cs$ | \.java$ | \.(ts|tsx|js|jsx)$ ]]
SOURCE_EXT_REGEX='\.EXT$'

mapfile -d '' -t CHANGED < <(
  { git diff --name-only -z "$BASE_REF" --
    git ls-files --others --exclude-standard -z
  } | sort -zu
)
CHANGED_SRC=()
for file in "${CHANGED[@]}"; do
  # Deletados contam no diff, mas nao sao passados a formatadores.
  if [[ -f "$file" && "$file" =~ $SOURCE_EXT_REGEX ]]; then
    CHANGED_SRC+=("$file")
  fi
done

fail() { # fail <etapa> <comando> <output>
  echo "GATE: REPROVADO"
  echo "etapa: $1"
  echo "comando: $2"
  echo "--- output (ultimas ${MAX_OUTPUT_LINES} linhas) ---"
  printf '%s\n' "$3" | tail -n "$MAX_OUTPUT_LINES"   # INVARIANTE 3
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
# 1. Formatacao / lint — ESCOPADO nos arquivos alterados (INVARIANTE 1)
# ---------------------------------------------------------------------------
FORMAT_STATUS="pulado (nenhum fonte alterado)"
if ((${#CHANGED_SRC[@]} > 0)); then
  # [[STACK: comando de format/lint que aceita lista de arquivos ]]
  CMD=(FORMAT_TOOL --check "${CHANGED_SRC[@]}")
  if ! run "${CMD[@]}"; then
    fail "format" "FORMAT_TOOL --check <${#CHANGED_SRC[@]} arquivos da task>" "$OUT"
  fi
  FORMAT_STATUS="ok (${#CHANGED_SRC[@]} arquivos)"
fi

# ---------------------------------------------------------------------------
# 2. Build / typecheck
# ---------------------------------------------------------------------------
# [[STACK: comando de build; em linguagens sem build, use o typechecker ]]
CMD=(BUILD_TOOL)
if ! run "${CMD[@]}"; then
  fail "build" "BUILD_TOOL" "$OUT"
fi
# [[STACK: opcional — extraia contagem de erros/warnings do output ]]
BUILD_STATUS="ok"

# ---------------------------------------------------------------------------
# 3. Testes — com DETECCAO DE FILTRO VAZIO (INVARIANTE 2)
# ---------------------------------------------------------------------------
TEST_STATUS="nao aplicavel (static)"
((SKIP_TESTS == 1)) && TEST_STATUS="pulado (diagnostico; nao aprova task)"
if ((SKIP_TESTS == 0 && STATIC == 0)) && ((ALL_TESTS == 1)); then
  # [[STACK: comando da suite completa do repositorio; reservado ao full do PRD ]]
  CMD=(ALL_TESTS_TOOL)
  if ! run "${CMD[@]}"; then
    fail "testes" "ALL_TESTS_TOOL" "$OUT"
  fi
  TEST_STATUS="ok (suite completa)"
elif ((SKIP_TESTS == 0 && STATIC == 0)) && ((${#FILTERS[@]} > 0)); then
  RESULTS=()
  for f in "${FILTERS[@]}"; do
    # [[STACK: comando de teste com filtro; DESABILITE flags do tipo
    #    --passWithNoTests que mascaram suite ausente ]]
    CMD=(TEST_TOOL --filter "$f")
    RC=0; run "${CMD[@]}" || RC=$?

    # [[STACK: deteccao de "nenhum teste selecionado" — ver tabela por runner na skill.
    #    Duas formas: (a) codigo de saida dedicado, (b) parse da contagem de testes. ]]
    COUNT="$(printf '%s\n' "$OUT" | grep -oE 'PASSED_PATTERN[[:space:]]+[0-9]+' \
             | grep -oE '[0-9]+' | awk '{s+=$1} END {print s+0}')"

    if ((RC != 0)); then
      fail "testes" "TEST_TOOL --filter \"$f\"" "$OUT"
    fi
    if [[ "${COUNT:-0}" == "0" ]]; then
      fail "testes" "TEST_TOOL --filter \"$f\"" \
        "Filtro nao selecionou nenhum teste. A suite exigida pela task provavelmente nao existe.
$OUT"
    fi
    RESULTS+=("$f=${COUNT}")
  done
  TEST_STATUS="ok (${RESULTS[*]})"

fi

# ---------------------------------------------------------------------------
# 4. Higiene do diff (agnostico de stack)
# ---------------------------------------------------------------------------
if ! run git diff --check "$BASE_REF" --; then
  fail "diff-check" "git diff --check $BASE_REF" "$OUT"
fi

echo "GATE: APROVADO"
echo "arquivos alterados: ${#CHANGED[@]} (fontes: ${#CHANGED_SRC[@]})"
echo "format: $FORMAT_STATUS"
echo "build: $BUILD_STATUS"
echo "testes: $TEST_STATUS"
exit 0
