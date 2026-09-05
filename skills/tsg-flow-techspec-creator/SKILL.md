---
name: tsg-flow-techspec-creator
description: Cria ou atualiza a especificação técnica de backend ou de uma feature sem API, a partir de PRD. Define fatias, artefatos e decisões arquiteturais duráveis; para UI use frontend-techspec-creator.
metadata:
  group: tsg-flow
  pipeline_stage: techspec
  requires:
    - "tasks/prd-[slug]/prd.md"
  produces:
    - "tasks/prd-[slug]/techspec.md"
    - "docs/adr/adr-NNN.md (quando houver decisão nova)"
---

# TechSpec Creator

Traduza o PRD em uma implementação verificável, respeitando a arquitetura existente.

## Entradas

- `tasks/prd-<slug>/prd.md` aprovado ou aprovação equivalente registrada pelo usuário.
- Quando disponíveis: `vision.md`, `context/domain-map.md`,
  `context/architecture-baseline.md`, `domains/<dominio>/domain.md`,
  capacidade selecionada em `backlog/capabilities.md`, contrato de API e ADRs relevantes.
- Saída: `tasks/prd-<slug>/techspec.md`. Respeite caminhos já definidos pelo projeto.

## Contexto e decisões

1. Identifique a stack pelas instruções do projeto, manifests, CI, configuração e código existente.
   Skills instaladas oferecem orientação; sua presença não comprova a stack.
2. Selecione skills disponíveis para decisões efetivamente envolvidas. Não leia todas por rotina.
   Sem skill específica, use as convenções verificadas do projeto e registre limitações relevantes.
3. Leia o PRD e explore arquivos, símbolos, chamadores, testes e configurações afetados.
   Em projeto novo, registre a ausência de código e use as restrições explícitas.
4. Herde baseline e ADRs antes de propor arquitetura. No modo API-first, o contrato define
   endpoints, schemas, autenticação e erros; referencie seus operationIds sem duplicar schemas.
5. Pergunte somente por lacunas que mudam comportamento, contrato, dados ou arquitetura.
   Resolva escolhas locais pelas convenções existentes; não imponha número mínimo de perguntas.
6. Se contrato, baseline e PRD divergirem, apresente o conflito e resolva a decisão material antes
   de aprovar o handoff. Não invente alternativas ou ADRs apenas para preencher uma quota.

## Especificação e persistência

Leia [templates/techspec-template.md](templates/techspec-template.md) ao redigir e
[references/delivery-contract.md](references/delivery-contract.md) para persistência e ADRs.

- Mapeie requisitos e regras para fatias verticais com entrada, processamento, saída e teste.
- Liste artefatos concretos por fatia: código, testes, configuração, observabilidade e documentação
  apenas quando necessários. Declare referências seletivas e skills aplicáveis.
- Ordene fatias por dependência e valor; cada checkpoint deve compilar e provar o incremento.
- Habilitadores horizontais são exceções justificadas, com evidência estática e fatia desbloqueada.
- Registre decisões fechadas, liberdade de implementação e limites ainda não resolvidos.
- Grave `techspec.draft.md` com status `Em Revisão`; releia e apresente resumo e link.
- Reutilize autorização explícita para decisões já aprovadas. Quando houver decisão nova material,
  obtenha sua aprovação sobre o draft antes de promover `techspec.md` com status `Aprovado`.
- Preserve a especificação canônica durante atualizações e altere apenas o escopo solicitado.

## ADRs duráveis

Consulte `docs/adr/index.md` e leia somente ADRs relacionadas. Crie uma ADR apenas para decisão
arquitetural nova ou alteração significativa de decisão existente; referências herdadas podem bastar.
Use [templates/adr-template.md](templates/adr-template.md) e o ciclo descrito no contrato de entrega.
ADRs ficam em `docs/adr/adr-NNN.md`, com numeração global compartilhada entre features e frontend/backend.
Seu contexto e racional devem sobreviver à remoção do PRD.

## Entrega

Informe caminhos, decisões novas/herdadas, ADRs afetadas, mapa de fatias e pendências.
Não repita arquivos completos. O Task Creator consome esta TechSpec e, quando aplicável,
`frontend-techspec.md`, gerando um único plano para a feature.
