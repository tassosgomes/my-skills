# Vision Document — [Nome do Sistema]

> **Nível 0 da hierarquia de documentação.** Este documento é a âncora de contexto para todos os Domain Docs, PRDs, Tech Specs e Tasks do projeto. Sempre que iniciar uma nova sessão com a IA, forneça este arquivo como contexto.

---

## 1. Visão Geral do Sistema (System Overview)

### Problema de Negócio
[Descreva o problema central que o sistema resolve. Seja específico sobre a dor, para quem e qual o impacto atual de não ter a solução.]

### Solução Proposta
[Descrição de alto nível do sistema — o que ele faz, não como. Evite detalhes técnicos aqui.]

### Público-Alvo (Target Audience)
| Perfil (Role) | Descrição | Necessidade Principal |
|---|---|---|
| [Ex: Gestor Financeiro] | [Quem é] | [O que precisa do sistema] |
| [Ex: Operador de Caixa] | [Quem é] | [O que precisa do sistema] |

### Contexto de Entrada
- [ ] Discovery com cliente
- [ ] Modernização de sistema legado
- [ ] Ideia nova (greenfield)

> **Se legado:** Descreva brevemente o sistema atual, suas limitações e o que será preservado vs. substituído.

---

## 2. Domínios Identificados (Domain Map)

> Um domínio é um conjunto coeso de responsabilidades de negócio com fronteiras bem definidas (bounded context).

| # | Domínio (Domain) | Responsabilidade Principal | Status | Domain Doc |
|---|---|---|---|---|
| D01 | [Ex: Financeiro] | [Ex: Contas a pagar/receber, fluxo de caixa] | `planned` | `domains/financeiro/domain.md` |
| D02 | [Ex: RH] | [Ex: Folha, ponto, admissão/demissão] | `planned` | `domains/rh/domain.md` |
| D03 | [Ex: Estoque] | [Ex: Entrada/saída, inventário, fornecedores] | `planned` | `domains/estoque/domain.md` |

**Status possíveis:** `planned` · `in-progress` · `done` · `out-of-scope`

---

## 3. Mapa de Interdependências (Dependency Map)

> Quais domínios dependem de quais. Use para identificar a ordem de desenvolvimento e riscos de acoplamento.

```
[Ex: Faturamento] ──depende de──→ [Financeiro]
[Financeiro]      ──depende de──→ [RH] (folha de pagamento)
[Estoque]         ──depende de──→ [Financeiro] (custos)
```

| Domínio Origem | Depende de | Tipo de Dependência | Risco |
|---|---|---|---|
| [Faturamento] | [Financeiro] | Dados (leitura) | Médio |
| [Financeiro] | [RH] | Evento (folha fechada) | Alto |

---

## 4. Roadmap Macro (High-Level Roadmap)

> Fases de entrega do sistema inteiro. Cada fase deve ser entregável e testável de forma independente.

### Fase 1 — [Nome] (MVP / Foundation)
**Objetivo:** [O que esta fase entrega de valor]
**Domínios incluídos:** D01, D02
**Critério de conclusão:** [Como sabemos que esta fase está done]

### Fase 2 — [Nome]
**Objetivo:** [O que esta fase entrega de valor]
**Domínios incluídos:** D03, D04
**Critério de conclusão:** [Como sabemos que esta fase está done]

### Fase 3 — [Nome]
**Objetivo:** [O que esta fase entrega de valor]
**Domínios incluídos:** D05
**Critério de conclusão:** [Como sabemos que esta fase está done]

---

## 5. Restrições Globais (Global Constraints)

> Restrições que se aplicam a **todo** o sistema, não a um domínio específico.

### Restrições Técnicas (Technical Constraints)
- **Stack obrigatória:** [Ex: Node.js + PostgreSQL, ou "sem restrição"]
- **Integrações obrigatórias:** [Ex: ERP legado via API REST, gateway de pagamento X]
- **Infraestrutura:** [Ex: Cloud AWS, on-premise, híbrido]
- **Autenticação:** [Ex: SSO corporativo, OAuth2, autenticação própria]

### Restrições de Negócio (Business Constraints)
- **Prazo:** [Ex: MVP em 4 meses]
- **Orçamento:** [Ex: Sem contratação de infra adicional]
- **Regulatório:** [Ex: LGPD, HIPAA, SOX, normas do setor]
- **Dados legados:** [Ex: Migração obrigatória de X anos de histórico]

### Non-Goals do Sistema
[O que este sistema explicitamente NÃO vai fazer — para todo o projeto, não por feature]
- [Ex: Não substituirá o sistema de BI existente]
- [Ex: Não incluirá app mobile nesta versão]

---

## 6. Glossário de Negócio (Business Glossary)

> Termos do domínio de negócio com definição acordada. Essencial para manter consistência entre domínios e sessões com a IA.

| Termo | Definição | Domínio(s) |
|---|---|---|
| [Ex: NF-e] | [Nota Fiscal Eletrônica — documento fiscal digital] | Financeiro, Faturamento |
| [Ex: Centro de Custo] | [Unidade organizacional para alocação de despesas] | Financeiro, RH |
| [Ex: SKU] | [Stock Keeping Unit — código único de produto] | Estoque |

---

## 7. Premissas e Riscos Globais (Assumptions & Risks)

### Premissas (Assumptions)
- [Ex: O cliente tem infraestrutura de cloud disponível]
- [Ex: Os dados do sistema legado estão acessíveis via exportação SQL]
- [Ex: Haverá um ponto focal de negócio disponível para validações]

### Riscos Globais (Global Risks)
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| [Ex: Dados legados inconsistentes] | Alta | Alto | Fase de auditoria antes da migração |
| [Ex: Mudança de escopo durante dev] | Média | Alto | Vision Doc como contrato de escopo |

---

## 8. Histórico de Revisões (Revision History)

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| 0.1 | [YYYY-MM-DD] | [Nome] | Versão inicial |
| 0.2 | [YYYY-MM-DD] | [Nome] | [O que mudou] |

---

*Vision Doc gerado com o agente `criador-vision`. Para criar Domain Docs a partir deste documento, use o agente `criador-domain`.*