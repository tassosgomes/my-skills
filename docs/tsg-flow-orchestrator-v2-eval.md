# Orchestrator v1 × v2 — roteiro de comparação

A v2 (`skills/tsg-flow-orchestrator-v2/`) junta coordinator, implementer, validator e integrator numa
skill só, com um `SKILL.md` que apenas roteia para `roles/<papel>.md` e as regras de gate num
`references/gate-contract.md` compartilhado. A v1 (`tsg-flow-orchestrator` e as três skills de
worker) não foi alterada. Este roteiro decide se a v2 substitui a v1.

## O que muda entre as duas

| | v1 | v2 |
|---|---|---|
| Skills instaladas | 4 | 1 |
| Worker chamado como | `tsg-flow-implementer ...` | `tsg-flow-orchestrator-v2 --role=implementer ...` |
| Regras de gate | repetidas no implementer e no validator | uma vez, em `gate-contract.md` |
| Linhas que o implementer carrega | 118 | 186 (roteador 28 + papel 74 + contrato 84) |
| Linhas que o validator carrega | 189 | 246 (roteador 28 + papel 134 + contrato 84) |
| Ledger padrão | `.tsg-flow/delegate-logs/` | `.tsg-flow/delegate-logs-v2/` |

Roteamento (inclusive perfis e `anti_affinity.by`), escalonamento, anti-afinidade, schema do
resultado e `run-state.json` são idênticos. A
suíte de transporte passa igual nas duas (`TSG_DELEGATE_SKILL=tsg-flow-orchestrator-v2 node --test
tests/tsg-flow.test.mjs`).

## Preparação

1. Instale as duas no projeto de teste: o grupo `tsg-flow` e, à parte,
   `npx skills add tassosgomes/my-skills/tsg-flow-orchestrator-v2`.
2. Use **o mesmo plano aprovado** nas duas, em diretórios de trabalho distintos — por exemplo,
   copie `work/cap-001-x/` para `work/cap-001-x-v2/` antes de começar. Mesma base, mesmo
   `routing.json`.
3. Chame cada versão **pelo nome**. Com as duas instaladas, um pedido genérico ("execute o PRD")
   pode cair em qualquer uma.
   - v1: `tsg-flow-orchestrator --prd-dir=work/cap-001-x --transport=herdr`
   - v2: `tsg-flow-orchestrator-v2 --prd-dir=work/cap-001-x-v2 --transport=herdr`
4. Rode pelo menos uma vez em Herdr com dois agentes diferentes (o padrão do
   `routing.default.json` já faz isso) e uma vez no transporte por subagente. Com um agente só,
   use perfis de modelos diferentes e `anti_affinity.by: "model"`, e anote isso no registro: a
   revisão fica menos independente, e o resultado não é comparável a uma rodada com dois agentes.

## O que verificar — risco principal: vazamento de papel

É o risco que só a execução real mostra: o worker da v2 ler outro papel e agir fora do seu.

| Sinal | Onde olhar | Reprova a v2 se |
|---|---|---|
| Validator corrigiu código | diff entre o fim da implementação e o fim da revisão | qualquer arquivo de código mudou na revisão |
| Implementer fez commit ou mexeu em estado | `git log`, `tasks.md`, frontmatter da task, `run-state.json` | commit ou status alterado pelo implementer |
| Worker se comportou como coordenador | relatório e LOG do run | delegou para outro worker, tentou abrir pane, falou em "próxima task" |
| Papel errado | RESULT do run | `role` no JSON diferente do pedido, ou erro de uso inesperado |
| Leu arquivo de outro papel | transcript do worker (`agent read <pane>` ou log da CLI) | abriu `roles/` além do seu |

O último sinal é o mais direto. Se o runtime mostrar as leituras de arquivo, confira em todos os
runs da v2.

## O que comparar — custo e resultado

Do ledger de cada versão:

```bash
for d in delegate-logs delegate-logs-v2; do
  echo "== $d"
  jq -rs 'group_by(.role + "/" + (.profile // .kind))[]
    | {role: .[0].role, perfil: (.[0].profile // .[0].kind), chamadas: length,
    ok: ([.[] | select(.result == "ok")] | length),
    gate_reprovado: ([.[] | select(.outcome == "gate_failed" or .outcome == "rejected")] | length),
    s: ([.[].elapsed_s] | add)}' .tsg-flow/$d/runs.jsonl
done
```

Registre à mão o que o ledger não cobre:

- **tokens por papel**, do runtime. O worker da v2 carrega mais texto; a pergunta é se isso aparece
  no custo por entrega aprovada;
- tentativas até aprovar cada task e retrabalho detectado só na full;
- divergência de comportamento entre implementer e validator sobre o mesmo gate — a v1 tem duas
  redações das regras, a v2 uma;
- perguntas ou bloqueios desnecessários.

## Critério de decisão

- **Adota a v2** se nenhum sinal de vazamento aparecer, as tentativas e as aprovações ficarem
  equivalentes e o custo em tokens por entrega não subir de forma material.
- **Fica com a v1 e só extrai o contrato** se houver vazamento de papel, ou se o custo por worker
  subir sem ganho em tentativas. Nesse caso, o `gate-contract.md` ainda pode entrar como referência
  compartilhada entre as skills da v1.
- Adotada a v2: renomeie para `tsg-flow-orchestrator`, volte o ledger para `delegate-logs/`, remova
  as três skills de worker, atualize docs, README e marketplace, e registre no changelog que os
  workers antigos instalados ficam órfãos e devem ser desinstalados.
