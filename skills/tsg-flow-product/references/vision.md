# Etapa 1 — Visão

Produz uma visão de negócio que permita descobrir domínios sem antecipar arquitetura ou PRDs.
Template: [vision-template.md](../templates/vision-template.md).

## Processo

1. Confirme que o escopo precisa de visão própria. Se cabe numa feature, indique o PRD.
2. Uma visão aprovada pode ser reutilizada; atualize-a somente quando o escopo estratégico mudou, e
   preserve decisões e seções fora do pedido.
3. Resolva lacunas sobre problema, públicos, objetivos, escopo, exclusões, proposta de valor,
   restrições, riscos, dependências e primeiro recorte de entrega.
4. Numere as capacidades de negócio (`C01`, `C02`, ...). O backlog rastreia cada `CAP-XXX` até elas.
5. Marque seções inaplicáveis com justificativa.

Uma lacuna bloqueia somente se altera o problema central, o público, o objetivo, a fronteira, a
primeira entrega ou uma restrição crítica.

## Limites

- Não detalhe endpoints, tabelas, entidades técnicas, eventos, arquitetura, histórias ou tarefas.
- Tecnologia entra somente como restrição estratégica já existente.
- Não identifique bounded contexts nem caminhos de domain doc: isso é do Domain Map, e domain doc
  só nasce sob demanda, pela `tsg-flow-next`.

## Estado

Crie `docs/product/flow-state.json` se ainda não existir, com `schema`, `product`, `updated` e
`artifacts.vision`. `sources` fica vazio: a visão é a raiz.
