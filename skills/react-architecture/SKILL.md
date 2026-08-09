---
name: react-architecture
description: "Use para mudanças estruturais em React + Vite + TypeScript: criar projeto ou feature, escolher organização de pastas, separar UI de domínio, configurar aliases, revisar imports ou definir APIs públicas. Não use para revisão geral de estilo, testes, telemetria ou configuração de runtime/container isolada."
metadata:
  group: react
---

# Arquitetura React / Vite

Use esta skill como primária quando o diff muda a forma como o frontend é organizado. O core
decide o nível da estrutura e preserva fronteiras; receitas completas ficam em
`references/full-guide.md`.

## Escolha da estrutura

- **Base:** POC ou app pequeno, com poucas telas e componentes; `components/`, `hooks/`, `utils/`
  e `services/` podem ficar no nível de `src/`.
- **Intermediária:** múltiplas páginas/fluxos; agrupe `features/*` e mantenha UI genérica em
  `components/ui` ou `shared/components`.
- **Feature-based:** domínios claros, equipe maior ou muitas features; use `app/`, `shared/` e
  `features/*` como mapa principal do negócio.

## Regras não negociáveis

- Coloque lógica de domínio em `features/*`; `shared/` e `components/ui` não conhecem um domínio
  específico.
- Cada feature deve ter `index.ts` como public API; consumidores importam pela API pública, não
  por arquivos internos.
- Use aliases coerentes no Vite e no `tsconfig` (`@/`, `@features/`, `@shared/` quando necessários)
  e evite imports relativos profundos (`../../../`).
- Pastas usam `kebab-case`; componentes usam `PascalCase.tsx`; hooks e utils usam `camelCase.ts`.
- Componentes devem concentrar apresentação; hooks, services e casos de uso carregam a lógica
  própria da feature.
- Não crie uma camada global para esconder lógica que pertence a uma feature.

## Limites com outras skills

- Use `react-code-quality` para revisar o código do diff.
- Use `react-testing` para testes e regressões.
- Use `react-runtime-config` para configuração dinâmica e container.
- Use `react-subpath-deploy` quando o app for servido fora da raiz.

## Referência sob demanda

Leia [o guia completo de arquitetura](references/full-guide.md) apenas para a estrutura escolhida,
aliases ou convenções de public API.

## Checklist do diff

- [ ] O nível base/intermediário/feature-based foi escolhido por necessidade real.
- [ ] UI reutilizável e lógica de domínio estão separadas.
- [ ] Features expõem apenas o `index.ts` público.
- [ ] Aliases existem no Vite e no TypeScript.
- [ ] Não há imports relativos profundos ou dependências circulares óbvias.
- [ ] Nomes de pastas e arquivos seguem o padrão.
