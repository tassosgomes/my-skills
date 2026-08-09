---
name: tsg-flow-prd-creator
description: >
  Cria Product Requirement Documents (PRDs) corporativos, autocontidos e acionáveis através de
  brainstorming estruturado. Use esta skill sempre que o usuário quiser criar um PRD, definir
  requisitos de produto, especificar uma nova funcionalidade, documentar uma ideia de produto,
  ou mencionar "PRD", "requisitos de produto", "documento de requisitos", "nova feature",
  "nova funcionalidade", "especificação de produto". Também dispare quando o usuário disser
  "quero construir X", "preciso de um plano para X", "vamos definir o escopo de X", ou qualquer
  variação que indique a necessidade de capturar requisitos antes de implementar. Funciona em
  dois modos: Pipeline Mode (com Vision Doc e/ou Domain Doc disponíveis, herdando contexto) ou
  Standalone Mode (discovery completo). Esta skill é a etapa PRD do pipeline corporativo
  Vision → Domain → PRD → TechSpec → Tasks.
metadata:
  group: tsg-flow
---

# PRD Creator

Cria PRDs orientados a impacto de negócio, com requisitos testáveis, escopo bem definido e
rastreabilidade explícita. O documento gerado é **autocontido** — carrega todo o contexto
necessário para sobreviver à travessia entre PMs, arquitetos, desenvolvedores e QA. Serve como
entrada para a skill `tsg-flow-techspec-creator`.

## Filosofia

PRD é um artefato corporativo que **pode nascer fora do repositório de desenvolvimento**.
Por isso:

- **Sem exploração de codebase** — não é responsabilidade desta skill. Ferramentas
  especializadas de mapeamento de código (ex: Graphify) ou o próprio Domain Doc cumprem esse
  papel upstream.
- **Sem pesquisa de mercado** — se relevante, deveria estar consolidada no Vision Doc.
- **Sem ADRs** — decisões arquiteturais pertencem à TechSpec. Decisões de produto ficam
  registradas inline na seção "Alternativas Consideradas" do próprio PRD.
- **Foco total em discovery conversacional estruturado** — perguntas cirúrgicas, uma por vez,
  multiple-choice, com fallback. A qualidade do PRD vem da qualidade do discovery, não de
  research automatizado.

## Hard-Gate

```
NÃO escrever o PRD até que:
- A verificação de contexto upstream (Vision Doc / Domain Doc) esteja completa
- O Discovery tenha pelo menos uma rodada completa
- 2-3 abordagens tenham sido apresentadas com trade-offs
- O usuário tenha selecionado uma abordagem
- O Refinement tenha resolvido todas as ambiguidades bloqueantes
- O usuário tenha aprovado o draft final

Esta regra se aplica a TODO PRD, mesmo features percebidas como "simples".
```

## Anti-Patterns

### Anti-Pattern 1: "Esta feature é simples demais para brainstorming completo"

Toda funcionalidade passa pelo fluxo completo, independentemente da percepção de simplicidade.
Um único botão, um pequeno ajuste de workflow, uma opção de configuração — todas. Features
"simples" são justamente onde premissas de negócio não examinadas geram mais retrabalho. O
brainstorming pode ser breve para features genuinamente simples, mas o discovery e a aprovação
da abordagem são obrigatórios.

### Anti-Pattern 2: Burocracia de fim de fluxo

Depois que o usuário respondeu às perguntas de clarificação e aprovou uma abordagem, **não**
force uma segunda rodada de aprovações para Visão Geral, Objetivos, Histórias de Usuário ou
qualquer outra seção. Sintetize a direção aprovada diretamente no PRD. O usuário revisa e pede
edições no arquivo gerado depois.

### Anti-Pattern 3: Drift técnico em features tecnicamente nomeadas

Quando o nome da feature soa técnico (ex: "notificações por webhook", "exportação CSV", "modo
escuro", "rate limiting de API"), há tentação de discutir o COMO. Resista. Seu trabalho é o
QUÊ e POR QUÊ:

- ERRADO: "Devemos usar WebSockets ou polling para notificações?" (implementação)
- ERRADO: "Qual formato de biblioteca CSV devemos adotar?" (implementação)
- CORRETO: "Quais eventos devem disparar uma notificação ao usuário?" (necessidade)
- CORRETO: "Quais informações os usuários precisam nos relatórios exportados?" (necessidade)

Traduza toda feature tecnicamente nomeada para a pergunta de experiência por trás.

### Anti-Pattern 4: Re-perguntar o que já está documentado upstream

Em Pipeline Mode, **nunca** pergunte ao usuário o que já está no Vision Doc ou Domain Doc.
Antes de qualquer pergunta, liste explicitamente o que foi herdado para que o usuário saiba o
que não precisa repetir. Foque as perguntas exclusivamente nas lacunas.

## Asking Questions (Protocolo Obrigatório)

Quando esta skill instruir você a fazer uma pergunta ao usuário, você DEVE usar a ferramenta
de pergunta interativa do runtime — aquela que apresenta a pergunta e **pausa a execução até
o usuário responder**. Não envie perguntas como texto de assistente comum continuando a gerar.
Sempre use o mecanismo bloqueante.

Se o runtime não fornecer tal ferramenta, apresente a pergunta como sua mensagem completa e
pare de gerar. Não responda à própria pergunta nem prossiga sem input do usuário.

### Regras de pergunta (estritas)

- **Uma pergunta por mensagem.** Sua mensagem deve ter exatamente um ponto de interrogação.
  Após a pergunta, PARE. Não adicione "também", "adicionalmente" ou perguntas de follow-up.
  Se um tópico precisa de mais exploração, faça follow-up na PRÓXIMA mensagem após a resposta.

  Anti-pattern (PROIBIDO):
  > "Qual é a persona primária? Também, quais são as métricas de sucesso?"
  > Isso são DUAS perguntas. Divida em duas mensagens separadas.

- **Multiple-choice obrigatório quando opções são predetermináveis.** Formate como opções
  rotuladas (A, B, C, etc.) para o usuário responder com uma única letra. Use perguntas
  abertas apenas quando o espaço de resposta for genuinamente ilimitado (ex: "Qual problema
  você está tentando resolver?").

- **Fallback obrigatório.** Inclua sempre uma opção de escape (ex: "D) Outro — descreva").

- **Decomposição de tópicos complexos.** Para features com muitas dimensões, decomponha em
  sub-tópicos e pergunte sobre uma dimensão por vez. Cada sub-tópico geralmente tem opções
  predetermináveis.

  Exemplo: ao invés da pergunta aberta "O que a feature de colaboração deve incluir?",
  pergunte:
  > "Qual aspecto de colaboração em equipe é mais importante para começar?
  > A) Workspaces compartilhados
  > B) Presença em tempo real
  > C) Controles de permissão
  > D) Feed de atividade
  > E) Outro — descreva"

## Inputs Aceitos

- Nome da funcionalidade ou ideia de produto.
- Opcional: arquivo `_idea.md` existente no diretório alvo, usado como contexto inicial.
- Opcional: arquivo `prd.md` existente no diretório alvo (ativa fluxo de update).

## Workflow

O fluxo é sequencial. Cada fase deve ser completada antes de avançar.

### Fase 1: Determinar Projeto e Diretório

1. Derivar o slug do nome da funcionalidade fornecido pelo usuário (ex: "Aprovação de
   Pagamentos" → `aprovacao-de-pagamentos`).
2. O diretório alvo é `tasks/prd-[slug]/`.
3. Se o diretório não existir, criá-lo.
4. Se `_idea.md` existir no diretório, lê-lo como contexto inicial.
5. Se `prd.md` já existir no diretório, **informar o usuário e perguntar**:

   > "Já existe um PRD em `tasks/prd-[slug]/prd.md`. Como você quer prosseguir?
   > A) Atualizar o PRD existente (preservar seções não alteradas)
   > B) Partir do zero (sobrescrever o atual)
   > C) Cancelar"

   - Se A: ativar **Update Mode** — preservar todas as seções que o usuário não pedir para
     alterar. Aplicar perguntas de clarificação apenas para a área a ser modificada.
   - Se B: prosseguir normalmente (sobrescrita acontecerá ao final).
   - Se C: encerrar a skill.

### Fase 2: Verificar Contexto Upstream

Antes de qualquer pergunta:

1. Verificar se `vision.md` está disponível no contexto ou em local conhecido do projeto.
2. Verificar se `domains/[nome]/domain.md` está disponível.
3. Determinar o modo de operação:
   - **Pipeline Mode** — pelo menos um dos dois documentos existe.
   - **Standalone Mode** — nenhum dos dois existe.

#### O que extrair do Vision Doc (Pipeline Mode)

- Objetivos de negócio e problema central do sistema
- Perfis de usuário (roles) relevantes para esta feature
- Restrições globais: stack, regulatório, prazo, integrações obrigatórias
- Non-Goals do sistema (para garantir que o PRD não ultrapasse o escopo global)
- Termos do glossário aplicáveis a esta feature

#### O que extrair do Domain Doc (Pipeline Mode)

- ID e descrição da feature a ser detalhada (ex: F02 — Aprovação de Pagamentos)
- Entidades de negócio relevantes — usar os nomes exatos definidos no Domain Doc
- Regras de negócio aplicáveis — referenciar pelos IDs (ex: RN-01, RN-02)
- Perfis de usuário que interagem com esta feature e suas ações principais
- Dependências upstream/downstream relevantes
- Eventos de domínio que esta feature produz ou consome
- Prioridade MoSCoW já atribuída no Domain Doc (preservar, salvo indicação contrária)

#### Confirmação de escopo (Pipeline Mode)

Se o Domain Doc identificar a feature por ID, confirmar com o usuário:

> "Identifiquei que vamos detalhar a feature **F03 — Aprovação de Pagamentos** do Domain Doc.
> Confirma?"

#### Apresentação do contexto herdado

Antes de fazer qualquer pergunta de discovery, listar explicitamente o que foi extraído:

> "Do Vision Doc, herdei:
> - Objetivo de negócio: reduzir tempo médio de aprovação de pagamentos em 40%
> - Stack obrigatória: Java/Spring Boot, PostgreSQL
> - Non-Goal global: integração com sistemas de PIX (fora do escopo do produto)
>
> Do Domain Doc (feature F03), herdei:
> - Entidades: Pagamento, Aprovador, FluxoDeAprovação
> - Regras de negócio: RN-04 (limite de alçada), RN-07 (segregação de funções)
> - Dependência upstream: F01 (Cadastro de Usuários)
>
> Vou focar minhas perguntas no comportamento detalhado, casos extremos, métricas e critérios
> de aceitação que ainda não estão cobertos."

### Fase 3: Discovery Estruturado

Aplicar as **regras de pergunta** definidas acima (uma por vez, multiple-choice, fallback).

#### Em Pipeline Mode

Foco exclusivo nas lacunas:

- Comportamento detalhado da feature (fluxos principais e variações)
- Casos extremos e tratamento de exceções
- Critérios de aceitação específicos
- Métricas de sucesso mensuráveis para esta feature
- Restrições adicionais não capturadas upstream
- O que explicitamente NÃO faz parte desta feature (Non-Goals da feature)
- Riscos específicos desta feature

#### Em Standalone Mode

Discovery completo:

- Problema central e contexto
- Personas e suas necessidades atuais
- Critérios de sucesso e métricas
- Restrições conhecidas (prazo, orçamento, conformidade)
- Integrações obrigatórias com sistemas existentes
- Non-Goals e limites de escopo

#### Regras de progressão

- Concluir pelo menos uma rodada completa de Discovery antes de apresentar abordagens.
- Não avançar com ambiguidade bloqueante. Se houver, continuar perguntando.

### Fase 4: Apresentar Abordagens

Apresentar **2-3 abordagens distintas** para entregar a feature, cada uma com:

- Descrição clara do que entrega
- Trade-offs explícitos (esforço, risco, valor entregue)
- Indicação de qual é a recomendada e por quê

As abordagens devem diferir em escopo, faseamento ou estratégia — não apenas em detalhes
cosméticos.

Apresentar como pergunta multiple-choice:

> "Identifiquei três abordagens possíveis. Recomendo a A pelos motivos descritos. Qual prefere?
> A) [Descrição + trade-offs] (Recomendada)
> B) [Descrição + trade-offs]
> C) [Descrição + trade-offs]
> D) Outro — descreva"

Aguardar a seleção antes de prosseguir.

### Fase 5: Refinement

Com a abordagem escolhida, fazer perguntas dirigidas para refinar:

- Limites exatos do escopo da abordagem escolhida
- Faseamento e priorização de funcionalidades (MoSCoW)
- Confirmação de métricas e critérios de sucesso
- Resolução de questões em aberto remanescentes

Aplicar **YAGNI** ruthlessly: questionar cada feature contra a necessidade do MVP.

### Fase 6: Redigir o PRD

Ler o template em `references/prd-template.md` e preencher todas as seções com o contexto
coletado.

#### Diretrizes de redação obrigatórias

- Foco no QUÊ e POR QUÊ — nunca no COMO (isso vai para a TechSpec).
- Manter ~1.000 palavras (não inflar).
- Voz ativa, omitir palavras desnecessárias, linguagem específica e definida.
- Idioma: **Português Brasileiro**.
- Tom: técnico, claro, consistente com artefatos corporativos.

#### Seções obrigatórias (sempre incluir)

1. Visão Geral
2. Objetivos
3. Histórias de Usuário
4. Funcionalidades Principais (numeradas, com critérios Given/When/Then e MoSCoW)
5. Experiência do Usuário
6. Não-Objetivos (Fora de Escopo)
7. Plano de Rollout Faseado (MVP → Phase 2 → Phase 3)
8. Métricas de Sucesso
9. Riscos e Mitigações (de produto/negócio)
10. Alternativas Consideradas (abordagens rejeitadas + trade-offs)
11. Questões em Aberto

#### Seções condicionais

- **Rastreabilidade** *(apenas Pipeline Mode)* — referências ao Vision Doc (objetivos
  atendidos) e ao Domain Doc (ID da feature, regras RN-XX referenciadas, entidades envolvidas,
  eventos consumidos/produzidos).
- **Restrições Técnicas de Alto Nível** *(quando aplicável)* — apenas restrições que delimitam
  escopo, sem prescrever solução.

#### Formato de critérios de aceitação

Para cada funcionalidade principal, incluir critérios no formato Given/When/Then:

```
**RF-01: Aprovar Pagamento**

Descrição: O sistema deve permitir que aprovadores autorizados aprovem pagamentos pendentes
dentro de seu limite de alçada.

Critérios de Aceitação:
- Given um pagamento com status "Pendente" e valor dentro do limite do aprovador
  When o aprovador clica em "Aprovar"
  Then o pagamento muda para status "Aprovado" e o evento PagamentoAprovado é publicado

- Given um pagamento com valor acima do limite do aprovador
  When o aprovador tenta aprovar
  Then o sistema bloqueia a ação e exibe mensagem indicando necessidade de alçada superior

Prioridade: Must Have
Rastreabilidade: RN-04 (Limite de Alçada), RN-07 (Segregação de Funções)
```

### Fase 7: Validação Interna

Antes de apresentar ao usuário, executar autoavaliação. Marcar mentalmente cada item:

- [ ] Todos os requisitos são testáveis (têm critérios Given/When/Then)?
- [ ] Existem termos vagos (ex: "rápido", "intuitivo", "simples")?
- [ ] Há conflitos entre requisitos?
- [ ] As métricas de sucesso são mensuráveis?
- [ ] O escopo está claramente delimitado (Non-Goals explícitos)?
- [ ] Cada requisito tem classificação MoSCoW?
- [ ] **[Pipeline Mode]** O PRD é consistente com o Vision Doc (escopo global, non-goals,
  glossário)?
- [ ] **[Pipeline Mode]** O PRD é consistente com o Domain Doc (entidades, regras RN-XX,
  dependências)?
- [ ] **[Pipeline Mode]** A seção Rastreabilidade está completa?
- [ ] As alternativas consideradas estão registradas com trade-offs?
- [ ] Nenhuma decisão de implementação técnica vazou para o PRD?

Se houver falhas, corrigir antes de apresentar.

### Fase 8: Review com o Usuário e Salvar

Apresentar o draft completo ao usuário e perguntar:

> "Aqui está o draft do PRD. Por favor, revise e me indique:
> A) Aprovado — salvar como está
> B) Ajustar seções específicas (me diga quais)
> C) Reescrever a seção X (me diga o que mudar)
> D) Descartar e começar de novo"

- Se A: salvar em `tasks/prd-[slug]/prd.md` e confirmar o caminho.
- Se B ou C: aplicar as mudanças e apresentar novamente.
- Se D: voltar à Fase 3 (Discovery).

Em caso de divergência detectada com Vision Doc ou Domain Doc, **apontar explicitamente** ao
usuário ao invés de silenciosamente ignorar.

## Protocolo de Saída

A resposta final, após salvar o arquivo, deve conter:

1. Resumo das decisões principais tomadas durante o brainstorming.
2. **[Pipeline Mode]** O que foi herdado do Vision Doc / Domain Doc vs. o que foi coletado
   nesta sessão.
3. Caminho do arquivo salvo: `tasks/prd-[slug]/prd.md`.
4. Lista de questões em aberto (se houver).
5. Indicação do próximo passo:
   > "Para gerar a Especificação Técnica a partir deste PRD, use a skill `tsg-flow-techspec-creator`.
   > A TechSpec é onde decisões arquiteturais (incluindo ADRs) serão tomadas."

## Princípios Fundamentais

- **PRD foca no QUÊ e POR QUÊ — nunca no COMO** (isso vai para a TechSpec).
- **PRD é autocontido** — deve permitir ao arquiteto criar a TechSpec sem voltar ao stakeholder.
- **Em Pipeline Mode, Vision e Domain Docs são fontes de verdade** — nunca redefinir termos
  já estabelecidos lá.
- **Divergências são apontadas, não ignoradas** — qualquer inconsistência com docs upstream é
  comunicada ao usuário explicitamente.
- **Non-Goals do sistema (Vision Doc) são Non-Goals do PRD** — não expandir o escopo global.
- **YAGNI ruthlessly** — questionar cada feature; remover qualquer coisa que o MVP não precise.
- **Uma pergunta por vez, multiple-choice, fallback** — não há exceção.
- **Update mode preserva trabalho prévio** — só altera o que o usuário pediu para alterar.

## Process Flow

```
Determinar projeto/diretório
        │
        ▼
PRD existe? ──Sim──► Update / Sobrescrever / Cancelar?
        │                            │
       Não                           ▼
        │                    [aplicar escolha]
        ▼                            │
Verificar contexto upstream ◄────────┘
        │
        ▼
Pipeline Mode? ──Sim──► Confirmar feature do Domain Doc
        │                            │
       Não                           ▼
        │                    Listar contexto herdado
        ▼                            │
Discovery completo            Discovery focado em lacunas
        │                            │
        └────────────┬───────────────┘
                     ▼
        Apresentar 2-3 abordagens com trade-offs
                     │
                     ▼
        Usuário seleciona abordagem
                     │
                     ▼
              Refinement
                     │
                     ▼
            Redigir PRD completo
                     │
                     ▼
            Validação interna
                     │
                     ▼
        Review com usuário (A/B/C/D)
                     │
              Aprovado?
              │       │
            Sim       Não ──► [revisar / voltar a Discovery]
              │
              ▼
        Salvar em tasks/prd-[slug]/prd.md
```

## Tratamento de Erros

- Se o usuário fornecer contexto insuficiente para uma seção, registrar em "Questões em
  Aberto" ao invés de adivinhar.
- Se o diretório alvo não puder ser criado, parar e reportar o erro de filesystem.
- Se houver inconsistência entre o input do usuário e o Vision/Domain Doc, apresentar a
  divergência ao usuário e perguntar como resolver.
- Em Update Mode, se a alteração solicitada conflitar com seções que serão preservadas,
  apontar o conflito e pedir orientação.
