---
name: tsg-flow-architecture-baseline
description: >
  Define o baseline arquitetural de um sistema a partir da visão do produto e do mapa de domínios,
  estabelecendo estilo arquitetural, comunicação, estratégia de dados, segurança, observabilidade,
  escalabilidade e guardrails. Use após o Domain Map e antes de definir features, PRDs ou implementação
  quando for necessário estabelecer regras estruturais para a evolução do sistema.
metadata:
  group: tsg-flow
---

# Baseline Arquitetural

Atuar como arquiteto de software responsável por definir o baseline arquitetural de um sistema.

Definir os princípios arquiteturais fundamentais que todas as futuras funcionalidades deverão seguir.

Não projetar funcionalidades ou implementações específicas.

Definir as regras estruturais do sistema.

--------------------------------
ENTRADAS
--------------------------------

- `vision.md`
- `context/domain-map.md`
- ADRs relevantes em `docs/adr/` e evidências de stack/código existentes, quando disponíveis.

--------------------------------
REGRAS
--------------------------------

- Concentrar-se em princípios arquiteturais, não na implementação de funcionalidades.
- Definir restrições que evitem a deriva arquitetural.
- Evitar otimização prematura.
- Priorizar simplicidade e facilidade de manutenção.
- Garantir que o baseline permita a evolução futura.
- Herdar decisões aceitas; skills disponíveis orientam padrões, não identificam a stack.
- Perguntar somente por decisões materiais ainda abertas. Reutilizar aprovações já registradas.
- Registrar decisões novas com racional no baseline; quando exigirem ADR, usar `docs/adr/`
  com numeração global e contexto autocontido. Não criar ADR apenas por executar esta etapa.
- Consultar `docs/adr/index.md`, reservar ID global e salvar `adr-NNN.md` como Proposed.
  Após aprovação da decisão, atualizar ADR e índice para Accepted; manter Withdrawn se abandonada.
  Para substituir uma Accepted, criar nova ADR e marcar a anterior Superseded após aprovação.
  O contexto deve explicar a decisão mesmo sem PRD; não manter o único racional na conversa.

--------------------------------
FASE 1 — ANÁLISE DO SISTEMA
--------------------------------

Analisar:

- visão do produto;
- fronteiras dos domínios;
- escala esperada;
- restrições organizacionais;
- necessidades de consistência dos dados;
- expectativas de integração.

--------------------------------
FASE 2 — DECISÕES ARQUITETURAIS
--------------------------------

Definir o baseline incluindo:

1. Estilo de arquitetura do sistema
   (monólito, monólito modular, microsserviços etc.)

2. Padrões de comunicação
   (API, eventos, assíncrona, síncrona)

3. Estratégia de dados
   (propriedade dos bancos de dados, regras de compartilhamento)

4. Estratégia de autenticação e autorização

5. Observabilidade
   (logs, métricas, rastreamento distribuído)

6. Padrões de tratamento de erros

7. Estratégia de versionamento

8. Princípios de segurança

9. Premissas de escalabilidade

--------------------------------
FASE 3 — GUARDRAILS ARQUITETURAIS
--------------------------------

Definir guardrails arquiteturais, como:

- regras de propriedade dos domínios;
- regras de propriedade dos dados;
- regras de integração;
- padrões de acoplamento permitidos;
- camadas anticorrupção.

--------------------------------
SAÍDA
--------------------------------

Gerar:

`context/architecture-baseline.md`

TechSpecs devem consumir este baseline. Backlog e PRDs herdam suas restrições aplicáveis.
Entregar resumo e link; revisar apenas quando as premissas estruturais mudarem.

Usar a seguinte estrutura:

# Baseline Arquitetural

## Estilo Arquitetural

## Princípios de Interação entre Domínios

## Regras de Propriedade dos Dados

## Padrões de Comunicação

## Princípios de Segurança

## Padrões de Observabilidade

## Premissas de Escalabilidade

## Guardrails Arquiteturais
