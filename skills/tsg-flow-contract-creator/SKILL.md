---
name: tsg-flow-contract-creator
description: Cria ou evolui contratos de integração HTTP (OpenAPI), mensageria (AsyncAPI) e dados (ODCS) a partir do PRD. Registra o acordo daquela implementação; catalogação e atualização do acervo ficam com o time de plataforma.
metadata:
  group: tsg-flow
  pipeline_stage: contract
  consumed_by:
    - planning
  requires:
    - "tasks/prd-[slug]/prd.md"
  produces:
    - "tasks/prd-[slug]/contracts.md"
    - "tasks/prd-[slug]/api-contract.yaml (quando HTTP)"
    - "tasks/prd-[slug]/api-contract.md (quando HTTP)"
    - "tasks/prd-[slug]/asyncapi-contract.yaml (quando mensageria)"
    - "tasks/prd-[slug]/data-contract.yaml (quando dados)"
---

# Integration Contract Creator

Registre os contratos decididos para a implementação de um PRD, coordenando provedores e
consumidores de interfaces, mensagens e dados. Um PRD pode exigir nenhuma, uma ou várias
modalidades. O contrato aprovado orienta a implementação daquele escopo e momento; outros
PRDs podem evoluí-lo.

## Limite de responsabilidade

- Os artefatos são entregues em `tasks/prd-[slug]/`, ou na pasta de trabalho do PRD já adotada.
- Contratos anteriores e documentos fornecidos pelo projeto são entradas: registre caminho/URL,
  versão e revisão ou data consultada. Não assuma que o último PRD encontrado representa produção.
- Ao evoluir uma integração, produza o acordo do PRD atual e registre diferenças e consumidores
  afetados. Preserve contratos de PRDs anteriores e contratos externos ao escopo.
- Não defina local definitivo, catálogo, registry, publicação, consolidação ou mecanismo de
  atualização dos contratos. Essas decisões e operações pertencem ao time de plataforma.
- A ausência dessas definições de plataforma não bloqueia a entrega do PRD. Não crie tarefas de
  migração do contrato ao arquivar o PRD nem proponha um repositório canônico.
- A aprovação de um artefato significa acordo para implementar; não comprova implantação ou
  atualização de catálogo.

## 1. Ler o contexto e classificar as integrações

Leia o PRD, baseline, ADRs pertinentes e contratos existentes disponíveis. Extraia requisitos,
produtores/provedores, consumidores, fronteiras e comportamentos alterados. Não limite a
descoberta ao frontend ou a ações de usuário: inclua jobs, serviços, eventos e consumo de dados.

| Evidência no escopo | Modalidade | Recursos a ler |
|---|---|---|
| Interface HTTP consumida, criada ou alterada | OpenAPI | [openapi.md](references/openapi.md), [http-conventions.md](references/http-conventions.md), [spectral.md](references/spectral.md), template e ruleset HTTP |
| Aplicação envia ou recebe mensagens | AsyncAPI | [asyncapi.md](references/asyncapi.md) e seu template |
| Dados disponibilizados com acordo entre produtor e consumidores | ODCS | [odcs.md](references/odcs.md) e seu template |

Leia apenas recursos das modalidades aplicáveis. HTTP pode incluir webhooks; sua presença não
obriga AsyncAPI. ODCS não decorre da mera existência de banco interno. Um fluxo de mensagens
pode também exigir ODCS quando houver compromissos próprios sobre os dados fornecidos.

Registre a seleção e sua justificativa em `contracts.md`. Sem integração no escopo, entregue
somente esse registro de não aplicabilidade; não gere YAML vazio nem invente endpoints.

## 2. Fechar decisões de contrato

Herde decisões do contexto antes de perguntar. Resolva lacunas que alterem comportamento,
segurança, dados, garantias ou compatibilidade; não invente broker, autenticação, consumidores
ou SLA. Reutilize aprovação já concedida para o mesmo escopo.

Para cada integração, identifique:

- Provedor/produtor, consumidores conhecidos e aplicação ou produto de dados descrito.
- Requisitos atendidos, operações/mensagens/modelos envolvidos e fronteira do documento.
- Origem das decisões, versão do padrão e versão do contrato (são conceitos distintos).
- Segurança, significado dos dados e compromissos observáveis aplicáveis.
- Contrato de referência, diferenças, compatibilidade e transição necessária à implementação.

Se a versão anterior não estiver disponível, declare que a compatibilidade não foi verificada.
Não classifique automaticamente uma adição como compatível: considere consumidores, enums,
obrigatoriedade, semântica, garantias e formato de serialização.

## 3. Produzir os documentos aplicáveis

Use os templates da modalidade como exemplos adaptáveis, não como decisões de domínio.
Mantenha OpenAPI 3.1.x, AsyncAPI 3.0.0 e ODCS v3.0.1 como bases dos recursos empacotados.
Se o projeto exigir outra versão, consulte sua especificação e use validação compatível;
não migre contratos existentes incidentalmente.

Caminhos padrão dentro do PRD:

- HTTP: `api-contract.yaml` e documentação derivada `api-contract.md`.
- Mensageria: `asyncapi-contract.yaml`.
- Dados: `data-contract.yaml`.
- Índice e revisão do conjunto: `contracts.md`, conforme
  [contracts-template.md](references/contracts-template.md).

Quando houver várias aplicações ou produtos, use sufixos identificadores, por exemplo
`asyncapi-contract-orders.yaml` e `data-contract-sales.yaml`, e liste todos no índice.
Explicite se cada documento cobre a interface completa ou somente o recorte deste PRD.
Mesmo um recorte deve ser válido e resolver suas referências.

Em cenários combinados, relacione operações HTTP, mensagens e modelos de dados pelos seus
identificadores e significado. Reutilize schemas somente quando semântica e formato forem
compatíveis. Não copie automaticamente DTO HTTP para evento ou modelo analítico.

Mantenha os schemas e restrições no documento técnico. Markdown apresenta referências, decisões
e exemplos derivados; não se torna uma fonte concorrente. Referências externas devem identificar
versões estáveis ou vir acompanhadas das dependências necessárias para reproduzir a revisão,
sem instituir um mecanismo de catalogação.

## 4. Validar e revisar

Execute a validação específica de cada modalidade antes da entrega:

- OpenAPI: Spectral com `rulesets/openapi.yaml`, conforme a referência HTTP.
- AsyncAPI: parser/CLI compatível com a versão adotada, conforme a referência AsyncAPI.
- ODCS: JSON Schema oficial da versão adotada, conforme a referência ODCS.

Registre comando, versões de ferramenta/padrão, resultado e avisos em `contracts.md`.
Corrija erros e repita a validação afetada. Se a ferramenta não puder rodar, registre o motivo e
entregue como pendente de validação, sem declarar o contrato pronto.

Revise também cobertura do PRD, referências, exemplos, segurança, compatibilidade e coerência
entre modalidades. Validade estrutural não demonstra compatibilidade, comportamento da
implementação, entrega de mensagens ou qualidade real dos dados.

## 5. Salvar e entregar o acordo do PRD

Enquanto houver decisões materiais pendentes, use status `Em Revisão`. Ao revisar um contrato
já aprovado no mesmo PRD, preserve-o e grave `*.draft.yaml` e documentação de revisão
correspondente. Após aprovação aplicável e validação sem erros, atualize os artefatos finais
somente deste PRD e gere novamente a documentação derivada.

O índice deve distinguir o estado de cada documento e a prontidão do conjunto. Uma modalidade
bloqueada não pode ficar escondida por outra já validada.

Na resposta final informe:

- Modalidades e resumo das interfaces, mensagens ou dados definidos.
- Decisões herdadas/novas, origem consultada e mudanças em relação ao contrato anterior.
- Links dos artefatos, resultados de validação e pendências.
- Handoff para `tsg-flow-techspec-creator`, referenciando `contracts.md` e documentos técnicos.

A TechSpec deve mapear esses acordos à implementação e aos cenários de verificação sem duplicar
schemas. Para HTTP, tipos e mocks podem ser derivados do OpenAPI; para mensagens, use cenários
de envio/recebimento e falhas acordadas; para dados, verifique estrutura e compromissos de
qualidade/serviço. A execução desses testes pertence à implementação.

## Checklist de entrega

- [ ] Integrações classificadas; modalidades não aplicáveis não geraram contratos.
- [ ] Cada documento identifica escopo, participantes, origem e versão.
- [ ] Acordo vinculado ao PRD atual; histórico e contratos externos preservados.
- [ ] Compatibilidade revisada ou limitação explicitada.
- [ ] Documentos e exemplos coerentes, referências resolvíveis e validação registrada.
- [ ] Status reflete decisões e validações pendentes.
- [ ] Nenhuma decisão ou operação de catalogação, armazenamento definitivo ou atualização do
      acervo foi atribuída a esta skill.
