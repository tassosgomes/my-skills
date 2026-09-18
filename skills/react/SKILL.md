---
name: react
description: "Use em qualquer trabalho React + Vite + TypeScript: criar projeto ou feature, estrutura de pastas, camada de API, estado, formulários, tratamento de erro, qualidade, testes, runtime config, container, deploy em subpath e telemetria. Este é o padrão do projeto — aplique-o em vez de decidir caso a caso."
metadata:
  group: react
---

# Padrão React

Este documento é a decisão, não o tutorial. Você sabe escrever o código; o que está aqui é **qual**
das alternativas equivalentes este projeto usa e **onde** cada coisa mora. Quando o padrão e o
hábito divergirem, o padrão vence. Divergir dele exige dizer por quê no PR.

Arquitetura derivada do [bulletproof-react](https://github.com/alan2207/bulletproof-react), com dois
desvios deliberados marcados como **DESVIO** ao longo do texto.

## Stack fechada

| Papel | Escolha | Não use |
|---|---|---|
| Build | Vite 8 + `@vitejs/plugin-react-swc` | CRA, Webpack manual |
| Linguagem | TypeScript 7, `strict: true` | JS, `strict: false` |
| Router | `react-router` 8 (pacote sem o `-dom`) | `react-router-dom` |
| Server cache | `@tanstack/react-query` 5 | fetch solto no `useEffect`, dado de API em store global |
| Estado de app | `zustand` 5 | Redux, Context como store global |
| HTTP | `axios` 1, instância única | `fetch` espalhado, uma instância por feature |
| Formulário | `react-hook-form` 7 + `zod` 4 | form controlado na mão, validação ad hoc |
| Validação/schema | `zod` 4 | yup, validação manual |
| Teste | `vitest` 5 + Testing Library + `msw` 2 | Jest, mock de `fetch`/axios |
| E2E | `@playwright/test` | Cypress |
| Lint | ESLint 10 flat config (`eslint.config.js`) | `.eslintrc.*` |

As versões são piso, não teto: suba de minor/patch à vontade, trate major como decisão.

## Estrutura

Um único alvo. Não existe "estrutura para projeto pequeno" — uma POC que nasce assim cresce sem
reboot, e o custo de já começar aqui é uma pasta vazia a mais.

```text
src/
  app/          # composição: router, providers, rotas. Só aqui pode importar de features/
  assets/
  components/   # UI compartilhada, sem conhecimento de domínio
  config/       # env.ts (tipado) e paths.ts (rotas)
  features/     # o mapa de negócio; cada pasta é um domínio
  hooks/        # hooks compartilhados
  lib/          # bibliotecas pré-configuradas (api-client, react-query, ...)
  stores/       # stores globais
  testing/      # utilitários de teste e mocks MSW
  types/
  utils/
```

Uma feature usa só as subpastas de que precisa, sem placeholder vazio:

```text
src/features/<dominio>/
  api/  assets/  components/  hooks/  stores/  types/  utils/
```

- Lógica de domínio mora em `features/*`. Se algo em `components/`, `hooks/` ou `utils/` cita um
  domínio pelo nome, está no lugar errado.
- Não existe `shared/`. O nível raiz de `src/` já é o compartilhado.
- Não existe `features/*/pages/`. Rota é composição e vive em `app/routes/`.

## Fronteiras

Três invariantes. Nenhuma depende de você lembrar — `assets/eslint.config.js` falha o build.

1. **Fluxo unidirecional:** `compartilhado → features → app`. `app/` importa de tudo; `features/`
   importa só do compartilhado; o compartilhado não importa de ninguém.
2. **Sem import entre features.** `features/a` não enxerga `features/b`. Composição de dois
   domínios acontece em `app/`.
3. **Sem barrel.** Feature não tem `index.ts` de API pública; importe o arquivo direto
   (`@/features/users/api/get-users`). **DESVIO do hábito comum:** barrel quebra tree-shaking no
   Vite e o `index.ts` só simulava fronteira — quem faz a fronteira é o lint.

O arquivo de zonas do bulletproof-react lista uma entrada por feature, escrita à mão. O nosso lê
`src/features/` e gera as zonas, então feature nova já nasce isolada.

## Imports e nomes

- **Um alias só:** `@/*` → `./src/*`. Nada de `@features`, `@shared`, `@components`.
- **`baseUrl` não existe mais** — foi removido no TypeScript 7. Declare só `paths`, com substituição
  relativa: `"paths": { "@/*": ["./src/*"] }`.
- **`kebab-case` em tudo**: arquivos e pastas, inclusive componentes (`user-profile.tsx` exporta
  `UserProfile`). Garantido por `eslint-plugin-check-file`.
- Import relativo só dentro da mesma pasta; para qualquer outro lugar, `@/`.

## Camada de API

Cliente único em `lib/api-client.ts`: uma instância axios, interceptor de request para auth e
interceptor de response que desembrulha `response.data`, notifica o erro e trata 401.

Cada arquivo em `features/<dominio>/api/` cobre **um** endpoint e exporta três coisas nesta ordem:

1. o schema Zod do input (quando há input) e os tipos inferidos dele;
2. a função que chama o endpoint, tipada no retorno;
3. o hook React Query que consome a função.

Query expõe também suas `queryOptions`, para que outra chamada possa reusar a `queryKey`:

```ts
// features/discussions/api/get-discussions.ts
export const getDiscussions = (page = 1): Promise<{ data: Discussion[]; meta: Meta }> =>
  api.get('/discussions', { params: { page } });

export const getDiscussionsQueryOptions = ({ page }: { page?: number } = {}) =>
  queryOptions({
    queryKey: page ? ['discussions', { page }] : ['discussions'],
    queryFn: () => getDiscussions(page),
  });

export const useDiscussions = ({ page, queryConfig }: UseDiscussionsOptions) =>
  useQuery({ ...getDiscussionsQueryOptions({ page }), ...queryConfig });
```

Mutation invalida pela `queryKey` das options, nunca por string literal repetida, e recebe
`mutationConfig` para que o chamador acrescente seu `onSuccess` sem perder o do hook.

Regras: nada de chamada declarada no meio do componente; nada de `useEffect` buscando dado.

## Estado

Escolha pela natureza do dado, não pela conveniência. Comece local e suba só quando outro lugar
precisar.

| Natureza | Onde |
|---|---|
| Estado de um componente | `useState`; `useReducer` quando uma ação muda vários campos |
| Global da aplicação (tema, modal, notificação) | store `zustand` em `stores/` ou na feature |
| Dado que veio do servidor | React Query, sempre |
| Estado de formulário | `react-hook-form` |
| Estado que o usuário deve poder colar num link | URL, via router |

**Dado de servidor nunca entra em store global.** Cache, revalidação e estados de carregamento são
do React Query; duplicar isso numa store recria bugs de sincronização já resolvidos.

## Formulários

`react-hook-form` com resolver Zod. O schema de input do endpoint é o mesmo schema do formulário —
não escreva duas validações para o mesmo payload. Os campos são componentes de `components/ui/form`
que encapsulam a biblioteca; a feature não importa `react-hook-form` direto nos seus componentes.

## Rotas

`config/paths.ts` centraliza toda rota, cada uma com `path` e `getHref()` tipado. Ninguém monta URL
concatenando string. Isso é o que permite o app rodar em subpath sem caçar link quebrado.

## Erros

- **Erro de API:** tratado no interceptor do `api-client` — notifica, e em 401 redireciona para
  login. Componente não repete esse tratamento.
- **Erro de render:** error boundary **por rota ou por área**, não um único global. Um gráfico que
  quebra não derruba a página inteira.
- **Erro em produção:** reportado ao rastreador com source maps publicados. Erro engolido em
  silêncio é bug.

## Qualidade

O que o lint e o compilador não pegam sozinhos:

- Componente é função. Sem classe.
- `any` é proibido; use `unknown` e estreite. `as` só com comentário dizendo por que é seguro.
- Props tipadas por `type`, nomeada `<Componente>Props`.
- Componente concentra apresentação; decisão e efeito saem para hook, `api/` ou util.
- Código, nomes e comentários em inglês.
- Não há limite de linhas por componente. Extraia quando houver uma responsabilidade separável, não
  quando cruzar um número.

## Testes

Integração é o centro de gravidade. Um teste que renderiza a rota com MSW respondendo vale mais que
dez testes de componente isolado.

- **Unitário** para util, hook compartilhado e componente de `components/ui` com lógica própria.
- **Integração** para o fluxo da feature, renderizando a partir da rota em `app/routes/`.
- **E2E (Playwright)** para os caminhos críticos de negócio, rodando em headless no CI.

Regras:

- **MSW é a única fronteira de mock.** Não faça mock de `fetch`, de axios ou de módulo de `api/`.
  Handlers e modelos de dados vivem em `testing/`.
- Consulte por papel e por texto acessível (`getByRole`, `getByLabelText`). `getByTestId` é último
  recurso e pede justificativa.
- Interação com `userEvent`, não `fireEvent`.
- Teste o que o usuário observa. Se o teste quebra num refactor que não mudou a tela, ele testava
  implementação.
- O nome do teste diz cenário e resultado esperado.

## Referências sob demanda

Leia só quando a tarefa for essa:

- [`references/runtime-and-container.md`](references/runtime-and-container.md) — config que muda por
  ambiente sem rebuild (`window.RUNTIME_ENV`), Dockerfile, Nginx e deploy em subpath.
- [`references/telemetry.md`](references/telemetry.md) — OpenTelemetry Web, propagação W3C para a
  API e atributos proibidos.
- `assets/` — `eslint.config.js`, `tsconfig.json`, `Dockerfile`, `nginx.conf.template`,
  `docker/40-runtime-env.sh` e `ingress.yaml` prontos para copiar.
