# Etapa 3 — Baseline arquitetural

Define as regras estruturais que toda funcionalidade futura segue. Não projeta funcionalidades nem
implementação. Entradas adicionais: ADRs em `docs/adr/` e evidências de stack e código existentes.

## Regras

- **Não sequenciar.** O baseline decide o *agrupamento* — quais domínios moram em qual unidade de
  deploy e por quê — e o *critério de extração* de um módulo para serviço próprio. Não decide em que
  fase cada unidade aparece: fase é consequência do sequenciamento das capacidades, e o baseline
  roda antes do backlog, sem enxergar dependência entre capacidades. Um roadmap de serviços por fase
  escrito aqui contradiz o backlog na primeira dependência cruzada. Para indicar evolução, use
  "grupo inicial" e "extraído depois", com o gatilho de extração — nunca número de fase.
- **Herde decisões aceitas.** Skills de stack instaladas orientam padrões; não identificam a stack.
- **Decisão de fio por sistema mora aqui.** Formato observável na rede que varia por sistema — usar
  envelope de resposta ou não, por exemplo — é decidido em "Padrões de Comunicação" e flui para o
  contrato. O que vale para todo projeto está em
  `tsg-flow-contract-creator/references/http-conventions.md`; a skill de stack só implementa.

## Decisões

Defina: estilo arquitetural; padrões de comunicação; propriedade e compartilhamento de dados;
autenticação e autorização; observabilidade; tratamento de erros; versionamento; princípios de
segurança; premissas de escalabilidade.

Depois, os guardrails: propriedade dos domínios e dos dados, regras de integração, acoplamento
permitido e camadas anticorrupção.

## ADRs

Registre decisões novas com racional no próprio baseline. Quando uma exigir ADR:

1. Consulte `docs/adr/index.md`, reserve o próximo ID global e salve `docs/adr/adr-NNN.md` como
   Proposed. Não crie ADR só por executar esta etapa.
2. Após aprovação, atualize ADR e índice para Accepted; se abandonada, Withdrawn.
3. Para substituir uma Accepted, crie nova ADR e marque a anterior Superseded após aprovação.
4. O contexto da ADR explica a decisão sem depender de PRD nem da conversa.

## Estrutura do documento

```markdown
# Baseline Arquitetural
## Estilo Arquitetural
## Princípios de Interação entre Domínios
## Regras de Propriedade dos Dados
## Padrões de Comunicação
## Princípios de Segurança
## Padrões de Observabilidade
## Premissas de Escalabilidade
## Guardrails Arquiteturais
```

Revise o baseline somente quando premissas estruturais mudarem. TechSpecs o consomem; backlog e
PRDs herdam as restrições aplicáveis.
