---
name: react-testing
description: "Use quando a tarefa cria, revisa, diagnostica ou configura testes React + Vite + TypeScript: Vitest, React Testing Library, jest-dom, userEvent, renderHook, MSW, formulários, E2E ou CI. Não acione apenas porque uma implementação precisa de validação manual."
metadata:
  group: react
---

# Estratégia de Testes React

Acione esta skill pelo trabalho de teste. O nível do teste deve acompanhar a camada e o risco;
receitas completas ficam em `references/full-guide.md`.

## Padrões obrigatórios

- Unitários: Vitest + React Testing Library + jest-dom, padrão AAA e nomes que expressem cenário e
  comportamento esperado.
- Interações: `userEvent`; queries semânticas (`getByRole`, `getByLabelText`) antes de `getByTestId`.
- Teste comportamento observável, não detalhes internos ou implementação de Hooks.
- Hooks devem ser testados com `renderHook`/`act` quando o comportamento não for coberto pelo componente.
- APIs usam MSW com handlers isolados e reset por teste; não bata em endpoints reais.
- Formulários cobrem sucesso e validação/erro; fluxos críticos podem exigir Playwright.
- Integração e CI executam `lint`, `type-check`, testes, cobertura conforme baseline e `build`.
- Cobertura padrão é pelo menos 70% quando o projeto não define limite diferente; cenários críticos
  importam mais que cobertura artificial.

## Escolha da camada

| Mudança | Mínimo |
|---|---|
| componente, hook ou função pura | unitário |
| componente com API/contexto | integração com MSW |
| formulário ou fluxo crítico | sucesso + erro; E2E quando necessário |
| jornada completa do usuário | Playwright além dos testes inferiores |

## Limites

- `react-code-quality` revisa o código de produção.
- `react-production-readiness` verifica o gate completo de CI/release.

## Referência sob demanda

Leia [o guia completo de testes](references/full-guide.md) somente para setup, MSW, formulários,
coverage ou pipeline que o diff altera.

## Checklist do diff

- [ ] Existe teste regressivo para o comportamento novo ou corrigido.
- [ ] A camada de teste corresponde ao risco.
- [ ] AAA, queries semânticas e `userEvent` são usados quando aplicáveis.
- [ ] APIs não fazem chamadas reais e handlers são isolados.
- [ ] Estados de loading, sucesso, erro e vazio relevantes estão cobertos.
- [ ] O comando focado e o gate do projeto foram executados.
