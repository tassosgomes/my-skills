---
tsg_artifact: vision
product: [nome-do-produto]
version: 0.1
status: draft
updated: [YYYY-MM-DD]
sources:
---

# Vision Document — [Nome do Sistema]

> **Raiz do fluxo.** Âncora de contexto para Domain Map, baseline, backlog, domain docs e PRDs. Não
> nomeia domínios, serviços nem tecnologia além de restrições já existentes.

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

## 2. Capacidades de Negócio

> O que o sistema precisa permitir, em linguagem de negócio. A numeração `CNN` é estável: o backlog
> rastreia cada `CAP-XXX` até ela. Não agrupe por domínio — a decomposição é do Domain Map.

| ID | Capacidade | Público | Valor | Fase pretendida |
|---|---|---|---|---|
| C01 | [Ex: Pagar fornecedores no vencimento] | [Gestor Financeiro] | [Evitar multa e juros] | MVP |
| C02 | [Ex: Conciliar extrato bancário] | [Operador] | [Fechamento sem planilha] | Fase 2 |

---

## 3. Primeiro Recorte de Entrega

> O menor conjunto de capacidades que entrega valor verificável. A ordem real de implementação é do
> backlog, que enxerga dependência entre capacidades; aqui fica a ambição de produto.

**Capacidades incluídas:** C01, C03
**Critério de sucesso:** [Como saber que o recorte valeu]
**Fica para depois:** [O que foi deliberadamente adiado e por quê]

---

## 4. Restrições Globais (Global Constraints)

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

## 5. Glossário de Negócio (Business Glossary)

> Termos do domínio de negócio com definição acordada. Essencial para manter consistência entre domínios e sessões com a IA.

| Termo | Definição | Domínio(s) |
|---|---|---|
| [Ex: NF-e] | [Nota Fiscal Eletrônica — documento fiscal digital] | Financeiro, Faturamento |
| [Ex: Centro de Custo] | [Unidade organizacional para alocação de despesas] | Financeiro, RH |
| [Ex: SKU] | [Stock Keeping Unit — código único de produto] | Estoque |

---

## 6. Premissas e Riscos Globais (Assumptions & Risks)

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

## 7. Histórico de Revisões (Revision History)

| Versão | Data | Autor | Alterações |
|---|---|---|---|
| 0.1 | [YYYY-MM-DD] | [Nome] | Versão inicial |
| 0.2 | [YYYY-MM-DD] | [Nome] | [O que mudou] |

---

*Gerado com `tsg-flow-product` (etapa Visão). Próxima etapa: Domain Map.*
