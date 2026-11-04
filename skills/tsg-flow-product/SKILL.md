---
name: tsg-flow-product
description: Cria ou atualiza os artefatos de produto do TSG Flow — visão, Domain Map, baseline arquitetural e backlog de capacidades — em docs/product/, uma etapa por vez e parando na aprovação. Use ao iniciar um produto com vários domínios ou quando uma premissa de produto mudou; uma feature isolada começa direto pelo PRD.
metadata:
  group: tsg-flow
---

# Product

Produz o nível de produto do fluxo. Roda uma vez por produto e depois só quando uma premissa muda.
Depois do backlog aprovado, o trabalho por capacidade é da `tsg-flow-next`.

## Etapas

| # | Etapa | Saída | Origens obrigatórias | Referência |
|---|---|---|---|---|
| 1 | Visão | `docs/product/vision.md` | — | [vision.md](references/vision.md) |
| 2 | Domain Map | `docs/product/domain-map.md` | visão | [domain-map.md](references/domain-map.md) |
| 3 | Baseline arquitetural | `docs/product/architecture-baseline.md` | visão, Domain Map | [architecture-baseline.md](references/architecture-baseline.md) |
| 4 | Backlog de capacidades | `docs/product/capabilities.md` | visão, Domain Map, baseline | [capabilities.md](references/capabilities.md) |

As quatro são obrigatórias nesta rota: o gate exige cada origem da tabela, e a `tsg-flow-next` não
trabalha sem backlog. Leia só a referência da etapa em execução.

## Escolher a etapa

1. **O escopo cabe numa feature?** Então não há nível de produto: indique `tsg-flow-prd-creator` e
   pare. Essa rota não usa `flow-state.json`.
2. **O usuário nomeou a etapa?** Execute-a, desde que suas origens existam e estejam aprovadas.
3. **Sem etapa nomeada:** rode o gate com `--status` e execute a primeira etapa ausente ou
   desatualizada. Uma origem que mudou invalida as etapas abaixo dela, não as acima.

Uma etapa por vez. Encadeie a seguinte somente quando o pedido autorizar.

## Regras comuns às etapas

- **Herde antes de perguntar.** Extraia fatos e decisões dos documentos existentes, de ADRs e do
  código. Pergunte só o que muda a decisão da etapa; agrupe perguntas independentes e faça as
  dependentes depois da resposta. Reutilize aprovação explícita já dada para o mesmo conteúdo.
- **Não invente** métricas, prazos, responsáveis, restrições, broker ou SLA. Separe fato, hipótese
  e ponto aberto.
- **Cada etapa decide só o que é dela.** A visão não nomeia bounded contexts; o Domain Map não
  decide arquitetura física; o baseline não sequencia; o backlog não cria tarefa técnica.
  Divergência com etapa anterior se resolve no documento dono da decisão.
- **Draft e revisão.** A primeira versão nasce no caminho canônico com `status: draft` ou
  `in_review`. Revisão de um documento já `approved` vai para `<nome>.draft.md` ao lado, para que a
  versão aprovada continue valendo até a nova ser aprovada; aprovada, substitui o canônico e sobe
  `version`.

## Frontmatter, estado e gate

Todo artefato abre com:

```yaml
---
tsg_artifact: vision | domain-map | architecture-baseline | capability-backlog
product: <nome do produto>
version: <versão deste documento>
status: draft | in_review | approved | superseded
updated: <YYYY-MM-DD>
sources: docs/product/vision.md@<versão>, ...   # vazio só na visão
---
```

`sources` declara a versão corrente de cada origem no momento da escrita. É o que permite ao gate
acusar que uma origem mudou e este documento não foi revisitado.

O estado vive em `docs/product/flow-state.json`. A visão cria o arquivo quando ele não existe; cada
etapa registra seu caminho em `artifacts`, e o backlog registra cada `CAP-XXX` em `capabilities`
com `stage: backlog`. Formato completo em
[`tsg-flow-next/references/flow-state.md`](../tsg-flow-next/references/flow-state.md).

Antes de entregar, rode o gate e corrija os erros:

```bash
python3 <tsg-flow-next>/scripts/validate_state.py <raiz-do-projeto>
```

## Entrega

Resumo das decisões, link do documento, pontos abertos e o próximo passo — a etapa seguinte da
tabela ou, depois do backlog aprovado, `tsg-flow-next`. Não repita o conteúdo do arquivo.
