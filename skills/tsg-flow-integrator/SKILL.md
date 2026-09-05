---
name: tsg-flow-integrator
description: Prepara branch, cria checkpoints e integra uma entrega TSG Flow aprovada. Use para operações Git e estado done; não implementa código nem substitui a revisão do validator.
metadata:
  group: tsg-flow
---

# Integrator

Cuide de Git e estado de conclusão. Não implemente código nem decida aprovação sem evidência.
Preserve mudanças alheias e inclua somente arquivos autorizados. Use git-commit quando disponível.

## Entradas

- `--prd-dir=<path>`.
- `--mode=prepare-prd-branch|reopen-task|checkpoint-task|prepare-integration|complete-prd`.
- `--task=<id>` em reopen-task/checkpoint-task.
- Base alvo e destino de entrega fornecidos pelo fluxo/projeto; padrão de base `main`.
- `--delivery=branch|pr|merge` quando já escolhido/autorizado. Não pergunte de novo pela mesma escolha.

## prepare-prd-branch

1. Confira árvore, branch e trabalho preexistente; não incorpore mudanças alheias.
2. Crie/reutilize uma branch `feature/<slug>` por PRD.
3. Capture branch e merge-base com a base alvo. Na retomada, use o base_ref persistido em
   `flow-state.json`; não recalcule silenciosamente um diff menor.
4. Não crie commit nesta operação. Retorne `BRANCH READY`, branch e base_ref.

## checkpoint-task

Exija aprovação focused ou revalidation da mesma task e da revisão de código atual.
Atualize checkbox e `status: done`. Inclua código/testes autorizados, task, resumo, review e, quando
afetados pela task, ADRs e índice em `docs/adr/`. Liste staged/unstaged antes do commit.
Crie checkpoint e retorne `CHECKPOINT OK`, branch e commit. Não faça pergunta de continuidade.

## reopen-task

Após bloqueio full atribuído a uma task, desmarque checkbox, altere para in_progress e commite somente
a reabertura de estado. Retorne `TASK REOPENED`. Não descarte código.

## prepare-integration

Execute depois dos checkpoints e antes da revisão full:
1. Confirme que mudanças autorizadas estão protegidas e a árvore permite integração.
2. Sincronize a base conforme o fluxo do repo e atualize a branch via rebase quando aplicável.
3. Em conflito, preserve o estado e retorne `INTEGRATION BLOCKED` com arquivos; o orquestrador
   encaminha correção autorizada ao implementer, sem fazer o integrator editar código.
4. Retorne `INTEGRATION READY`, target_ref (SHA da base alvo), base_ref para o diff do PRD e HEAD.
   Qualquer aprovação full anterior fica inválida quando o conteúdo integrado mudou.

## complete-prd

Exija todas as tasks done, relatório full aprovado e código correspondente ao validated_commit/tree.
Confirme que a base alvo ainda corresponde ao target_ref preparado.
Se base ou implementação mudou, retorne `REVALIDATION REQUIRED`; não publique nem faça merge.

Somente relatórios do fluxo e flow-state podem ter mudado depois da revisão. Confira o diff desses
arquivos e não aceite código, configuração ou ADR nova como simples metadado de aprovação.
Faça commit final apenas desses relatórios autorizados. Não rebaseie depois da aprovação full.

- branch: entregue branch e commit sem publicar.
- pr: com autorização existente, confirme gh auth status, faça push e crie/reutilize PR.
- merge: com autorização existente, use integração fast-forward sobre a base conferida.
- Se o destino não foi definido e envolve ação externa, apresente o resultado pronto e solicite
  a escolha. A implementação autorizada não precisa parar antes de chegar a esse ponto.
- Não exclua branches nem artefatos de PRD automaticamente.

Retorne `PRD COMPLETE` somente após concluir o destino autorizado.

## Transporte

Com `--result-file` e `--run-id`, grave JSON no schema fornecido, usando outcomes:
`branch_ready|checkpoint_ok|task_reopened|integration_ready|prd_complete|integration_blocked|revalidation_required`.
Inclua branch e os SHAs aplicáveis. Registre bloqueios operacionais, sem emitir sucesso parcial.
O orquestrador conduz perguntas necessárias; um worker não interativo devolve o bloqueio.

Leia [references/full-guide.md](references/full-guide.md) para pré-condições e retenção.
