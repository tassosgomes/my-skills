# Etapa 4 — Backlog de capacidades

Transforma visão, Domain Map e baseline num backlog priorizado de capacidades de negócio. Cada
capacidade completa um ciclo de valor e pode originar um PRD independente.

## Regras

- Capacidade representa valor de negócio. Não crie tarefa técnica. Evite capacidades grandes ou
  pequenas demais.
- **ID estável** por capacidade (`CAP-001`, `CAP-002`, ...). Preserve os IDs ao atualizar.
- **Rastrear a origem na visão.** Cada `CAP-XXX` declara de qual `CNN` da visão deriva. Sem esse
  elo, visão e backlog falam da mesma capacidade em dois idiomas que nada liga, e uma divergência de
  fase entre os dois fica invisível até alguém implementar. Muitos para muitos é normal: declare
  todas as origens.
- **Reconciliar nos dois sentidos.** Divergir da visão quanto à fase é legítimo — a visão fatia por
  ambição, o backlog por dependência real. Mas a divergência tem duas consequências: registre o
  risco com dono para a decisão de negócio **e** declare o impacto no agrupamento de serviços do
  baseline. Sem isso, dois documentos aprovados ficam em contradição silenciosa.

## Formato de cada capacidade

O gate lê este formato; mantenha os rótulos:

```markdown
### Domínio: <Nome do domínio no Domain Map>

#### CAP-001 — <Nome da capacidade>

- **Objetivo:** o que ela permite realizar.
- **Valor de negócio:** por que importa.
- **Fluxo:** resumo de alto nível.
- **Dependências:** CAP-XXX e domínios necessários.
- **Origem na visão:** C01, C04.
- **Prioridade:** Alta | Média | Baixa
- **Fase:** MVP | Fase 2 | Fase 3 — quando divergir da fase da origem na visão, diga qual era e por
  que muda. Divergência sem o par "origem + motivo" é contradição silenciosa.
```

## Sequenciamento

1. Dependências entre capacidades.
2. MVP coerente e ordem de implementação.
3. Riscos estratégicos.
4. Cada capacidade antecipada ou adiada em relação à visão, conferida contra o baseline: a unidade
   de deploy que a serve foi agrupada de forma compatível com a nova fase? Se não, registre a
   consequência junto do risco. É a única etapa que enxerga fase e dependência ao mesmo tempo — o
   baseline roda antes e o PRD depois.

## Estrutura do documento

```markdown
# Backlog de Capacidades
## Estratégia de Sequenciamento
## Definição do MVP
## Capacidades por Domínio
## Dependências entre Capacidades
## Riscos Estratégicos
```

## Estado

Registre cada capacidade em `capabilities` do `flow-state.json` com `stage: backlog` e `mvp_order`
para as do MVP. Decisão em aberto com dono vai para `open_decisions`, com `blocks` apontando as
capacidades que ela trava — é assim que a `tsg-flow-next` distingue bloqueio de decisão de falta de
documento.
