# Discovery por decisões

Use quando houver lacunas materiais, decisões dependentes ou contradições. O protocolo não impõe
entrevista mínima a um pedido cujos requisitos já estão definidos.

## Contexto herdado

Extraia fatos de ideia, Vision, Domain Map, Domain Doc, capacidade selecionada e PDs aceitos.
Preserve IDs e vocabulário. Restrições arquiteturais existentes limitam a solução, mas a decisão
técnica detalhada pertence à TechSpec.

Modele decisões pela dependência: pergunte primeiro o que altera as opções seguintes. Após a resposta,
recalcule a próxima lacuna. Perguntas independentes podem ser agrupadas em bloco curto.
Use a interface disponível no runtime; respeite seus limites e não duplique a opção livre que ela
já oferece. Se a resposta for necessária, aguarde-a; continue apenas trabalho independente.

## O que perguntar

- Problema, público, comportamento, regras, exceções e critérios observáveis ainda indefinidos.
- Métricas e restrições apenas quando tiverem base ou exigirem decisão do usuário.
- Escopo, non-goals, dependências e fronteiras que podem mudar a entrega.

Não pergunte novamente por fatos documentados. Recomende uma opção com motivo quando houver base,
mas não trate silêncio como aprovação. Não fabrique alternativas para cumprir uma quantidade.
Se a decisão já foi aprovada no mesmo escopo, registre sua origem e prossiga.

## Registro

Mantenha uma matriz curta quando ajudar a acompanhar várias decisões:

| Decisão | Fonte | Status | Impacto/dependências | Persistência |
|---|---|---|---|---|
| descrição | documento ou resposta | definida/aberta/bloqueante | efeito concreto | PRD/PD/Domain/Vision/TechSpec |

- PRD: comportamento específico da feature.
- PD: política de produto reutilizável, em `docs/product-decisions/`.
- Domain/Vision: fronteira ou vocabulário global; não altere silenciosamente.
- TechSpec/ADR: decisão de arquitetura, a ser tratada tecnicamente em `docs/adr/`.

Ao criar ou atualizar PD, leia
[product-decision-template.md](product-decision-template.md). Salve Proposed para revisão;
aceite após aprovação da decisão. Preserve o histórico ao substituir ou retirar registros.

## Critério de conclusão

O discovery termina quando o draft pode declarar comportamento e limites testáveis sem inventar
decisões materiais. Questões não bloqueantes ficam explícitas. Grave o draft antes da revisão e
apresente resumo/link; não exija aprovação seção a seção nem reenvie todo o documento no chat.
