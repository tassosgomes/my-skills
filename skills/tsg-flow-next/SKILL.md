---
name: tsg-flow-next
description: Responde "vamos atacar CAP-XXX, tenho tudo que preciso?" ou escolhe a próxima capacidade da fila, verifica pré-requisitos e encadeia domain doc, PRD, contrato, TechSpec e tasks até o plano pronto para o orchestrator, parando em cada aprovação. Use para retomar ou avançar uma capacidade do TSG Flow; não implementa código nem decide escopo sozinha.
metadata:
  group: tsg-flow
---

# Next

Ponto de entrada do fluxo por capacidade, depois que o backlog existe. Responde três perguntas que
de outro modo exigem reler documentos: *onde eu parei*, *o que falta* e *o que rodar agora*.

Recebe uma capacidade (`vamos atacar CAP-001`) ou nenhuma — e aí escolhe da fila. Verifica os
pré-requisitos, declara a fatia e encadeia o planejamento até o plano de tasks aprovado. A execução
é do `tsg-flow-orchestrator`.

## O que ela não faz

- **Não decide escopo.** O recorte da fatia é proposto e confirmado antes de qualquer PRD.
- **Não atravessa aprovação.** Cada etapa grava seu draft e espera. Encadear *até* o draft é o
  objetivo; encadear *através* dele transforma guia em piloto automático.
- **Não executa a Fase 0.** Em greenfield, serviços, esteira, broker e banco são conduzidos fora do
  fluxo. Esta skill só verifica e reporta.
- **Não implementa, não commita, não altera documento aprovado.**

## Entradas

- `docs/product/flow-state.json` e o backlog. Sem eles, não há o que retomar: indique a
  `tsg-flow-product` e pare. Feature isolada, sem backlog, começa direto pelo `tsg-flow-prd-creator`.
- O ID da capacidade, quando o usuário deu um.

## Processo

### 1. Rodar o gate e reconciliar

```bash
python3 scripts/validate_state.py <raiz> --capability CAP-XXX   # com alvo
python3 scripts/validate_state.py <raiz> --status                # sem alvo
```

Formato do estado e do frontmatter: [references/flow-state.md](references/flow-state.md). O script
faz o mecânico — existência, frescor de procedência, dependências, paridade de IDs, fundação. O
julgamento é seu: use a saída como evidência, não a repita ao usuário.

Antes de decidir, reconcilie as capacidades em execução: se `work/<dir>/run-state.json` existe, o
stage é `in_progress`; com `phase: complete`, é `done`. O orchestrator não escreve no estado de
produto — quem traz o resultado para cá é esta skill.

### 2. Escolher a capacidade, quando não houver alvo

Da fila do MVP, a de menor `mvp_order` que não esteja `done`. Empate na mesma ordem significa que
foram sequenciadas para sair juntas: trate as duas como a rodada.

### 3. Separar os bloqueios por natureza

É a parte que mais importa, porque as duas categorias se resolvem de formas diferentes:

- **Bloqueio de artefato** — falta domain doc, PRD, contrato, TechSpec ou tasks; origem
  desatualizada. Resolve-se produzindo documento, e é isso que esta skill encadeia.
- **Bloqueio de decisão ou dependência** — uma capacidade da qual esta depende ainda não saiu; uma
  decisão em aberto com dono; a fundação não existe. **Não se resolve escrevendo documento**, e
  apresentar isso como tarefa de escrita é o pior erro possível aqui.

Uma decisão em aberto costuma estar enterrada numa tabela de riscos. Trazê-la à tona com o dono e o
que ela trava é metade do valor desta skill.

### 4. Declarar a fatia e o tamanho

Antes de qualquer PRD, proponha e confirme:

- A capacidade sai inteira ou em fatia mínima? Quando entra para destravar outra, a fatia é
  **dimensionada pelo que a consumidora precisa**, e nada além.
- O que fica de fora volta em qual fase?
- O tamanho, que decide se há TechSpec, tasks e orchestrator:

  | Tamanho | Sinal | Planejamento | Execução |
  |---|---|---|---|
  | Médio | feature clara, menos de 10 passos | PRD enxuto | fluxo direto do projeto |
  | Grande | multi-componente, fronteira nova | PRD, TechSpec, tasks | orchestrator |
  | Complexo | ambiguidade real, domínio novo, contrato externo | idem, com discovery | orchestrator |

  Abaixo de Médio a mudança não é uma capacidade: não passa por esta skill.

Sem esse passo o PRD cresce para a capacidade inteira — constrói a casa de máquinas para acender uma
tomada.

O diretório de trabalho da fatia é `work/<cap-id>-<slug>/` (ex.: `work/cap-001-cadastro-aluno/`).
Todos os artefatos da entrega ficam nele.

### 5. Encadear

Na ordem, parando em cada aprovação e passando sempre o ID da capacidade, a fatia confirmada, o
diretório de trabalho e **todos** os domain docs que ela atravessa:

| Etapa | Quando | Quem |
|---|---|---|
| Domain doc | domínio com 2+ PRDs no horizonte visível | esta skill, por [references/domain-doc.md](references/domain-doc.md) |
| PRD | sempre | `tsg-flow-prd-creator` |
| Contrato | a fatia cria ou altera integração HTTP, mensageria ou dados compartilhados | `tsg-flow-contract-creator` |
| TechSpec | tamanho Grande ou Complexo | `tsg-flow-techspec-creator` |
| Tasks | tamanho Grande ou Complexo | `tsg-flow-task-creator` |

- Domain docs da rodada são escritos **na mesma passada**: é entre eles que a junta aparece.
- **Provedor antes do consumidor** quando a rodada tem dependência interna; senão a segunda nasce
  apoiada em stub.
- O contrato sai do PRD e antecede a TechSpec, que o consome.

Com o plano aprovado, o próximo passo é um só:

```text
tsg-flow-orchestrator --prd-dir=work/<cap-id>-<slug>
```

Tamanho Médio não passa pelo orchestrator: o fluxo direto do projeto implementa a partir do PRD.

### 6. Atualizar o estado

Ao fim de cada etapa concluída, registre em `flow-state.json` o `stage` da capacidade, o caminho do
artefato em `artifacts` e a próxima ação. Decisão que o usuário fechou na conversa sai de
`open_decisions` e entra em `decisions`, com o racional — inclusive o que foi descartado e por quê.

## Protocolo de saída

Um veredito, não um relatório:

```
CAP-001 — Conta e autenticação do aluno

  capacidade        backlog · fase MVP
  domínio           Identidade e Acesso
    domain doc      AUSENTE · 2 capacidades neste domínio
  depende de
    CAP-026         backlog

VEREDITO: NÃO. Dois bloqueios, nenhum deles de documento:

  1. R5 — antecipar CAP-026 ao MVP. Dono: negócio.
     Sem isso CAP-001 entrega cadastro sem confirmação de e-mail.
  2. docs/product/capabilities.md está in_review e não integrado.

Resolvido isso, o próximo passo é um só:
  domain doc → Identidade e Acesso
```

- **Termina em uma ação, não numa lista.** Com três opções, o usuário volta a ter que decidir toda
  vez — o problema que esta skill existe para resolver.
- **Bloqueio de decisão vem antes de bloqueio de documento**, com o dono nomeado.
- **Não repita o conteúdo dos documentos.** Cite ID e caminho.

## Princípios

- **Uma capacidade por vez.** Trabalho em progresso acima disso transforma a revisão humana — o
  recurso escasso — em gargalo com fila.
- **A junta vem do Domain Map, não da fatia anterior.** Se cada capacidade olhar "como a anterior
  ficou", em seis capacidades existe acoplamento que ninguém decidiu.
- **Fatia mínima é o primeiro PRD de uma capacidade, não uma capacidade capenga.** Uma capacidade
  pode render vários PRDs ao longo das fases.
- **Reportar bloqueio não é falhar.** Um "não, e aqui está o porquê" em dez segundos vale mais que
  um PRD escrito sobre premissa que já caiu.
