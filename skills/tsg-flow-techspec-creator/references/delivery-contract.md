# Contrato de entrega da TechSpec

Este arquivo define como a TechSpec chega ao disco e como o desenho é organizado para feedback
incremental. A conversa explica as decisões; os arquivos são a fonte de verdade do handoff.

## Ciclo dos artefatos

1. Depois de completar discovery, exploração do codebase, perguntas, ADRs e checklist de qualidade,
   renderize uma TechSpec completa usando o template.
2. Grave o rascunho em `tasks/prd-<slug>/techspec.draft.md`, com `Status: Em Revisão`.
3. Grave cada ADR novo em `tasks/prd-<slug>/adrs/adr-NNN.draft.md`, com `Status: Proposed`.
4. Reabra os arquivos gravados e confirme que não há seções vazias, placeholders de template,
   decisões sem racional ou artefatos sem tarefa/cobertura.
5. Mostre os caminhos ao usuário e faça a revisão sobre esses arquivos. Em B/C, atualize os mesmos
   drafts e repita a checagem.
6. Só após A promova `techspec.draft.md` para `techspec.md`, remova o sufixo `.draft` das ADRs,
   mude o status da TechSpec para `Aprovado` e das ADRs para `Accepted`.

Se a resposta for D, substitua ou marque os drafts atuais como descartados antes de reiniciar; nunca
deixe um draft antigo parecer ser a revisão vigente.

Se já existir uma TechSpec aprovada, preserve-a durante o update: escreva o novo desenho nos caminhos
`.draft.md` até a aprovação. Nunca sobrescreva silenciosamente um handoff aprovado.

Um `techspec.draft.md` não é entrada válida para o `tsg-flow-task-creator`; ele só pode consumir
`techspec.md` com `Status: Aprovado`.

## Explicação mínima obrigatória

Cada decisão ou componente deve deixar claro:

- qual comportamento do PRD viabiliza;
- qual evidência comprovará a implementação;
- por que a opção foi escolhida e qual trade-off foi aceito;
- quais arquivos serão criados, modificados ou apenas consultados;
- quais riscos, dependências e questões em aberto permanecem.

Evite inventário de classes sem fluxo. O leitor deve conseguir seguir a jornada desde a entrada até
o resultado observável sem reconstruir a intenção a partir de nomes de camadas.

## Fatiamento vertical

Modele cada fatia como uma entrega de comportamento, atravessando apenas as camadas necessárias:

`entrada → validação/regra → persistência ou integração → saída observável → teste/telemetria`

Uma linha do mapa de fatias deve informar:

- ID e título orientado ao comportamento;
- user stories, requisitos e regras cobertos;
- entrada, processamento e saída demonstrável;
- artefatos envolvidos, incluindo testes e observabilidade;
- dependências mínimas;
- checkpoint de feedback: comando, cenário ou evidência que pode ser executado após aquela fatia.

Uma tarefa puramente horizontal só é aceitável como **habilitador** quando nenhum comportamento
demonstrável pode ser entregue sem ele (por exemplo, uma migration compartilhada inevitável). Registre
o motivo, limite os arquivos e indique a primeira fatia desbloqueada. Não use "preparar camada X"
como justificativa.

## Feedback rápido

O build order deve priorizar a menor fatia que prove valor e depois adicionar comportamentos. Cada
fatia deve poder passar por implementer → gate focado → validator → checkpoint sem esperar a conclusão
de todas as entidades, endpoints ou testes da feature. A TechSpec deve declarar também o que ainda não
é coberto por cada checkpoint, para evitar confundir feedback parcial com aprovação da feature inteira.
