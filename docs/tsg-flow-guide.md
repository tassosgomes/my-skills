# TSG Flow — guia de uso e contratos

Comece pela [ordem de execução](tsg-flow-execution-order.md). O
[diagrama](diagrams/tsg-flow-pipeline.md) mostra planejamento, execução e decisões duráveis.

## Instalação e escopo

`skills/` é a fonte canônica. O grupo tsg-flow em
[marketplace.json](../.claude-plugin/marketplace.json) contém as 15 skills.
Instale também somente as skills de tecnologia necessárias ao projeto. As instruções do projeto,
manifests, CI e código determinam a stack; skills instaladas não a determinam.

Não é necessário executar toda a cadeia em toda mudança. Reutilize visão, domínios, baseline, ADRs,
contratos e gate enquanto suas premissas continuarem válidas. Uma correção pequena pode seguir
o fluxo direto do repositório.

## Organização dos artefatos

```text
vision.md                              # direção do produto, reutilizável
context/domain-map.md                  # fronteiras de domínio
context/architecture-baseline.md       # princípios e restrições estruturais
backlog/capabilities.md                 # priorização por capacidade (opcional)
domains/<dominio>/domain.md             # regras e features do domínio
docs/
  adr/
    index.md                           # catálogo global de decisões
    adr-001.md                         # Proposed/Accepted/Withdrawn/Superseded
  product-decisions/                    # decisões duráveis de produto
  api/                                 # exemplo de contrato durável, se adotado pelo projeto
tasks/prd-<slug>/
  prd.md
  techspec.md                          # backend/geral, quando aplicável
  frontend-techspec.md                 # frontend, quando aplicável
  tasks.md
  1.0_task.md
  1.0_task_review.md
  prd_review.md
  flow-state.json                     # retomada durante a execução
scripts/ai-flow/
  gate.sh
  gate.contract.md
```

Drafts de especificação usam .draft.md no diretório da feature. A versão aprovada permanece
disponível durante updates. Aprovações explícitas já dadas para o mesmo escopo continuam válidas;
decisões materiais novas precisam de revisão. Salve o draft antes de solicitar essa revisão.

## ADRs sobrevivem ao PRD

ADRs são documentação do sistema, não entregáveis descartáveis da feature. Todas as etapas técnicas
usam `docs/adr/adr-NNN.md`, com numeração global compartilhada entre features e frontend/backend.
O índice mínimo é:

| ID | Título | Status | Escopo | Documento |
|---|---|---|---|---|
| ADR-001 | [decisão] | Proposed | [domínio/componentes] | [adr-001.md] |

1. Consulte índice e decisões relevantes antes de criar outra ADR.
2. Registre apenas decisão nova ou mudança arquitetural significativa; aplicar uma decisão
   existente não exige outra ADR.
3. Reserve o próximo ID considerando todos os estados. Não sobrescreva nem reutilize números.
4. Salve desde o draft em docs/adr/adr-NNN.md com status Proposed e entrada no índice.
5. Após aprovação da decisão, use Accepted. Se abandonada, preserve como Withdrawn.
6. Para substituir uma decisão aceita, crie nova ADR, referencie a antiga e marque a anterior como
   Superseded by ADR-NNN após aprovação.

Cada ADR explica contexto, escopo, restrições, decisão, alternativas pertinentes e consequências.
O PRD pode aparecer como origem histórica (slug/commit), mas não pode ser a única explicação.
Links entre ADRs são locais. Em uma TechSpec em tasks/prd-<slug>/, links para decisões usam
`../../docs/adr/adr-NNN.md`.

Em sessões concorrentes, serialize a reserva dos IDs ou use o mecanismo de coordenação do projeto.
O fluxo standard executa uma etapa por vez.

### ADRs antigas dentro de PRDs

A migração deve inventariar arquivos e referências, resolver IDs repetidos e manter mapeamento
antigo → novo. Preserve datas, status, racional e origem; atualize links dos documentos ativos e
arquivados que continuarem no repositório. Não mantenha cópias concorrentes como fontes canônicas.

Este repositório contém skills/templates, não os PRDs dos projetos consumidores. As instruções
orientam novas entregas e migrações autorizadas; não movem automaticamente arquivos em outros repos.

### Arquivamento do planejamento

PRDs e tasks podem ser arquivados/removidos em operação posterior autorizada. Antes disso, confirme:

- ADRs e decisões de produto têm contexto autocontido em docs/.
- Contratos usados por geração de tipos, mocks, testes ou documentação permanecem no local canônico.
- Referências ativas não dependem exclusivamente dos documentos a remover.
- Commits/PRs guardam a origem da entrega quando necessário.

Não arquive automaticamente ao concluir a implementação.

## Contrato entre planejamento e execução

Task Creator consome PRD e specs aprovadas selecionadas pelo escopo:
backend → techspec.md; frontend → frontend-techspec.md; full-stack → ambas.
Produz um único tasks.md e arquivos individuais. IDs de capacidade, feature, RF, RN e ADR são
mantidos para rastreabilidade.

| Task | Verificação | Gate |
|---|---|---|
| vertical | behavioral, teste do incremento na própria task | --filter com selector não vazio |
| enabling | static, justificativa e evidência específica | --static |
| enabling com comportamento testável | behavioral | --filter |
| full do PRD | suíte agregada e revisão do diff integrado | --base=<sha> --all-tests |

Se o projeto não tiver suíte e o plano for inteiramente estático, o full pode usar --static com
justificativa explícita. Isso não equivale a testar comportamento.
--skip-tests é somente diagnóstico; nenhuma seleção e flags conflitantes são erro de uso.

Todo artefato usado para compilar/testar precisa preexistir, ser criado pela task ou vir de dependência
anterior declarada. O campo parallelizable registra oportunidade; o executor standard é sequencial.
Todas as complexidades recebem gate e validator. High pede revisão do plano se ainda não ocorreu.

## Execução, estado e tentativas

Orchestrator é dono de in_progress, validating, blocked e flow-state.json. Integrator é dono de done,
checkbox e commits. Implementer altera código; validator produz evidência sem corrigir.

O estado persistido registra branch, bases, checkpoint, task, tentativas, fase e último resultado.
Retome lendo-o e reconciliando com Git, tasks e reviews. Não reinicie tentativas por mudança de
conversa. Um timeout pode acontecer depois de efeitos reais: confira escritas/commits antes do retry.

O limite padrão é 3 tentativas de implementação/gate/revisão, configurável até 5. Falhas de gate
por código contam; erro de ambiente/uso/transporte não conta e tem até duas repetições seguras.
Recomendações opcionais não geram retry. Ao bloquear, preserve mudanças e reporte evidência.

A primeira revisão semântica é focused. Após correção de bloqueios revisados, use revalidation,
conferindo também regressões no diff novo. Uma falha anterior apenas do gate ainda exige a primeira
revisão focused.

## Aprovação e integração

Depois dos checkpoints, integrator prepara a branch contra a base alvo. Só então validator executa
full e registra base_ref, validated_commit e validated_tree.

Complete-prd confere código e base antes de entregar. Mudança de base ou implementação exige preparar
integração/revalidar. Relatórios e estado operacional podem entrar em commit final após conferência;
ADRs, contratos, configurações e código novos não são meros metadados.

O destino pode ser branch local, PR ou merge conforme autorização existente. O fluxo não pergunta
novamente por destino já escolhido e não publica uma entrega sem autorização. Não rebaseia código
depois do full para publicá-lo como se ainda fosse a mesma revisão.

## Transporte e custo

Subagente fresco é o padrão. Herdr usa pane/agente novo, JSON por run_id e relatório da chamada.
Consulte [contrato do transporte](../skills/tsg-flow-orchestrator/references/transport.md).
Resultado de transporte válido não significa aprovação; TASK READY é somente preflight.

Mantenha as tasks coesas, leia referências sob demanda e envie caminhos aos workers. Não repita
documentos no chat. Use compute para builds/testes pesados e infra para serviços quando disponíveis.
O gate ainda roda em implementer e validator: não há cache automático de aprovação sem comprovar
igualdade de código, comandos, dependências e ambiente.

Meça tentativas, duração, gates e tokens por entrega aprovada a partir dos reviews/logs e métricas
do runtime. Redução de texto das skills não é uma medida direta de economia por entrega.

## Verificação deste pacote

`node --test tests/tsg-flow.test.mjs` executa fixtures locais para o transporte e o contrato dos gates.
Os mocks não executam modelos, Herdr real nem builds de aplicações.
Os cenários de avaliação de uso estão em [avaliações do fluxo](tsg-flow-evaluations.md).
