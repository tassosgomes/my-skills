# Domain Document — [Nome do Domínio]

> **Nível 1 da hierarquia de documentação.** Este documento detalha o bounded context de um domínio específico do sistema. Sempre forneça o `vision.md` junto com este arquivo ao iniciar sessões de PRD ou Tech Spec dentro deste domínio.

**Domínio:** [Nome]
**Domain Map:** [caminho e domínio selecionado]
**Capacidades relacionadas:** [CAP-XXX e prioridades herdadas, quando houver backlog]
**Restrições arquiteturais pertinentes:** [referência ao baseline, sem detalhar implementação]
**Responsável:** [Nome ou "a definir"]
**Status:** `planned` · `in-progress` · `done`
**Fase do Roadmap:** Fase [N] — [Nome da Fase]
**Última revisão:** [YYYY-MM-DD]

---

## 1. Propósito do Domínio (Domain Purpose)

### Responsabilidade Principal
[Uma frase clara e definitiva sobre o que este domínio faz. Exemplo: "Gerenciar todo o ciclo financeiro da empresa, incluindo contas a pagar, contas a receber e fluxo de caixa."]

### Problema que Resolve
[Qual dor de negócio específica este domínio endereça? Seja concreto.]

### Fora do Escopo deste Domínio (Out of Scope)
[O que parece pertencer a este domínio mas está explicitamente excluído — e onde vai em vez disso.]
- [Ex: Emissão de NF-e → pertence ao domínio Faturamento]
- [Ex: Gestão de fornecedores → pertence ao domínio Compras]

---

## 2. Usuários do Domínio (Domain Users)

| Perfil (Role) | O que faz neste domínio | Frequência de uso |
|---|---|---|
| [Ex: Gestor Financeiro] | [Ex: Aprova pagamentos, visualiza DRE] | Diária |
| [Ex: Contador] | [Ex: Fecha competência, gera relatórios] | Mensal |
| [Ex: Operador] | [Ex: Lança contas a pagar/receber] | Diária |

---

## 3. Entidades Principais (Core Entities)

> Entidades são os objetos de negócio centrais deste domínio. Não é um schema de banco de dados — é o vocabulário do domínio.

| Entidade | Descrição | Atributos Principais | Relacionamentos |
|---|---|---|---|
| [Ex: Conta a Pagar] | [Obrigação financeira com fornecedor] | valor, vencimento, status, fornecedor | pertence a: Centro de Custo |
| [Ex: Lançamento] | [Registro de movimentação financeira] | data, valor, tipo, conta | origina: Extrato |
| [Ex: Centro de Custo] | [Unidade para alocação de despesas] | código, nome, responsável | agrupa: Lançamentos |

---

## 4. Features Previstas (Planned Features)

> Lista de features deste domínio. Cada feature marcada como `prd-ready` tem (ou terá) um PRD dedicado.

| # | Feature | Descrição | Prioridade | Status | PRD |
|---|---|---|---|---|---|
| F01 | [Ex: Cadastro de Contas a Pagar] | [Criação e gestão de obrigações financeiras] | Must Have | `planned` | — |
| F02 | [Ex: Aprovação de Pagamentos] | [Fluxo de aprovação multinível para pagamentos] | Must Have | `planned` | — |
| F03 | [Ex: Conciliação Bancária] | [Reconciliação automática de extratos] | Should Have | `planned` | — |
| F04 | [Ex: DRE Gerencial] | [Relatório de resultado por período e centro de custo] | Could Have | `planned` | — |

**Prioridades (MoSCoW):** `Must Have` · `Should Have` · `Could Have` · `Won't Have`
**Status possíveis:** `planned` · `prd-ready` · `in-progress` · `done` · `out-of-scope`

---

## 5. Dependências (Domain Dependencies)

### Depende de (Upstream)
| Domínio | O que consome | Tipo | Criticidade |
|---|---|---|---|
| [Ex: RH] | [Dados de colaboradores para centro de custo] | Dados (leitura) | Alta |
| [Ex: Compras] | [Ordens de compra aprovadas] | Evento | Média |

### Fornece para (Downstream)
| Domínio | O que fornece | Tipo | Criticidade |
|---|---|---|---|
| [Ex: Faturamento] | [Saldo disponível para crédito] | Dados (leitura) | Alta |
| [Ex: Relatórios] | [Extratos e DRE consolidados] | Dados (leitura) | Média |

### Integrações Externas (External Integrations)
| Sistema Externo | Finalidade | Direção | Status |
|---|---|---|---|
| [Ex: Banco Itaú — API OFX] | [Importação de extratos] | Entrada | `planned` |
| [Ex: SEFAZ] | [Consulta de NF-e] | Entrada/Saída | `planned` |

---

## 6. Regras de Negócio (Business Rules)

> Regras que governam o comportamento deste domínio. Serão referenciadas nos PRDs como critérios de aceitação.

| ID | Regra | Origem |
|---|---|---|
| RN-01 | [Ex: Pagamentos acima de R$ 10.000 exigem aprovação de dois gestores] | Política interna |
| RN-02 | [Ex: Competência fecha todo dia 25 do mês vigente] | Contabilidade |
| RN-03 | [Ex: Estorno só é permitido dentro do mesmo mês de competência] | Política interna |

---

## 7. Eventos do Domínio (Domain Events)

> Fatos relevantes de negócio que este domínio produz ou consome. Útil para identificar integrações assíncronas.

### Produz (Publishes)
- `pagamento.realizado` — quando um pagamento é processado
- `competencia.fechada` — quando o período contábil é encerrado
- `conta.vencida` — quando uma conta a pagar passa do vencimento

### Consome (Subscribes)
- `ordem-compra.aprovada` (de: Compras) — gera conta a pagar automaticamente
- `colaborador.admitido` (de: RH) — cria vínculo com centro de custo

---

## 8. Estratégia de Desenvolvimento (Development Strategy)

### Ordem de Implementação Sugerida
1. [F01] — Base do domínio, sem dependências
2. [F02] — Depende de F01
3. [F03] — Depende de integração bancária externa
4. [F04] — Depende de F01, F02, F03

### Riscos do Domínio
| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| [Ex: API bancária com documentação incompleta] | Média | Alto | Spike técnico antes do PRD de conciliação |
| [Ex: Regras contábeis variáveis por cliente] | Alta | Médio | Parametrização desde o início |

---

## 9. Questões em Aberto (Open Questions)

- [ ] [Ex: O sistema precisa suportar múltiplas moedas na v1?]
- [ ] [Ex: A aprovação de pagamentos será por alçada de valor ou por centro de custo?]
- [ ] [Ex: Qual banco será integrado primeiro?]

---

*Domain Doc gerado com o agente `criador-domain`. Para criar PRDs das features deste domínio, use o agente `criador-prd` fornecendo este arquivo e o `vision.md` como contexto.*
