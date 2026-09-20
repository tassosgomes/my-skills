---
name: tsg-flow-next
description: Responde "vamos atacar CAP-XXX, tenho tudo que preciso?" ou escolhe a próxima capacidade da fila, verifica pré-requisitos e encadeia domain doc e PRD até o ponto de aprovação. Use para retomar um fluxo TSG; não implementa código nem decide escopo sozinha.
metadata:
  group: tsg-flow
---

# Next

Ponto de entrada do fluxo TSG depois que o backlog de capacidades existe. Substitui três perguntas
que hoje se faz relendo documento: *onde eu parei*, *o que falta* e *qual skill rodar*.

Recebe uma capacidade (`vamos atacar CAP-001`) ou nenhuma — e aí escolhe da fila. Verifica os
pré-requisitos, declara a fatia, e encadeia `tsg-flow-domain-creator` e `tsg-flow-prd-creator`
parando em cada ponto de aprovação.

Não desce de PRD. De contrato para baixo o fluxo já funciona sozinho.

## O que ela não faz

- **Não decide escopo por conta própria.** O recorte da fatia é proposto e confirmado antes de
  qualquer PRD ser escrito.
- **Não atravessa aprovação.** O `prd-creator` grava `prd.draft.md` e espera; encadear *até* o
  draft é o objetivo, encadear *através* dele transforma guia em piloto automático.
- **Não executa a Fase 0.** Em greenfield, serviços, esteira, broker e banco são conduzidos fora do
  fluxo. Esta skill só verifica e reporta.
- **Não implementa, não commita, não altera documento aprovado.**

## Entradas

- `flow-state.json` na raiz e o backlog de capacidades. Sem eles, não há o que retomar: aponte para
  `tsg-flow-capability-backlog` e pare.
- O ID da capacidade, quando o usuário deu um.

## Processo

### 1. Rodar o gate

```bash
python3 scripts/validate_state.py <raiz> --capability CAP-XXX   # com alvo
python3 scripts/validate_state.py <raiz> --status                # sem alvo
```

O formato do estado e do frontmatter está em
[references/flow-state.md](references/flow-state.md). O script faz o que é mecânico: existência,
frescor de procedência, dependências entre capacidades, paridade de IDs, fundação. O julgamento é
seu — não repita a saída bruta do script ao usuário, use-a como evidência.

### 2. Escolher a capacidade, quando não houver alvo

Da fila do MVP, a de menor `mvp_order` que não esteja `done`. Empate entre duas na mesma ordem
significa que elas foram sequenciadas para sair juntas — trate as duas como a rodada.

### 3. Separar os bloqueios por natureza

É a parte que mais importa, porque as duas categorias se resolvem de formas diferentes:

- **Bloqueio de artefato** — falta domain doc, falta PRD, origem desatualizada. Resolve-se
  produzindo documento, e é isso que esta skill encadeia.
- **Bloqueio de decisão ou dependência** — uma capacidade da qual esta depende ainda não saiu; uma
  decisão em aberto com dono; a fundação ainda não existe. **Não se resolve escrevendo documento**,
  e apresentar isso como se fosse tarefa de escrita é o pior erro possível aqui.

Uma decisão em aberto costuma estar enterrada numa tabela de riscos que ninguém relê. Trazê-la à
tona com o dono e o que ela trava é metade do valor desta skill.

### 4. Declarar a fatia

Antes de qualquer PRD, proponha o recorte desta entrega e confirme:

- A capacidade sai inteira, ou em fatia mínima?
- Quando ela entra para destravar outra (o caso comum de dependência cruzada), a fatia é
  **dimensionada pelo que a consumidora precisa**, e nada além.
- O que fica de fora volta em qual fase?

Sem esse passo o PRD cresce para a capacidade inteira — constrói a casa de máquinas para acender
uma tomada.

### 5. Resolver os domain docs da rodada

Para cada domínio que a rodada toca, aplique o critério do `tsg-flow-domain-creator`: **domain doc
só quando o domínio for render dois ou mais PRDs no horizonte visível**. Com uma capacidade só, as
regras vão no próprio PRD.

Os domain docs necessários são escritos **na mesma passada**, não um por vez: é entre eles que a
junta aparece, e junta implícita é o que faz fatia vertical não encaixar depois.

### 6. Encadear

Na ordem, parando em cada aprovação:

1. `tsg-flow-domain-creator` para os domínios que passaram no critério
2. `tsg-flow-prd-creator`, **provedor antes do consumidor** quando a rodada tem dependência interna
   (uma capacidade que destrava outra sai primeiro, senão a segunda nasce apoiada em stub)

Passe sempre: o ID da capacidade, a fatia confirmada, e **todos** os domain docs que ela atravessa.

### 7. Atualizar o estado

Ao fim de cada etapa concluída, registre em `flow-state.json`: o `stage` da capacidade, o caminho
do artefato produzido, a próxima ação. Decisão que o usuário fechou durante a conversa sai de
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
  2. backlog/capabilities.md está in_review e não integrado.

Resolvido isso, o próximo passo é um só:
  tsg-flow-domain-creator → Identidade e Acesso
```

Três regras:

- **Termina em uma ação, não numa lista.** Se sobrarem três opções, o usuário voltou a ter que
  decidir toda vez — que é o problema que esta skill existe para resolver.
- **Bloqueio de decisão vem antes de bloqueio de documento**, com o dono nomeado.
- **Não repita o conteúdo dos documentos.** Cite ID e caminho.

## Princípios

- **Uma capacidade por vez.** Trabalho em progresso acima disso transforma revisão humana —
  normalmente o recurso escasso — em gargalo com fila.
- **A junta vem do Domain Map, não da fatia anterior.** Se cada capacidade olhar "como a anterior
  ficou", em seis capacidades existe acoplamento que ninguém decidiu.
- **Fatia mínima é o primeiro PRD de uma capacidade, não uma capacidade capenga.** Uma capacidade
  pode render vários PRDs ao longo das fases.
- **Reportar bloqueio não é falhar.** Um "não, e aqui está o porquê" entregue em dez segundos vale
  mais que um PRD escrito sobre premissa que já caiu.
