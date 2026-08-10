# Protocolo de Perguntas

Protocolo estruturado de brainstorming para criação de PRD. Siga estas fases e regras para
guiar a conversa da ideia ao documento.

## Fases

### 1. Context Extraction (Pipeline Mode)

> Esta fase é exclusiva do Pipeline Mode. Em Standalone Mode, pular direto para Discovery.

Antes de qualquer pergunta, extrair e apresentar o contexto herdado:

- Vision Doc: objetivos de negócio, restrições globais, non-goals, glossário, perfis de usuário
- Domain Doc: ID e descrição da feature, entidades, regras RN-XX, dependências, eventos
- Product Decision Records: decisões `Accepted` e `Proposed` relevantes, com escopo e termos afetados

Apresentar ao usuário um resumo do que foi herdado para que ele saiba o que **não** será
perguntado novamente. Confirmar a feature alvo se identificada por ID no Domain Doc.

### Motor de Discovery: árvore de decisões

Modele a feature como uma árvore de decisões, não como uma lista fixa de perguntas.

- Identifique decisões-raiz e decisões dependentes antes de começar.
- A **fronteira** é o conjunto de decisões cujas dependências já foram resolvidas.
- Pergunte apenas sobre a fronteira atual; uma decisão que depende de outra resposta fica para
  depois.
- Após cada resposta, atualize a árvore e recalcule a próxima pergunta.
- A interface continua sendo sequencial: faça uma pergunta por mensagem, mesmo quando houver
  mais de uma decisão independente disponível.
- O discovery termina quando não houver decisões bloqueantes ou premissas silenciosas e o
  usuário confirmar que o entendimento está compartilhado.

Mantenha uma matriz de decisões durante a sessão:

| ID | Decisão | Resposta confirmada | Fonte/contexto | Desbloqueia | Persistência | Destino |
|---|---|---|---|---|---|---|
| DP-01 | [decisão] | [resposta] | [usuário/upstream] | [próximas decisões] | [PRD/PD/Domain/Vision] | [seção/RF/métrica] |

Não descarte a matriz ao terminar: use-a para verificar que decisões materiais foram refletidas
no PRD. Ela pode permanecer como registro de trabalho; o documento final deve conter pelo menos
as decisões relevantes para escopo, comportamento, prioridade e métricas.

### Persistência das decisões de produto

Classifique cada decisão confirmada antes de redigir:

- **PRD** — decisão específica desta feature; registre no PRD e não crie um documento separado.
- **PD-XXX** — decisão reutilizável por outros PRDs, política de negócio, termo canônico,
  limite de escopo ou trade-off material; use `references/product-decision-template.md`.
- **Domain Doc** — decisão que altera fronteiras, entidades, regras ou eventos do domínio; atualize
  o Domain Doc e referencie o PD quando houver rationale reutilizável.
- **Vision Doc** — decisão que altera objetivos, escopo macro ou restrições globais; atualize o
  Vision Doc e referencie o PD quando houver rationale reutilizável.
- **TechSpec/ADR** — decisão de arquitetura ou implementação; não registre como PD.

Não crie PD para escolhas locais, reversíveis ou que já estejam suficientemente expressas em um
requisito. Para persistir um PD, a decisão deve estar confirmada pelo usuário e atender pelo
menos um dos critérios de reutilização, política, vocabulário, fronteira ou trade-off relevante.

Durante o discovery, registre o PD como `Proposed`. Depois da aprovação final do PRD, marque-o
como `Accepted` e atualize `docs/product-decisions/index.md`. Se o usuário descartar ou substituir
a decisão, marque o registro como `Withdrawn` ou `Superseded`; nunca deixe uma decisão antiga
parecendo vigente. Um PD `Proposed` pode orientar a conversa, mas nunca deve ser tratado como
restrição normativa sem nova confirmação.

Nunca altere um PD `Accepted` em lugar para mudar sua decisão: crie um novo PD `Proposed` com
`Substitui: PD-XXX` e, após a aprovação, marque o anterior como `Superseded`.

### 2. Discovery

Coletar contexto inicial sobre a ideia ou espaço do problema.

#### Standalone Mode (discovery completo)

- Qual é o problema central ou oportunidade?
- Quem são os usuários afetados?
- O que motivou esta iniciativa agora?
- Há restrições conhecidas (prazo, orçamento, conformidade)?

#### Pipeline Mode (discovery focado em lacunas)

- Comportamento detalhado da feature (o que ainda não está coberto pelo Domain Doc)
- Casos extremos e tratamento de exceções
- Métricas específicas desta feature
- Restrições adicionais não capturadas upstream

### 3. Understanding

Aprofundar o conhecimento sobre requisitos e restrições.

- O QUÊ específico os usuários precisam?
- POR QUÊ isso entrega valor de negócio?
- QUEM são os usuários-alvo e como é o fluxo atual deles?
- Quais são os critérios de sucesso mensuráveis?
- Quais critérios de aceitação são esperados para os fluxos principais?

### 4. Options

Apresentar 2-3 abordagens distintas para o usuário avaliar.

- Cada abordagem deve ter trade-offs explícitos (esforço, risco, valor entregue)
- Liderar com a abordagem recomendada explicando o porquê
- As abordagens devem diferir significativamente em escopo, faseamento ou estratégia
- Aguardar a seleção do usuário antes de prosseguir

### 5. Refinement

Refinar a abordagem selecionada com follow-ups dirigidos.

- Esclarecer limites de escopo da abordagem escolhida
- Confirmar faseamento e priorização (MoSCoW) das funcionalidades
- Validar critérios de sucesso e métricas
- Resolver questões em aberto remanescentes

### 6. Creation

Gerar o documento PRD usando o contexto coletado.

- Ler e preencher o template `prd-template.md`
- Ler `references/product-decision-template.md` quando a matriz indicar persistência em `PD-XXX`
- Cada seção deve refletir decisões confirmadas
- Preencher `Termos Canônicos` e `Decisões de Produto` quando forem aplicáveis
- Conferir a matriz de decisões contra o draft para não perder decisões materiais
- Itens não resolvidos vão para "Questões em Aberto"
- Apresentar draft completo ao usuário (não seção por seção)

---

## Regras Globais

### Ferramenta de Pergunta Interativa (Obrigatória)

- Toda pergunta DEVE ser feita usando a ferramenta de pergunta interativa do runtime — aquela
  que apresenta a pergunta e **pausa a execução até o usuário responder**.
- Não envie perguntas como texto comum continuando a gerar.
- Se a ferramenta não estiver disponível, apresente a pergunta como sua mensagem completa e
  pare de gerar.

### Limite de Perguntas

- **Apenas uma pergunta por mensagem.** Se um tópico precisa de exploração mais profunda,
  divida em sequência de perguntas individuais.
- Sua mensagem deve conter exatamente um ponto de interrogação.
- Após a pergunta, PARE de gerar. Não adicione "também", "adicionalmente" ou variantes.
- Aguarde a resposta do usuário antes da próxima pergunta.

#### Anti-pattern (PROIBIDO)

> "Qual é a persona primária? Também, quais são as métricas de sucesso?"

Isso são duas perguntas. Divida em duas mensagens separadas.

### Multiple-Choice Obrigatório

- Toda pergunta DEVE ser multiple-choice quando opções razoáveis podem ser predeterminadas.
- Formate como opções rotuladas (A, B, C...) para resposta com letra única.
- Use perguntas abertas apenas quando o espaço de resposta for genuinamente ilimitado
  (ex: "Qual problema você está tentando resolver?").
- Quando houver uma opção recomendável, apresente-a explicitamente depois das opções, com uma
  justificativa curta. A recomendação é uma proposta do agente; a decisão continua sendo do
  usuário.

### Fallback Obrigatório

- Toda pergunta multiple-choice deve incluir uma opção de escape:
  > "E) Outro — descreva"

### Decomposição de Tópicos Complexos

Para features com muitas dimensões, decomponha em sub-tópicos e pergunte sobre uma dimensão por
vez. Cada sub-tópico geralmente tem opções predetermináveis.

#### Exemplo

ERRADO (pergunta aberta):
> "O que a feature de colaboração deve incluir?"

CORRETO (decomposta + multiple-choice):
> "Qual aspecto de colaboração em equipe é mais importante para começar?
> A) Workspaces compartilhados
> B) Presença em tempo real
> C) Controles de permissão
> D) Feed de atividade
> E) Outro — descreva"

### Fatos versus decisões

- **Fatos** devem ser obtidos pelo agente lendo `_idea.md`, Vision Doc, Domain Doc e outros
  documentos explicitamente fornecidos. Não pergunte ao usuário algo que esses artefatos já
  respondem.
- **Decisões de produto** pertencem ao usuário. Não responda suas próprias perguntas nem trate
  uma recomendação como aprovação.
- Como esta skill não explora o codebase, perguntas sobre implementação, arquitetura ou estado
  atual do código devem ser deixadas para a TechSpec ou para ferramentas especializadas.

### Cenários de estresse

Quando uma decisão envolver comportamento, estados, papéis ou fronteiras, teste-a com cenários
concretos antes de considerá-la resolvida:

- fluxo principal;
- variação de permissão, perfil ou estado;
- entrada inválida ou caso extremo;
- resultado esperado quando a ação não puder ser concluída.

Use um cenário por vez e converta cada ambiguidade encontrada em uma nova pergunta na próxima
mensagem.

### Portões de Progressão

- Concluir pelo menos uma rodada completa de Discovery + Understanding antes de apresentar
  Options.
- Ter clareza sobre propósito, restrições e critérios de sucesso antes de apresentar abordagens.
- Ter aprovação do usuário sobre uma abordagem antes de entrar em Refinement.
- Esvaziar a fronteira de decisões bloqueantes e confirmar entendimento compartilhado antes de
  iniciar Creation.
- Não escrever o PRD até completar Refinement sem ambiguidades bloqueantes.

### Limites de Foco

- Perguntas devem focar em QUÊ, POR QUÊ e QUEM.
- Nunca pergunte COMO, ONDE ou QUAL sobre implementação técnica.

#### Tópicos proibidos

- Bancos de dados específicos
- Frameworks ou bibliotecas
- Estrutura de código
- Padrões arquiteturais
- Estratégias de teste
- Infraestrutura de deployment
- Detalhes de API/protocolo

> Estes tópicos pertencem à TechSpec, não ao PRD.

### Princípio YAGNI

- Remover ruthlessly funcionalidades não-essenciais durante o Refinement.
- Questionar cada feature: o MVP precisa disso?
- Diferir features "nice-to-have" para fases posteriores.
- Preferir escopo menor e bem definido sobre amplitude ambiciosa.

### Anti-Pattern: Pular Brainstorming Para Features "Simples"

Toda funcionalidade passa pelo protocolo completo, independentemente da percepção de
simplicidade. Features simples são justamente onde premissas de negócio não examinadas geram
mais retrabalho. O brainstorming pode ser breve, mas deve acontecer.

### Anti-Pattern: Re-Perguntar o que Está nos Docs Upstream

Em Pipeline Mode, **nunca** pergunte ao usuário o que já está no Vision Doc ou Domain Doc.
Liste explicitamente o contexto herdado antes de qualquer pergunta. Se houver divergência entre
o input do usuário e os docs upstream, aponte explicitamente — não silenciosamente ignore.

### Anti-Pattern: Criar estado paralelo de engenharia

- Não criar ou atualizar `CONTEXT.md` durante o PRD. Em Pipeline Mode, Vision/Domain Docs são a
  fonte de verdade; em Standalone Mode, registre termos canônicos relevantes no próprio PRD.
- Não criar ADRs para decisões de produto. Registre decisões de escopo e comportamento em
  `Decisões de Produto` ou `Alternativas Consideradas`; decisões arquiteturais ficam para a
  TechSpec.
- Um `PD-XXX` é permitido somente para uma decisão de produto reutilizável e deve seguir o
  template, o status e o índice definidos em `product-decision-template.md`.
- Não deixar decisões materiais somente na conversa: mapeie-as na matriz e no documento final.

### Anti-Pattern: Drift Técnico em Features Tecnicamente Nomeadas

Quando o nome da feature soa técnico ("notificações por webhook", "exportação CSV", "modo
escuro"), traduza para a pergunta de necessidade do usuário por trás:

- ERRADO: "Devemos usar WebSockets ou polling?"
- CORRETO: "Quais eventos devem disparar uma notificação ao usuário?"

- ERRADO: "Qual formato de biblioteca CSV adotar?"
- CORRETO: "Quais informações os usuários precisam nos relatórios exportados?"

### Idioma

Conduza perguntas, recomendações, notas e drafts no idioma usado pelo usuário. Para esta skill,
use Português Brasileiro por padrão. Preserve IDs, nomes próprios e termos canônicos em seu
formato original quando isso evitar ambiguidade.
