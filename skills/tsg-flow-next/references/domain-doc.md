# Domain doc

Detalha **um** domínio do Domain Map: bounded context, entidades de negócio, juntas com os vizinhos
e regras de negócio numeradas. É contexto compartilhado pelos PRDs das capacidades que tocam o
domínio. Template: [domain-template.md](../templates/domain-template.md).
Saída: `docs/product/domains/<dominio>.md`, com `tsg_artifact: domain`.

Não decide prioridade, fase, ordem nem escopo de entrega. Um domínio isolado não enxerga dependência
cruzada, e qualquer ordem que ele proponha contradiz o backlog na primeira fatia que atravessar dois
domínios.

## Quando escrever

O que só existe aqui são as **regras de negócio numeradas (RN-XX)**, reaproveitadas entre PRDs do
mesmo domínio. Fronteira, entidades e linguagem ubíqua vêm do Domain Map; contrato de evento e de
API materializa no contrato e na TechSpec.

- **Escreva quando o domínio for render dois ou mais PRDs no horizonte visível** — a rodada atual e
  a seguinte. É quando as RN têm com quem ser compartilhadas.
- **Com um PRD só, não escreva.** As regras vão no próprio PRD. Quando o domínio ganhar a segunda
  capacidade, o domain doc nasce e absorve as RN daquele PRD — com implementação rodando para
  informar, em vez de especulação.
- **Just-in-time e na mesma passada:** os domain docs dos domínios que a rodada toca, juntos,
  porque é entre eles que as juntas aparecem. Nunca todos os domínios do mapa de uma vez.

## Entradas

Visão, Domain Map (fronteiras, nomes canônicos e juntas), as capacidades do domínio no backlog e as
restrições do baseline. Preserve os IDs; não copie prioridade, fase nem ordem. Se o Domain Map ainda
não define as fronteiras deste domínio, a lacuna é do mapa: volte para a etapa Domain Map da
`tsg-flow-product`.

## Esclarecer

Pergunte só lacunas materiais dos documentos herdados:

- **Fronteira:** responsabilidade em uma frase; o que parece pertencer e está excluído; onde termina
  este domínio e começa o vizinho.
- **Uso:** perfis que interagem e a ação mais crítica de cada um.
- **Regras:** regras que governam o domínio e as que variam por cliente, região ou configuração.
- **Juntas:** quando uma capacidade atravessa este domínio e o vizinho, quem é dono do dado em cada
  troca. Junta que o Domain Map não declara sobe para o mapa; não é decidida aqui.
- **Integrações:** sistemas externos e eventos assíncronos com outros domínios.

Antes de redigir, apresente o plano: bounded context, entidades, capacidades por ID (sem ordem),
juntas com dono do dado, RN numeradas, eventos produzidos e consumidos, riscos de fronteira.

## Diretrizes

- Linguagem de negócio: entidade não é tabela, registro nem endpoint.
- "Fora do Escopo" obrigatório e específico.
- Capacidades por `CAP-XXX`. Não crie numeração própria de feature: duplicaria o backlog.
- RN numeradas e testáveis, para os critérios de aceitação dos PRDs.
- Juntas copiadas do Domain Map.
- Eventos no formato `dominio.evento`.
- Riscos de fronteira, não de entrega.
- Sem limite de extensão: corte seção supérflua, nunca detalhe que remove ambiguidade.
- Conflito upstream se resolve no dono: visão para escopo, Domain Map para fronteira, backlog para
  prioridade.

## Antes de entregar

- [ ] Um agente cria PRDs a partir deste documento sem perguntas adicionais.
- [ ] Cada junta declara o dono do dado e é rastreável ao Domain Map.
- [ ] Nenhuma prioridade, fase ou ordem foi copiada do backlog.
- [ ] Frontmatter com as origens na versão corrente de cada uma; artefato registrado na capacidade
      em `flow-state.json` (`artifacts.domain`).
