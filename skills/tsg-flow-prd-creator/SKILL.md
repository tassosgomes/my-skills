---
name: tsg-flow-prd-creator
description: Cria ou atualiza um PRD de uma feature, com requisitos de produto, escopo e critérios de aceite. Use para definir o quê e por quê antes da TechSpec; não para implementar código ou planejar um produto inteiro.
metadata:
  group: tsg-flow
---

# PRD Creator

Produza requisitos autocontidos de uma feature. O PRD descreve comportamento e valor; decisões de
implementação pertencem à TechSpec.

## Entradas e saída

- Ideia, pedido de atualização ou `_idea.md`.
- Quando disponíveis: `vision.md`, `context/domain-map.md`,
  `domains/<dominio>/domain.md`, `backlog/capabilities.md`,
  `context/architecture-baseline.md` e `docs/product-decisions/index.md`.
- Saída: `tasks/prd-<slug>/prd.md`; revisão: `prd.draft.md` no mesmo diretório.
- Respeite caminhos fornecidos. IDs de capacidade, feature, RN e termos upstream devem ser preservados.

## Processo

1. Identifique a feature e o diretório. Se o pedido atravessa várias features independentes,
   proponha divisão; use Vision/Domain quando faltarem fronteiras de produto.
2. Extraia contexto existente. Herdar decisões evita reabrir escopo, vocabulário, prioridades e
   restrições; não copie o baseline técnico inteiro para o PRD.
3. Faça discovery somente das lacunas materiais. Consulte
   [references/question-protocol.md](references/question-protocol.md) quando houver decisões
   dependentes, contradições ou necessidade de registrar decisões reutilizáveis.
4. Apresente alternativas com trade-offs apenas quando houver uma escolha real ainda não feita.
   Não exija rodada mínima de perguntas nem invente 2–3 abordagens para uma direção já aprovada.
5. Resolva ambiguidades de comportamento, dados e escopo que impediriam a especificação.
   Pontos que não bloqueiam podem permanecer explícitos, com responsável ou próxima etapa.
6. Leia [references/prd-template.md](references/prd-template.md) e grave o draft completo.
   Inclua requisitos numerados, histórias e critérios observáveis, inclusive casos negativos.
   Omita exemplos do template e justifique seções não aplicáveis.
7. Revise consistência, cobertura, non-goals, métricas fundamentadas e rastreabilidade.
8. Mostre o arquivo e um resumo das decisões. Pergunte somente sobre decisões ainda não aprovadas;
   a autorização explícita já dada para o mesmo escopo continua válida.
9. Após aprovação, salve `prd.md` e aceite somente os PDs aprovados nesta entrega.

## Decisões e limites

- Não explore código nem pesquise mercado por rotina; receba esse contexto dos artefatos apropriados.
- Não decida bibliotecas, banco, endpoints ou arquitetura a partir de um nome técnico de feature.
- Decisões de produto reutilizáveis vão para `docs/product-decisions/`, usando
  [references/product-decision-template.md](references/product-decision-template.md) quando necessário.
- ADRs arquiteturais pertencem a `docs/adr/` e são produzidas pelas etapas técnicas.
- Em update, preserve o PRD aprovado enquanto o draft muda. Não altere escopo alheio ao pedido.
- Não reabra decisão documentada sem conflito concreto; explicite a evidência antes de propor mudança.

## Entrega

Informe caminho, decisões novas/herdadas, pendências e PDs afetados. Não repita o documento no chat.
Para uma API compartilhada, siga para `tsg-flow-contract-creator`; caso contrário, para
`tsg-flow-techspec-creator` ou a especificação frontend pertinente.
