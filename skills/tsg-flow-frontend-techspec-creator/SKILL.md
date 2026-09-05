---
name: tsg-flow-frontend-techspec-creator
description: Cria ou atualiza a especificação de uma feature frontend a partir de PRD, cobrindo UI, estado, integração e testes. Use contrato existente quando houver API; aceita UI sem integração remota.
metadata:
  group: tsg-flow
  pipeline_stage: frontend-techspec
  requires:
    - "tasks/prd-[slug]/prd.md"
  produces:
    - "tasks/prd-[slug]/frontend-techspec.md"
    - "docs/adr/adr-NNN.md (quando houver decisão nova)"
---

# Frontend TechSpec Creator

Especifique jornadas frontend completas, com seus testes e pontos de integração.

## Entradas

- PRD aprovado em `tasks/prd-<slug>/prd.md`.
- Se a feature consome ou altera uma API: contrato aprovado, normalmente `api-contract.yaml`.
  Aceite o contrato canônico existente no projeto; não exija uma cópia por PRD.
- Para UI sem integração remota, registre `API Contract: N/A — <motivo>`.
- Quando disponíveis: visão, Domain Map, Domain Doc, Architecture Baseline, capacidade selecionada,
  designs, `techspec.md` backend e ADRs pertinentes em `docs/adr/`.

## Processo

1. Confirme o escopo UI e se existe API. Se há integração sem contrato definido, resolva-a com
   `tsg-flow-contract-creator` antes de especificar schemas. Não invente contrato implicitamente.
2. Identifique stack e convenções em manifests, CI, configuração, componentes, rotas e testes.
   Selecione somente skills disponíveis necessárias; skills instaladas não definem a stack.
3. Extraia decisões existentes do baseline, ADRs e backend. Do contrato, leia operações/schemas
   usados pela feature; abra a versão Markdown apenas quando acrescentar informação necessária.
4. Explore componentes reutilizáveis, fetching, estado, estilos, acessibilidade, i18n e mocks
   conforme a jornada. Pergunte apenas sobre lacunas materiais, sem quota de perguntas.
5. Mapeie `user story → tela/componente → operationId ou ação local → teste`.
6. Organize fatias verticais: uma jornada com UI, estado/fetching, erros e teste no mesmo incremento.
   Não deixe todos os testes para o fim. Habilitadores exigem justificativa e evidência própria.
7. Leia [templates/frontend-techspec-template.md](templates/frontend-techspec-template.md) ao redigir.
   Preencha somente aspectos aplicáveis e mantenha schemas da API no contrato.
8. Grave `frontend-techspec.draft.md` com status `Em Revisão`, revise cobertura e mostre resumo/link.
   Preserve a versão aprovada durante updates.
9. Reutilize decisões e aprovações já explícitas. Após aprovação de decisões novas, promova para
   `frontend-techspec.md` com status `Aprovado`.

## Contrato e tipos

Gere os tipos de transporte a partir do contrato quando a ferramenta do projeto permitir.
Tipos locais de UI, formulários e estado não precisam pertencer à API.
Preserve o formato de erros, autenticação e paginação existentes; registre conflitos antes de mudar.
Planeje geração e mocks usando ferramentas já adotadas, sem impor uma biblioteca nova.

## ADRs duráveis

- Leia `docs/adr/index.md` e as ADRs relacionadas. Crie registro apenas para decisão nova ou mudança
  arquitetural significativa; não exija ADR por feature ou por camada.
- Use [templates/adr-template.md](templates/adr-template.md). Salve desde o draft em
  `docs/adr/adr-NNN.md` com status `Proposed`; não mantenha o documento somente em memória.
- A numeração é global, compartilhada entre todas as features e backend/frontend. Reserve o próximo
  ID no índice, considerando também Proposed/Withdrawn; nunca sobrescreva nem reutilize um ID.
- Registre contexto, escopo, restrições, decisão, alternativas pertinentes e consequências de forma
  autocontida. O PRD pode constar como origem histórica, mas não ser a única fonte do racional.
- Após aprovação da decisão, mude para `Accepted` e atualize `docs/adr/index.md`.
  Se abandonada, use `Withdrawn`. Para mudar uma Accepted, crie nova ADR e marque a anterior
  `Superseded by ADR-NNN` após aprovação.
- Links na TechSpec padrão usam `../../docs/adr/adr-NNN.md`; recalcule para outro diretório.
  Inclua somente ADRs relevantes, não o catálogo inteiro.

## Entrega

Informe caminhos, decisões, fatias, ADRs afetadas e comandos de geração/mocks quando aplicáveis.
Encaminhe `frontend-techspec.md` ao Task Creator; para feature full-stack, ele deve consumir também
`techspec.md`. Uma feature exclusivamente frontend não exige TechSpec backend.
