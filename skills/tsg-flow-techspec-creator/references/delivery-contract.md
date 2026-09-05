# Entrega da TechSpec e ciclo de ADRs

## Especificações temporárias

Grave `tasks/prd-<slug>/techspec.draft.md` com status `Em Revisão`. Preserve a versão aprovada
durante updates. Releia o draft, confira rastreabilidade e apresente resumo e link.
Após aprovação das decisões novas, promova para `techspec.md`, status `Aprovado`.
Aprovação explícita já concedida para o mesmo escopo pode ser registrada sem uma nova pergunta.
Draft não é handoff executável para Task Creator.

Cada fatia deve declarar entrada, regra/processamento, saída, arquivos, teste e checkpoint.
Inclua código, teste e observabilidade pertinente no mesmo incremento. Habilitadores horizontais
exigem justificativa, evidência própria e a primeira fatia desbloqueada.

## ADRs permanentes

1. Consulte `docs/adr/index.md` e leia somente decisões pertinentes. Referenciar decisões aceitas
   é suficiente quando a feature apenas aplica arquitetura existente.
2. Crie ADR apenas para decisão nova ou mudança significativa. Use o template da skill.
3. Reserve o próximo número global em `docs/adr/index.md`, considerando arquivos e entradas
   Proposed, Accepted, Withdrawn e Superseded. A numeração é compartilhada entre todas as features
   e frontend/backend; não reutilize nem sobrescreva IDs.
4. Grave `docs/adr/adr-NNN.md` desde o draft, com status `Proposed`. O status representa o ciclo
   de revisão; não é necessário sufixo .draft para uma ADR.
5. Torne o registro autocontido: contexto, escopo/domínios, forças/restrições, decisão, alternativas
   relevantes, consequências e referências duráveis. O PRD é origem histórica opcional, nunca a
   única explicação. Se útil, registre slug e commit da origem.
6. Após aprovação da decisão, altere para `Accepted` e atualize o índice. Se abandonada, mantenha
   o registro como `Withdrawn`.
7. Para substituir uma Accepted, crie nova ADR com `Substitui: ADR-NNN`; após aprovação, marque a
   anterior como `Superseded by ADR-NNN`. Não reescreva o histórico para ocultar a decisão anterior.

O índice contém ID, título, status, escopo e link relativo. O índice e as ADRs devem ser versionados.
Quando houver sessões concorrentes, serialize a reserva de IDs ou use o mecanismo do projeto;
verifique colisões antes de salvar. O TSG Flow standard não executa essas escritas em paralelo.

## Links e retenção

Na TechSpec em `tasks/prd-<slug>/`, use `../../docs/adr/adr-NNN.md`. Recalcule caminhos relativos
se a especificação estiver em outro diretório. Dentro de `docs/adr/`, links entre ADRs são locais.

A remoção/arquivamento do PRD não remove ADRs. Antes de descartar artefatos temporários, preserve
contratos usados por geração/testes no local canônico do projeto e corrija referências ativas.
Arquivar é uma operação separada da implementação; não apague PRDs automaticamente.

## Migração de ADRs antigas

Se houver ADRs em `tasks/prd-*/adrs/`, inventarie IDs e referências antes de mover. Preserve status,
datas e racional, atribua IDs globais sem colisão e registre o mapeamento antigo → novo no índice
ou registro de migração. Atualize links, incluindo documentos arquivados mantidos no repo.
Não deixe cópias concorrentes parecerem fontes canônicas. Respeite o escopo autorizado de migração.
