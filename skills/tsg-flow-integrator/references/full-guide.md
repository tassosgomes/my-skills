# Pré-condições Git e retenção

## Checkpoints

Confirme aprovação da task atual e arquivos autorizados. Liste staged/unstaged e preserve mudanças
do usuário. ADRs e docs/adr/index.md afetados pela task integram seu manifesto; não inclua todo docs/.
Se o commit falhar após atualização de status, reporte o estado parcial para reconciliação.
Retorno perdido após commit exige consultar Git antes de tentar novamente.

## Preparação para full

Prepare a integração com a base alvo antes do full. Guarde original_base_ref para histórico e
retorne base_ref/target_ref atuais para revisão do diff da feature. Não reduza o diff de uma entrega
já existente por recalcular a base silenciosamente na retomada.

Em conflito, retorne arquivos e estado Git preservado. O orquestrador encaminha correções dentro
da autoridade existente. Não use reset/checkout destrutivo nem finalize rebase com conflito oculto.

## Finalização

Compare o conteúdo atual com validated_commit/tree. Somente prd_review.md, N_task_review.md e
flow-state.json pertencentes ao PRD podem ter mudado como evidência; confira esses diffs.
Nenhum código, config, lockfile, contrato ou ADR pode ser incluído sem revisão correspondente.
Após commit de evidência, valide que a diferença continua restrita a essa lista.

Confirme que target_ref ainda corresponde à base alvo. Se mudou, retorne REVALIDATION REQUIRED.
Não rebaseie depois de uma aprovação e publique o novo código como se fosse a mesma revisão.
Crie/reutilize PR ou faça merge apenas conforme destino autorizado; branch é entrega local.
Falhas de autenticação/rede são bloqueios de integração, não falhas de qualidade.

## Retenção

ADRs em docs/adr/ sobrevivem ao PRD. A finalização não remove docs de planejamento automaticamente.
Uma futura operação de arquivamento deve preservar decisões autocontidas, contratos consumidos
por tooling e referências ativas. Use IDs e commits de origem para rastreabilidade histórica.
