---
name: react-code-quality
description: "Use ao revisar ou refatorar um diff React + Vite + TypeScript para naming, componentes, Hooks, TypeScript, imports, renderização e tratamento de erros. Não acione apenas porque uma tarefa gera código; aplique quando qualidade for objetivo explícito ou parte de um gate."
metadata:
  group: react
---

# Qualidade de Código React

Aplique esta skill sobre o diff relevante. Ela não é um gate automático para toda implementação;
regras detalhadas e exemplos estão em `references/full-guide.md`.

## Hard rules

- Use TypeScript strict e nunca `any` em produção; prefira `unknown` com narrowing.
- Use componentes funcionais com Hooks, uma responsabilidade clara e props tipadas por `interface`
  ou `type`; mantenha componentes em torno de 200 linhas e abaixo de 300 quando possível.
- Código, nomes e comentários ficam em inglês, salvo termos de domínio documentados.
- Use `PascalCase` para componentes, `camelCase` para funções/variáveis/hooks, `kebab-case` para
  pastas e `PascalCase.tsx` para componentes.
- Faça cleanup de listeners, timers, subscriptions e requests em `useEffect` quando aplicável.
- Use `useCallback`/`useMemo` somente com benefício demonstrável; não por hábito.
- Organize imports por padrão -> externo -> interno e use aliases configurados; evite `../../../`.
- Não engula erros: trate estados de loading/error/empty e mostre mensagem amigável na UI.
- Evite props drilling além de dois níveis; avalie composição, Context ou estado da feature.
- Evite falsy traps como `{items.length && ...}` quando `0` puder ser renderizado.

## Limites

- `react-architecture` decide pastas, módulos e APIs públicas.
- `react-testing` define testes e cobertura.
- `react-observability` trata telemetria e sanitização operacional.

## Referência sob demanda

Leia [o guia completo de qualidade](references/full-guide.md) somente para o tópico do diff:
componentes, Hooks, TypeScript, imports, renderização ou erros.

## Checklist do diff

- [ ] strict está habilitado e não há `any` novo em produção.
- [ ] Componentes, props, Hooks e nomes seguem as convenções.
- [ ] Effects têm cleanup quando necessário; memoização tem motivo.
- [ ] Imports usam ordem e aliases adequados.
- [ ] Estados de loading/error/empty e erros de usuário estão tratados.
- [ ] O componente não excede sua responsabilidade ou tamanho justificável.
