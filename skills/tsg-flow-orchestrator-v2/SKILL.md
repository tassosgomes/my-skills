---
name: tsg-flow-orchestrator-v2
description: "[Experimental, para comparação com tsg-flow-orchestrator] Executa um PRD TSG Flow com tasks prontas: coordena workers de implementação, revisão e integração, com gate, checkpoint por task e validação full antes da entrega. Os quatro papéis vivem nesta skill. Use com --prd-dir=<work/...>; não use para correção pequena sem planejamento TSG."
metadata:
  group: tsg-flow-experimental
---

# Orchestrator (v2)

Esta skill tem quatro papéis. Cada chamada executa **exatamente um**, e lê somente o arquivo dele.

| Chamada | Papel | Leia |
|---|---|---|
| sem `--role` | coordinator — coordena o PRD | [roles/coordinator.md](roles/coordinator.md) |
| `--role=implementer` | implementa ou corrige uma task | [roles/implementer.md](roles/implementer.md) |
| `--role=validator` | revisa uma task ou o PRD inteiro | [roles/validator.md](roles/validator.md) |
| `--role=integrator` | Git, checkpoint e entrega | [roles/integrator.md](roles/integrator.md) |

Regras do roteamento:

- Leia o arquivo do seu papel antes de qualquer outra ação e siga só ele.
- **Não leia os arquivos dos outros papéis.** O worker que conhece as instruções do coordenador
  passa a coordenar; o validator que conhece as do implementer passa a corrigir. A revisão
  independente depende desse isolamento.
- `--role` com valor fora da tabela: pare e devolva erro de uso. Não escolha um papel por conta
  própria.
- Quando o pedido trouxer `--run-id` e `--result-file`, você é um worker: nunca assuma o papel de
  coordinator, mesmo sem `--role`; devolva erro de uso.
