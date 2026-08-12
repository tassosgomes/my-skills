---
name: tsg-flow-capability-backlog
description: >
  Transforma a visão do produto, o mapa de domínios e, opcionalmente, a referência arquitetural em um
  backlog priorizado de capacidades de negócio. Use quando for necessário definir o MVP, organizar a
  evolução por fases ou sequenciar capacidades antes de detalhar domínios e criar PRDs.
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

Prioridade:
Alta / Média / Baixa

Fase recomendada:
MVP / Fase 2 / Fase 3

--------------------------------
FASE 3 — SEQUENCIAMENTO
--------------------------------

Depois de listar as capacidades:

1. Identificar as dependências entre as capacidades.
2. Definir um MVP coerente.
3. Sugerir a ordem de implementação.
4. Destacar os riscos estratégicos.

--------------------------------
SAÍDA
--------------------------------

Gerar:

backlog/capabilities.md

Usar a seguinte estrutura:

# Backlog de Capacidades

## Estratégia de Sequenciamento

## Definição do MVP

## Capacidades por Domínio

## Dependências entre Capacidades

## Riscos Estratégicos
