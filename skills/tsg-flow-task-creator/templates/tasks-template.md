# Plano de Implementação — [Funcionalidade]

> **TechSpec de origem:** [link para `techspec.md`, com revisão aprovada]
> **Escopo:** [Backend | Frontend | Full-stack]
> **ADRs pertinentes:** [links relativos para `docs/adr/adr-NNN.md`; não copiar o catálogo]
> **Status do plano:** [Em revisão | Confirmado para implementação]

## Visão Geral

Objetivo do conjunto de tasks e o comportamento que a feature entrega ao final.

## Fases

Fases agrupam uma sequência de comportamento e feedback — não uma camada arquitetural.

### Fase 1 — [nome]

[Qual comportamento é demonstrado ao final da fase e qual checkpoint prova isso.]

### Fase 2 — [nome]

[Idem.]

## Mapa de Entrega

Uma linha por task. A fatia vem da TechSpec; numa feature full-stack ela cruza UI e API.

| Fatia | Task | Comportamento observável | Gate | Bloqueado por |
|---|---|---|---|---|
| V-01 | 1.0 | [resultado ponta a ponta] | `[comando]` | [Nenhum/IDs] |

### Habilitadores

| Enabler | Task | Por que não cabe numa fatia | Desbloqueia |
|---|---|---|---|
| EN-01 | [X.0] | [justificativa concreta] | [V-XX] |

## Tasks

- [ ] 1.0 [Título]
- [ ] 2.0 [Título]

## Cobertura

Toda linha do PRD precisa aparecer aqui. Lacuna é bloqueio de handoff, não observação.

| Requisito | Task(s) |
|---|---|
| RF-01 | 1.0, 2.0 |
| RN-04 | 2.0 |
| US-01 | 1.0 |

> Verificado por `python3 scripts/validate_plan.py tasks/prd-<slug>/` antes do handoff.
