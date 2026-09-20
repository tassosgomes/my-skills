---
name: tsg-flow-capability-backlog
description: >
  Transforma a visão do produto, o mapa de domínios e, opcionalmente, a referência arquitetural em um
  backlog priorizado de capacidades de negócio. Use quando for necessário definir o MVP, organizar a
  evolução por fases ou sequenciar capacidades antes de detalhar domínios e criar PRDs.
metadata:
  group: tsg-flow
---
# Backlog de Capacidades

Atuar como estrategista de produto responsável por transformar a visão do produto, o mapa de domínios
e os fluxos de negócio em capacidades executáveis e orientadas a valor.

Produzir um backlog estruturado de capacidades que represente valor de negócio significativo.

Cada capacidade deve poder dar origem posteriormente a um PRD independente.

--------------------------------
ENTRADAS
--------------------------------

- vision.md
- context/domain-map.md
- context/architecture-baseline.md (opcional)

--------------------------------
REGRAS
--------------------------------

- As capacidades devem representar valor de negócio.
- Não criar tarefas técnicas.
- **Rastrear a origem na visão.** Quando a visão numera capacidades de negócio próprias
  (`C01`, `C02`, ...) como insumo do Domain Map, cada `CAP-XXX` declara de qual delas deriva. Sem
  esse elo, a visão e o backlog falam da mesma capacidade em dois idiomas que nada liga — e uma
  divergência de fase entre os dois (a visão diz Fase 2, o backlog diz MVP) fica invisível para
  qualquer verificação, sobrevivendo até alguém tentar implementar. Derivação de muitos para muitos
  é normal: declare todas as origens.
- **Reconciliar nos dois sentidos.** Divergir da visão quanto à fase de uma capacidade é legítimo e
  frequente — a visão fatia por ambição de produto, o backlog por dependência real. Mas a
  divergência tem duas consequências, não uma: registre o risco com dono para a decisão de negócio
  **e** declare o impacto no agrupamento de serviços do baseline, quando ele estiver disponível.
  Antecipar uma capacidade sem isso deixa dois documentos aprovados em contradição silenciosa, que
  só aparece quando alguém tenta implementar.
- Evitar capacidades grandes demais.
- Evitar capacidades pequenas demais.
- Fazer cada capacidade completar um ciclo de valor.

--------------------------------
FASE 1 — ANÁLISE ESTRATÉGICA
--------------------------------

Analisar:

1. Quais domínios são críticos para o MVP.
2. Quais são os fluxos centrais de negócio.
3. Quais dependências existem entre os domínios.
4. Quais fases de evolução são possíveis.
5. Quais restrições ou limites da referência arquitetural devem ser respeitados, quando ela estiver
   disponível.

--------------------------------
FASE 2 — GERAÇÃO DE CAPACIDADES
--------------------------------

Para cada domínio, gerar:

Use um ID estável por capacidade (`CAP-001`, `CAP-002`, ...). Preserve IDs ao atualizar.
Domain Documents e PRDs devem referenciar a capacidade selecionada e suas dependências.
Herde decisões existentes e pergunte apenas por prioridades ou fronteiras ainda indefinidas.

## Domínio: <Nome>

### Capacidade: <Nome da Capacidade>

Objetivo:
O que esta capacidade permite realizar.

Valor de negócio:
Por que esta capacidade é importante.

Resumo do fluxo:
Descrição de alto nível do fluxo de negócio.

Dependências:
Outras capacidades ou domínios necessários.

Origem na visão:
CNN da visão de que esta capacidade deriva (uma ou mais). Omitir só quando a visão não numera
capacidades próprias.

Prioridade:
Alta / Média / Baixa

Fase recomendada:
MVP / Fase 2 / Fase 3 — quando divergir da fase que a visão deu à origem, diga qual era e por que
muda. Divergência sem o par "origem + motivo" é contradição silenciosa, não decisão.

--------------------------------
FASE 3 — SEQUENCIAMENTO
--------------------------------

Depois de listar as capacidades:

1. Identificar as dependências entre as capacidades.
2. Definir um MVP coerente.
3. Sugerir a ordem de implementação.
4. Destacar os riscos estratégicos.
5. Conferir cada capacidade antecipada ou adiada em relação à visão contra o baseline: a unidade de
   deploy que a serve foi agrupada de forma compatível com a nova fase? Se não, registre a
   consequência junto do risco — é a única etapa do fluxo que enxerga fase e dependência ao mesmo
   tempo, porque o baseline roda antes e o PRD roda depois.

--------------------------------
SAÍDA
--------------------------------

Gerar:

backlog/capabilities.md

## Frontmatter e estado

Grave no topo do documento:

```yaml
---
tsg_artifact: capability-backlog
product: <nome do produto>
version: <versão deste documento>
status: draft | in_review | approved | superseded
updated: <YYYY-MM-DD>
sources: vision.md@<versão>, context/domain-map.md@<versão>, context/architecture-baseline.md@<versão>
---
```

`sources` declara a **versão corrente de cada origem no momento da escrita**. É o que permite
detectar depois que uma origem mudou e este documento não foi revisitado — sem isso, a procedência
em prosa envelhece em silêncio e ninguém consegue afirmar se o documento ainda vale.

Ao concluir, registre o artefato em `flow-state.json`. O formato canônico do frontmatter e do
estado, e o gate que os verifica, estão em `tsg-flow-next/references/flow-state.md`.

Usar a seguinte estrutura:

# Backlog de Capacidades

## Estratégia de Sequenciamento

## Definição do MVP

## Capacidades por Domínio

## Dependências entre Capacidades

## Riscos Estratégicos
