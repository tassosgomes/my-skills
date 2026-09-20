---
name: tsg-flow-vision-creator
description: Cria ou atualiza a visão estratégica de produtos com múltiplos domínios, jornadas ou integrações. Use para definir escopo macro antes do Domain Map; uma feature isolada pode começar pelo PRD.
metadata:
  group: tsg-flow
---

# Vision Creator

Produza uma visão de negócio que permita descobrir domínios sem antecipar arquitetura ou PRDs.

## Entradas e saída

- Contexto do usuário e documentos estratégicos existentes.
- Saída padrão: `vision.md` na raiz do projeto; respeite outro caminho já informado.
- Em atualização, preserve decisões e seções fora do pedido.

## Processo

1. Verifique se o escopo precisa de visão própria. Se cabe em uma feature, indique o PRD.
2. Extraia fatos e decisões existentes antes de perguntar. Uma visão aprovada pode ser reutilizada;
   atualize-a apenas quando o escopo estratégico mudou.
3. Resolva lacunas sobre problema, públicos, objetivos, escopo, exclusões, proposta de valor,
   restrições, riscos, dependências e primeiro recorte de entrega.
4. Pergunte apenas o que pode mudar essas definições. Agrupe perguntas independentes em blocos
   curtos; faça perguntas dependentes após a resposta anterior. Não imponha quantidade mínima.
5. Use [templates/vision-template.md](templates/vision-template.md) ao redigir. Registre fatos,
   hipóteses e pontos abertos separadamente; marque seções inaplicáveis com justificativa.
6. Persista `vision.draft.md` para revisão quando houver decisões novas a aprovar. Apresente
   resumo e caminho; reutilize aprovação explícita já dada para o mesmo conteúdo e escopo.
7. Resolvidas as decisões materiais e aprovada a visão, salve o arquivo canônico e confirme o caminho.

Não invente métricas, prazos, responsáveis ou restrições. Uma lacuna bloqueia apenas se altera o
problema central, público, objetivo, fronteira, primeira entrega ou restrição crítica.

## Limites

Não detalhe endpoints, tabelas, entidades técnicas, eventos, arquitetura, histórias de usuário ou
tarefas. Registre tecnologia somente como restrição estratégica já existente.
Não force a identificação de bounded contexts nesta etapa: essa é a função do Domain Decomposer.

## Frontmatter e estado

Grave no topo do documento:

```yaml
---
tsg_artifact: vision
product: <nome do produto>
version: <versão deste documento>
status: draft | in_review | approved | superseded
updated: <YYYY-MM-DD>
sources:
---
```

`sources` declara a **versão corrente de cada origem no momento da escrita**. É o que permite
detectar depois que uma origem mudou e este documento não foi revisitado — sem isso, a procedência
em prosa envelhece em silêncio e ninguém consegue afirmar se o documento ainda vale.

Ao concluir, registre o artefato em `flow-state.json`. O formato canônico do frontmatter e do
estado, e o gate que os verifica, estão em `tsg-flow-next/references/flow-state.md`.

## Entrega e próximo passo

Entregue resumo, link para o documento e pontos abertos, sem repetir o arquivo completo.
O próximo passo para um produto amplo é `tsg-flow-domain-decomposer`, que gera
`context/domain-map.md`. Execute etapas posteriores somente dentro do pedido autorizado.
