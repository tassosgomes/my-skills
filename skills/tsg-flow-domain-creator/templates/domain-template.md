---
tsg_artifact: domain
product: [nome-do-produto]
version: 1.0
status: draft
updated: [YYYY-MM-DD]
sources: vision.md@[versão], context/domain-map.md@[versão], backlog/capabilities.md@[versão]
---

# Domain Document — [Nome do Domínio]

> Detalha o bounded context de **um** domínio do Domain Map. Não decide prioridade, ordem nem
> escopo de entrega — isso é do backlog de capacidades e do PRD. Forneça este arquivo junto com o
> `vision.md` ao iniciar um PRD de capacidade que toque este domínio.

**Domínio:** [Nome, exatamente como no Domain Map]
**Capacidades atendidas:** [CAP-XXX, CAP-YYY — só os IDs; prioridade e fase vivem no backlog]
**Restrições arquiteturais pertinentes:** [referência ao baseline por ID (BA/G), sem detalhar implementação]

---

## 1. Propósito do Domínio (Domain Purpose)

### Responsabilidade Principal
[Uma frase clara e definitiva sobre o que este domínio faz. Exemplo: "Gerenciar todo o ciclo financeiro da empresa, incluindo contas a pagar, contas a receber e fluxo de caixa."]

### Problema que Resolve
[Qual dor de negócio específica este domínio endereça? Seja concreto.]

### Fora do Escopo deste Domínio (Out of Scope)
[O que parece pertencer a este domínio mas está explicitamente excluído — e onde vai em vez disso.
Herde do Domain Map: o campo "O que não faz" já traz a maior parte disto.]
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

## 4. Capacidades Atendidas (Capabilities Served)

> Quais capacidades do backlog este domínio serve. **Só referência.** Prioridade, fase, dependência
> entre capacidades e ordem de implementação vivem em `backlog/capabilities.md`, que é o único
> documento que enxerga através dos domínios. Não reproduza nada disso aqui: uma ordem proposta por
> um domínio isolado contradiz a ordem do backlog na primeira dependência cruzada.

| Capacidade | O que este domínio entrega a ela |
|---|---|
| `CAP-XXX` | [A parte do ciclo de valor que é responsabilidade deste domínio] |
| `CAP-YYY` | [Idem] |

---

## 5. Juntas com Outros Domínios (Domain Joints)

> **É o que faz as fatias verticais encaixarem.** Herde da tabela de interações do Domain Map —
> não invente junta aqui. Quando uma capacidade atravessa dois domínios, é esta seção que diz onde
> um termina e o outro começa, e quem é dono do dado.

### Depende de (Upstream)
| Domínio | O que consome | Tipo | Dono do dado | Criticidade |
|---|---|---|---|---|
| [Ex: RH] | [Dados de colaboradores para centro de custo] | Dados (leitura) | RH | Alta |
| [Ex: Compras] | [Ordens de compra aprovadas] | Evento | Compras | Média |

### Fornece para (Downstream)
| Domínio | O que fornece | Tipo | Dono do dado | Criticidade |
|---|---|---|---|---|
| [Ex: Faturamento] | [Saldo disponível para crédito] | Dados (leitura) | Este domínio | Alta |
| [Ex: Relatórios] | [Extratos e DRE consolidados] | Dados (leitura) | Este domínio | Média |

### Integrações Externas (External Integrations)
| Sistema Externo | Finalidade | Direção |
|---|---|---|
| [Ex: Banco Itaú — API OFX] | [Importação de extratos] | Entrada |
| [Ex: SEFAZ] | [Consulta de NF-e] | Entrada/Saída |

---

## 6. Regras de Negócio (Business Rules)

> **A razão de existir deste documento.** É o único conteúdo aqui que não vem do Domain Map nem vai
> para o contrato: regra reaproveitada entre os PRDs deste domínio. Referenciadas nos PRDs como
> critério de aceitação.

| ID | Regra | Origem |
|---|---|---|
| RN-01 | [Ex: Pagamentos acima de R$ 10.000 exigem aprovação de dois gestores] | Política interna |
| RN-02 | [Ex: Competência fecha todo dia 25 do mês vigente] | Contabilidade |
| RN-03 | [Ex: Estorno só é permitido dentro do mesmo mês de competência] | Política interna |

---

## 7. Eventos do Domínio (Domain Events)

> Fatos relevantes de negócio que este domínio produz ou consome. O contrato real do evento
> materializa no pacote de contratos e na TechSpec; aqui fica o fato de negócio.

### Produz (Publishes)
- `pagamento.realizado` — quando um pagamento é processado
- `competencia.fechada` — quando o período contábil é encerrado
- `conta.vencida` — quando uma conta a pagar passa do vencimento

### Consome (Subscribes)
- `ordem-compra.aprovada` (de: Compras) — gera conta a pagar automaticamente
- `colaborador.admitido` (de: RH) — cria vínculo com centro de custo

---

## 8. Riscos de Fronteira (Boundary Risks)

> Risco da **natureza deste domínio** — o que tende a vazar, a ser confundido com o vizinho ou a
> mudar por força externa. Risco de entrega (prazo, dependência contratual, sequenciamento) é do
> backlog e do PRD, não daqui.

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| [Ex: comportamento ditado por restrição externa (CDN, provedor), tende a mudar] | Alta | Médio | Isolar a estratégia atrás de uma fronteira própria |
| [Ex: confundido com o domínio vizinho por compartilhar vocabulário] | Média | Alto | Fora do Escopo explícito + junta declarada em §5 |

---

## 9. Questões em Aberto (Open Questions)

- [ ] [Ex: O sistema precisa suportar múltiplas moedas na v1?]
- [ ] [Ex: A aprovação de pagamentos será por alçada de valor ou por centro de custo?]

---

*Domain Doc gerado com a skill `tsg-flow-domain-creator`. Para criar o PRD de uma capacidade que
toca este domínio, use `tsg-flow-prd-creator` fornecendo o `vision.md`, este arquivo, os demais
domain docs que a capacidade atravessa e o ID da capacidade.*
