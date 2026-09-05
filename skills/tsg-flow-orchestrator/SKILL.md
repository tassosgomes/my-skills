---
name: tsg-flow-orchestrator
description: Coordena a execução sequencial de um PRD TSG Flow com tasks prontas, workers de implementação/revisão, checkpoints e validação full antes da entrega. Não use para uma correção pequena sem planejamento TSG.
metadata:
  group: tsg-flow
---

# Orchestrator

Coordene sem implementar código, revisar comportamento ou fazer Git diretamente.
Preserve uma branch por PRD, workers frescos e tentativas limitadas.

## Entradas

- `--prd-dir=<path>` obrigatório.
- `--profile=standard` (único perfil).
- `--max-attempts=3..5`, padrão 3.
- `--transport=subagent|herdr`, padrão subagent.
- `--delivery=branch|pr|merge` e base alvo, quando definidos/autorizados.

Mudanças pequenas podem usar o fluxo direto do projeto. Não crie PRD ou tasks apenas para executar
este orquestrador. Não repita aprovação humana já explícita para o mesmo plano e escopo.

## Inicialização e retomada

1. Leia `tasks.md`, próxima task e `flow-state.json` se existente.
2. Confira specs selecionadas (backend e/ou frontend), aprovação do plano e gate disponível.
   Exija contrato de verificação consistente: behavioral/filtro ou enabling/static.
3. Delegue `prepare-prd-branch` ao integrator; capture branch, base e último checkpoint.
4. Persista estado mínimo em `{PRD_DIR}/flow-state.json`: branch, original_base_ref, base_ref,
   target_ref, last_checkpoint, task ativa, tentativa, full_attempt, fase e último resultado.
   Leia [references/full-guide.md](references/full-guide.md) ao inicializar/retomar para o schema.
5. Reconcilie estado com Git, checkbox e frontmatter antes de qualquer repetição. Em divergência,
   investigue sem sobrescrever evidência. Nunca reinicie contadores só porque a conversa mudou.

## Ciclo por task

1. Confirme dependências done e revisão do plano de tasks high; reutilize revisão já registrada.
2. Defina status in_progress e registre a tentativa antes da delegação.
3. Delegue implementer em implement (primeira passagem) ou fix (bloqueios anteriores).
4. TASK BLOCKED: marque blocked, registre evidência e pare sem consumir tentativa.
   GATE ERROR/exit 2: trate como infraestrutura. GATE REPROVADO consome tentativa.
5. IMPLEMENTATION COMPLETE exige gate/evidências aprovados; TASK READY não comprova conclusão.
6. Defina validating. Delegue validator focused na primeira revisão e revalidation após correção
   de bloqueios já revisados. Se a falha anterior foi apenas do gate, a primeira revisão é focused.
7. Em rejeição, preserve bloqueios e encaminhe fix se houver orçamento.
8. Em aprovação, delegue checkpoint-task. Confirme commit, checkbox e status done; persista o hash.
9. Avance somente após o checkpoint. Todas as complexidades passam por focused no standard.

## Tentativas e intervenção

Uma tentativa é implementação/correção seguida por gate e, quando possível, revisão.
Persista o resultado antes de decidir o próximo passo. Recomendações não bloqueantes não geram retry.
Ao atingir o limite, marque blocked e reporte tentativas, bloqueios, último checkpoint seguro,
arquivos pendentes e ação necessária. Não descarte mudanças.

Falhas de transporte/infraestrutura não são vereditos nem consomem tentativa de convergência.
Antes de repetir uma delegação interrompida, reconcilie possíveis escritas/commits: timeout não
garante ausência de efeitos. Repita no máximo duas vezes se a repetição for segura; caso contrário,
pare com diagnóstico. Após intervenção que resolveu o bloqueio, registre nova rodada preservando
o histórico mínimo anterior no estado/relatório.

## Integração e revisão full

1. Após todos os checkpoints, delegue prepare-integration ao integrator.
2. Persista target_ref e base_ref retornados. Não valide uma branch que ainda será rebaseada.
3. Delegue validator full sobre o diff completo desde base_ref e specs selecionadas.
4. Em rejeição atribuída a task, delegue reopen-task; execute fix, focused/revalidation e checkpoint.
   Para lacuna sem dono, reporte planejamento insuficiente sem inventar task no orquestrador.
5. Conte ciclos de correção full com o mesmo limite e preserve evidências.
6. Após FULL VALIDATION APROVADA, persista validated_commit/tree e delegue complete-prd.
7. REVALIDATION REQUIRED por alteração da base/código invalida aprovação: prepare integração e
   valide o resultado novamente. Não conte mudança externa da base como defeito de implementação.
8. Finalize somente após PRD COMPLETE no destino autorizado. Uma escolha externa faltante é
   solicitada apenas com a entrega concreta pronta para revisão.

## Estados e propriedade

pending: Task Creator. in_progress/validating/blocked e flow-state: Orchestrator.
done, checkbox e commits: Integrator. Implementer/validator não alteram estado do fluxo.
Falha de commit não autoriza avançar com status done sem checkpoint; reconcilie os arquivos.

## Transporte

O transporte altera como delegar, não as responsabilidades nem as condições de sucesso.
Use uma delegação por vez; workers compartilham working tree e branch.

- **subagent:** worker fresco, com task, caminhos e evidência mínima. Não injete toda a conversa.
  Se o runtime não permitir revisão independente, informe a limitação; não a declare independente.
- **herdr:** leia [references/transport.md](references/transport.md) antes de usar
  `scripts/tsg-delegate.sh`. Cada chamada usa pane/agente novo e resultado JSON por run_id.
  Kind diferente pode oferecer diversidade de revisão, mas não garante ausência de pontos cegos.
  Use modelos configurados/autorizados, sem substituir escolhas explícitas.
- Não execute localmente etapas delegadas. Para runtime sem workers, resolva a limitação de
  transporte antes de iniciar; não simule uma revisão independente.
