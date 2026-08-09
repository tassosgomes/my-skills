# Template de Product Requirement Document (PRD)

> Use este template para estruturar todo PRD. Preencha cada seção com base no resultado do
> brainstorming. A seção **Rastreabilidade** é incluída apenas em Pipeline Mode (quando há
> Vision Doc e/ou Domain Doc disponíveis). Marque pendências em "Questões em Aberto" ao invés
> de adivinhar respostas.

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

### Vision Doc

- **Objetivos de negócio atendidos**: [Listar IDs ou descrições dos objetivos do Vision Doc
  que esta feature endereça]
- **Restrições globais aplicáveis**: [Stack, regulatório, prazos herdados]
- **Non-Goals globais respeitados**: [Itens do Vision Doc que esta feature não viola]

### Domain Doc

- **ID da feature**: [Ex: F03 — Aprovação de Pagamentos]
- **Entidades envolvidas**: [Listar pelos nomes exatos definidos no Domain Doc]
- **Regras de negócio referenciadas**: [Ex: RN-04, RN-07]
- **Dependências upstream**: [Outras features das quais esta depende]
- **Dependências downstream**: [Features que dependem desta]
- **Eventos consumidos**: [Eventos do domínio que esta feature ouve]
- **Eventos produzidos**: [Eventos do domínio que esta feature emite]

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