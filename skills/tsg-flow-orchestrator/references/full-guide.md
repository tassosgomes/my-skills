# Estado de execução e retomada

Leia ao iniciar/retomar um PRD. O SKILL.md define o ciclo; esta referência define sua memória operacional.

## flow-state.json

O orquestrador mantém `{PRD_DIR}/flow-state.json`, escrito atomicamente por arquivo temporário e rename
ou mecanismo de edição equivalente. Não contém credenciais nem transcripts completos.

```json
{
  "schema_version": 1,
  "branch": "feature/exemplo",
  "original_base_ref": "sha-inicial",
  "base_ref": "sha-do-diff-atual",
  "target_ref": null,
  "last_checkpoint": null,
  "phase": "implement",
  "active_task": "1.0",
  "attempt": 1,
  "max_attempts": 3,
  "full_attempt": 0,
  "transport_retries": 0,
  "specs": ["frontend-techspec.md"],
  "delivery": "branch",
  "validated_commit": null,
  "validated_tree": null,
  "last_result": null,
  "history": []
}
```

Registre a delegação pendente antes de lançá-la: run_id quando disponível, papel, modo, task e
tentativa. Após retorno, armazene outcome e caminho do resultado/relatório. Avance a fase só depois
de verificar as pré-condições. Guarde no history apenas transições/intervenções significativas;
detalhes permanecem nos reviews e logs.

O integrator devolve SHAs; o orquestrador grava last_checkpoint. O arquivo de estado pode ficar uma
gravação à frente do commit; no próximo checkpoint/final, inclua-o se autorizado. Não tente fazer um
commit conter seu próprio SHA. Git e relatórios são evidência para reconciliar essa diferença.

## Retomada

1. Confirme branch, HEAD, tasks e última delegação.
2. Se o worker foi interrompido, confira resultado por run_id, diff e commits antes de repetir.
   Falha de transporte pode ocorrer depois de uma escrita ou commit bem-sucedido.
3. Checkpoint existente e task done: atualize o estado atrasado, sem duplicar commit.
4. Task done sem checkpoint: não avance; reconcilie com integrator.
5. In_progress sem resultado: preserve diff e determine se é correção ou operação pendente.
6. Blocked: retome somente após resolver o motivo. Registre a intervenção e nova rodada; não apague
   contadores/histórico da rodada anterior.
7. Base alvo mudou: invalide aprovação full, prepare integração e revise o resultado novamente.

## Aprovações e orçamento

Registre revisão high já feita por task/revisão do plano; não peça novamente sem mudança material.
Preserve destino de entrega autorizado. Infraestrutura tem contador separado de convergência.
Ao parar, informe task, tentativas, último checkpoint, pendências, evidência e próxima ação concreta.

## Medição

Use os próprios resultados e reviews para duração, tentativa, quantidade de gates e suporte aberto.
Compare tokens por entrega aprovada usando métricas disponíveis do runtime; não estime economia
somente pelo número de linhas das skills. Não crie um sistema de telemetria paralelo ao fluxo.
