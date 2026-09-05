# Contrato do Gate Determinístico do TSG Flow

Este arquivo é copiado para `scripts/ai-flow/` do repositório alvo. Ele define a
interface que `tsg-flow-validator`, `tsg-flow-implementer` e `tsg-flow-orchestrator`
dependem. **A implementação varia por linguagem; este contrato não.**

## Invocação

```bash
scripts/ai-flow/gate.sh [--filter=<expr>]... [--base=<ref>] [--all-tests | --static | --skip-tests] [--help]
```

- `--filter=<expr>` — expressão de seleção de testes, extraída dos critérios de
  sucesso verificáveis da task. Repetível. A sintaxe é da stack (ex.: `.NET`
  usa `FullyQualifiedName~X`, jest usa um regex de nome, pytest usa `-k`).
- `--base=<ref>` — referência Git usada para delimitar arquivos alterados. Sem a
  flag, use `HEAD`, adequado ao focused da task. No `full` do PRD, use o commit-base
  retornado por `prepare-prd-branch`.
- `--all-tests` — executa a suíte completa definida pelo repositório. Uso restrito
  ao `full` final do PRD; nunca é o padrão de uma task.
- `--skip-tests` — roda apenas format e build. Uso restrito a diagnóstico.
- `--static` — format/lint, build/typecheck e higiene do diff para task enabling com
  `verification_type: static`. Não comprova comportamento; a evidência específica da task também
  deve ser executada. No full, só é admissível para plano inteiramente estático justificado.

Exija seleção explícita: um ou mais filtros não vazios OU all-tests OU static OU skip-tests.
Ausência de seleção e combinações conflitantes retornam exit 2, nunca aprovação silenciosa.

Flags opcionais adicionais específicas da stack são permitidas (ex.: `--sln=<path>`
no .NET), desde que o gate funcione sem elas. Nenhum consumidor do contrato pode
depender de uma flag específica de stack.

## Saída

Exatamente um de dois blocos, em stdout.

**Aprovado:**

```text
GATE: APROVADO
arquivos alterados: <n> (<ext>: <n>)
format: <status>
build: <status>
testes: <status>
```

**Reprovado:**

```text
GATE: REPROVADO
etapa: format|build|testes|diff-check
comando: <comando exato que falhou>
--- output (ultimas N linhas) ---
<saida truncada>
```

## Códigos de saída

| Código | Significado |
|---|---|
| `0` | APROVADO |
| `1` | REPROVADO — uma etapa falhou |
| `2` | Erro de uso ou de ambiente (argumento inválido, fora de repo git, stack não detectada) |

Exit `2` é distinto de `1`: o validator trata `1` como reprovação da task e `2` como
falha de infraestrutura/uso. Retorne o erro ao orquestrador sem consumir tentativa de convergência;
não aprove usando fallback manual silencioso.

## Invariantes obrigatórios

Qualquer implementação DEVE garantir os quatro itens abaixo. Eles não são
detalhes — são a razão de o gate existir.

1. **Escopo no diff.** Format e lint rodam apenas sobre os arquivos alterados desde
   a referência escolhida (`git diff --name-only <base>` + untracked). O focused
   usa `HEAD`; o full usa o commit-base do PRD. Rodar sobre o projeto inteiro faz o
   gate reprovar código por débito pré-existente que a entrega não causou.

2. **Detecção de filtro vazio.** Se um `--filter` declarado pela task seleciona zero
   testes, o gate REPROVA. Sem isso, uma task que promete uma suíte e não a entrega
   passa no gate. É a falha mais comum e mais cara de detectar semanticamente.

3. **Saída truncada.** No máximo ~40 linhas do output do comando que falhou, e nada
   do output dos que passaram. O gate existe para não gastar contexto de LLM.

4. **Zero interatividade.** Nenhum prompt, nenhum pager, nenhum watch mode. Testes
   que exigem serviços externos (Testcontainers, Docker) devem falhar com mensagem
   clara em vez de pendurar.

Configure timeout por comando e ambiente não interativo. Valide a base Git antes de executar.
Use caminhos delimitados por NUL e retire arquivos deletados somente da lista do formatador.
Mudanças em manifests, lockfiles, contratos ou configs compartilhadas devem acionar as stacks
dependentes, mesmo sem alteração de extensão de código. Na dúvida, amplie o escopo da verificação.
Respeite compute para verificações pesadas e infra para serviços quando o projeto assim definir.

## Consumidores

- `tsg-flow-implementer` roda o gate antes de devolver a task ao orquestrador.
- `tsg-flow-validator` roda o gate como estágio 1; se reprovar, rejeita sem abrir
  PRD, TechSpec ou skills. No full, usa `--base` e `--all-tests`.

Mudar este contrato exige atualizar as três skills de fluxo. Mudar a implementação
para outra linguagem, não.
