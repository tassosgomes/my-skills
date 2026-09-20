---
name: tsg-flow-prd-creator
description: Cria ou atualiza o PRD de uma capacidade, com requisitos de produto, escopo da fatia e critérios de aceite. Use para definir o quê e por quê antes da TechSpec; não para implementar código ou planejar um produto inteiro.
metadata:
  group: tsg-flow
---

# PRD Creator

Produza requisitos autocontidos de **uma capacidade**. O PRD descreve comportamento e valor;
decisões de implementação pertencem à TechSpec.

A unidade do PRD é a capacidade do backlog (`CAP-XXX`), não o domínio. Uma fatia vertical atravessa
domínios com frequência e consome mais de um domain doc — é por isso que ela não pode ser ancorada
em um. Um PRD pertence a exatamente uma capacidade; uma capacidade pode render mais de um PRD ao
longo do tempo, quando entra primeiro em fatia mínima.

## Entradas e saída

- ID da capacidade (`CAP-XXX`) e o escopo da fatia a entregar, ou ideia/`_idea.md` em modo standalone.
- **Todos** os domain docs que a capacidade atravessa — `domains/<dominio>/domain.md`, um por
  domínio tocado. Domínio sem domain doc é normal: ele rende um PRD só, e as regras dele nascem aqui.
- Quando disponíveis: `vision.md`, `context/domain-map.md`, `backlog/capabilities.md`,
  `context/architecture-baseline.md` e `docs/product-decisions/index.md`.
- Saída: `tasks/prd-<slug>/prd.md`; revisão: `prd.draft.md` no mesmo diretório. Grave o frontmatter
  (`tsg_artifact: prd`, a capacidade e as origens com versão) e registre o artefato em `flow-state.json`.
- Respeite caminhos fornecidos. IDs de capacidade, RN e termos upstream devem ser preservados.

## Processo

1. Identifique a capacidade, a fatia e o diretório. **Declare o escopo desta entrega antes de
   escrever**: quando a capacidade entra em versão mínima, o recorte é entrada do PRD, não saída —
   sem isso o documento cresce para a capacidade inteira e entrega casa de máquinas para acender uma
   tomada. Se o pedido atravessa capacidades independentes, proponha divisão: um PRD, uma capacidade.
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
   Omita os exemplos do template. **Seção sem conteúdo material é omitida, não justificada:**
   a ausência já declara a não-aplicabilidade, e um parágrafo explicando por que a seção está
   vazia é ruído que o leitor precisa atravessar.
7. Revise consistência, cobertura, non-goals, métricas fundamentadas e rastreabilidade.
8. Mostre o arquivo e um resumo das decisões. Pergunte somente sobre decisões ainda não aprovadas;
   a autorização explícita já dada para o mesmo escopo continua válida.
9. Após aprovação, salve `prd.md` e aceite somente os PDs aprovados nesta entrega.

## Extensão

Não há limite de tamanho por seção. Descreva comportamento, regra e critério com a extensão
necessária para não restar ambiguidade — é o "o quê", a parte que a implementação não pode
adivinhar. O documento encolhe cortando seção supérflua, nunca detalhe que remove dúvida.

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
