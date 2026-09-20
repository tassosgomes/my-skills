# Template de Product Requirement Document (PRD)

> Use este template para estruturar todo PRD. A seção **Rastreabilidade** é incluída apenas em
> Pipeline Mode (quando há Vision Doc e/ou Domain Doc disponíveis). Marque pendências em
> "Questões em Aberto" ao invés de adivinhar respostas.
>
> **Seção sem conteúdo material é omitida**, não preenchida com "N/A" nem com uma justificativa
> de não-aplicabilidade. A ausência é a declaração.
>
> **Não há limite de extensão.** Comportamento, regra de negócio e critério de aceite recebem o
> espaço que precisarem para ficar inequívocos. O PRD encolhe cortando seção supérflua, nunca
> detalhe útil.

---

# [Nome da Funcionalidade]

## Visão Geral

[Forneça uma visão geral de alto nível da funcionalidade. Explique:
- Qual problema resolve
- Para quem é (usuários afetados)
- Por que é valioso (impacto de negócio)]

---

## Rastreabilidade

> **Esta seção é obrigatória em Pipeline Mode e omitida em Standalone Mode.**

### Capacidade e fronteiras

- **Capacidade:** [CAP-XXX — título exato do backlog. O PRD pertence a uma capacidade, nunca a um domínio]
- **Escopo desta entrega:** [**obrigatório.** O recorte da capacidade que *este* PRD entrega.
  Ex.: "CAP-026 em fatia mínima: e-mail transacional, um canal, sem preferência e sem campanha."
  Se entrega a capacidade inteira, declare isso explicitamente. Uma capacidade pode render mais de
  um PRD ao longo do tempo; a fatia mínima é o primeiro deles, não uma capacidade capenga]
- **Fora desta entrega:** [partes da capacidade adiadas, com a fase em que voltam]
- **Domínios atravessados:** [nomes canônicos + caminho de cada domain doc consumido. Uma fatia
  vertical cruza domínios com frequência]
- **Junta entre os domínios:** [quando atravessa dois ou mais: onde um termina e o outro começa e
  quem é dono do dado. Herdado do domain doc e do Domain Map — não é decidido aqui]
- **Dependências entre capacidades:** [herdadas do backlog. Ex.: CAP-001 depende de CAP-026]
- **Restrições do baseline:** [somente as que limitam o escopo, sem decisões de implementação]

### Vision Doc

- **Objetivos de negócio atendidos**: [Listar IDs ou descrições dos objetivos do Vision Doc
  que esta entrega endereça]
- **Restrições globais aplicáveis**: [Stack, regulatório, prazos herdados]
- **Non-Goals globais respeitados**: [Itens do Vision Doc que esta entrega não viola]

### Domain Docs

> Uma fatia vertical pode consumir **mais de um** domain doc — liste todos. Quando um domínio da
> fatia ainda não tem domain doc (porque rende um único PRD), as regras dele nascem aqui, nesta
> entrega, e serão absorvidas pelo domain doc quando ele existir.

- **Entidades envolvidas**: [nomes exatos definidos nos Domain Docs, indicando o domínio de cada uma]
- **Regras de negócio referenciadas**: [Ex: RN-04, RN-07 — com o domínio de origem]
- **Regras nascidas neste PRD**: [quando o domínio não tem domain doc; numere no mesmo padrão RN-XX]
- **Eventos consumidos**: [eventos que esta entrega ouve]
- **Eventos produzidos**: [eventos que esta entrega emite]

## Termos Canônicos

> **Seção condicional.** Inclua quando o discovery resolver termos novos, sinônimos ou
> ambiguidades relevantes. Em Pipeline Mode, não redefina termos do Vision/Domain Doc; registre
> apenas esclarecimentos compatíveis ou divergências que foram resolvidas.

| Termo | Definição de negócio | Escopo/Fonte |
|---|---|---|
| [Termo] | [Definição de negócio, sem implementação] | [Vision Doc, Domain Doc ou decisão desta entrega] |

---

## Objetivos

[Liste objetivos específicos e mensuráveis para esta funcionalidade:

- Como é o sucesso (resultados concretos esperados)
- Métricas principais para acompanhar
- Objetivos de negócio a alcançar
- Marcos temporais quando aplicável]

---

## Histórias de Usuário

[Detalhe as narrativas do usuário descrevendo uso e benefícios:

- Como [tipo de usuário], eu quero [realizar uma ação] para que [benefício]
- Inclua personas primárias e secundárias
- Cubra fluxos principais e variações importantes]

**Exemplo:**

- Como **Aprovador Financeiro**, eu quero visualizar pagamentos pendentes ordenados por prazo
  de vencimento para que eu priorize aprovações urgentes.
- Como **Solicitante**, eu quero acompanhar o status de meus pagamentos enviados para que eu
  saiba quando precisarei agir.

---

## Funcionalidades Principais

[Liste e descreva as funcionalidades principais. Cada uma deve ter:
- Identificador (RF-XX)
- Descrição clara
- Critérios de aceitação no formato Given/When/Then
- Classificação MoSCoW
- Rastreabilidade a regras de negócio (Pipeline Mode)]

### RF-01: [Nome da Funcionalidade]

**Descrição**: [O que faz, em linguagem de negócio. Sem detalhes de implementação.]

**Critérios de Aceitação**:

- **Given** [contexto inicial]
  **When** [ação do usuário]
  **Then** [resultado esperado]

- **Given** [contexto alternativo / caso extremo]
  **When** [ação do usuário]
  **Then** [comportamento esperado]

**Prioridade**: [Must Have | Should Have | Could Have | Won't Have]

**Rastreabilidade** *(Pipeline Mode)*: [RN-XX, RN-YY]

---

### RF-02: [Próxima Funcionalidade]

[Repetir a estrutura acima]

---

## Experiência do Usuário

[Descreva a jornada e experiência do usuário:

- Personas e suas necessidades
- Fluxos principais passo a passo
- Considerações e requisitos de UI/UX
- Requisitos de acessibilidade
- Onboarding e descoberta da funcionalidade]

> Foco no comportamento percebido pelo usuário, não em escolhas de tecnologia ou framework.

## Decisões de Produto

> **Seção condicional.** Inclua decisões confirmadas que alteram escopo, comportamento,
> priorização ou métricas e que não ficam suficientemente claras nos requisitos. Não registre
> decisões arquiteturais ou de implementação; elas pertencem à TechSpec. Quando a decisão for
> reutilizável, inclua o link do `PD-XXX` correspondente.

| ID | Decisão confirmada | Alternativas descartadas e motivo | Impacto no PRD | Registro |
|---|---|---|---|---|
| DP-01 | [Decisão] | [Alternativas e trade-off] | [RF, métrica, fase ou non-goal afetado] | [PD-XXX ou —] |

---

## Restrições Técnicas de Alto Nível

> **Seção opcional.** Inclua apenas restrições que delimitam escopo de produto, sem prescrever
> solução. Detalhes de implementação pertencem à TechSpec.

[Capture apenas restrições e considerações de alto nível:

- Integrações externas requeridas ou sistemas existentes para interfacear
- Mandatos de conformidade, regulatórios ou de segurança
- Metas de performance/escalabilidade do ponto de vista do usuário
- Considerações de sensibilidade de dados/privacidade
- Requisitos não negociáveis de tecnologia ou protocolo (somente se herdados de Vision Doc)]

---

## Não-Objetivos (Fora de Escopo)

[Declare claramente o que esta funcionalidade NÃO incluirá:

- Funcionalidades explicitamente excluídas
- Considerações futuras que estão fora deste escopo
- Limites e limitações conscientemente assumidas
- Casos de uso que serão tratados em outro lugar ou momento]

> Em Pipeline Mode, Non-Goals do Vision Doc são automaticamente Non-Goals do PRD.

---

## Plano de Rollout Faseado

[Plano de entrega incremental com critérios de sucesso por fase:]

### MVP (Fase 1)

- **Funcionalidades incluídas**: [Listar IDs RF-XX que entram no MVP]
- **Critérios de sucesso para avançar à Fase 2**: [Métricas concretas e observáveis]

### Fase 2

- **Funcionalidades adicionais**: [IDs RF-XX]
- **Critérios de sucesso para avançar à Fase 3**: [Métricas]

### Fase 3 (Conjunto Completo)

- **Funcionalidades restantes**: [IDs RF-XX]
- **Critérios de sucesso de longo prazo**: [Métricas]

---

## Métricas de Sucesso

[Medidas quantificáveis de sucesso:

- Métricas de engajamento do usuário (ex: taxa de adoção, frequência de uso)
- Benchmarks de performance da perspectiva do usuário (ex: tempo médio de tarefa)
- Indicadores de impacto de negócio (ex: redução de custo, aumento de receita)
- Atributos de qualidade observáveis (ex: taxa de erro, satisfação)]

> Cada métrica deve ter: nome, definição, valor-alvo e prazo para atingir.

---

## Riscos e Mitigações

[Riscos não-técnicos que podem afetar o produto:

- **Riscos de adoção**: [Resistência de usuários, curva de aprendizado] — Mitigação: [...]
- **Riscos competitivos**: [Concorrentes lançando funcionalidade similar] — Mitigação: [...]
- **Riscos de prazo e recurso**: [Dependências externas, capacidade de equipe] — Mitigação: [...]
- **Riscos de dependências externas**: [Fatores fora de controle] — Mitigação: [...]]

> Riscos técnicos (complexidade arquitetural, dívida técnica, etc.) pertencem à TechSpec.

---

## Alternativas Consideradas

[Registre as abordagens avaliadas durante o brainstorming, incluindo a escolhida e as
rejeitadas. Para cada alternativa rejeitada, explique os trade-offs que levaram à decisão.]

### Abordagem Escolhida: [Nome]

- **Descrição**: [Resumo da abordagem]
- **Por que foi escolhida**: [Razões principais]

### Alternativa Rejeitada 1: [Nome]

- **Descrição**: [Resumo]
- **Trade-offs**: [Vantagens e desvantagens]
- **Por que foi rejeitada**: [Razão objetiva]

### Alternativa Rejeitada 2: [Nome]

[Repetir a estrutura acima]

---

## Questões em Aberto

[Liste questões restantes ou áreas precisando de esclarecimento adicional:

- Requisitos não claros ou casos extremos não resolvidos
- Perguntas sobre necessidades do usuário ou objetivos de negócio
- Dependências de fatores externos ainda não confirmados
- Áreas que requerem design ou pesquisa de usuário antes da implementação]

> Cada item deve indicar: quem precisa responder, prazo desejável e impacto se não resolvido.
