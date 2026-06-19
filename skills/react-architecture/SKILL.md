---
name: react-architecture
description: "Padroes arquiteturais e estrutura de projeto React + Vite + TypeScript: organizacao de pastas (flat, intermediaria, feature-based), separacao de UI reutilizavel vs logica de dominio, path aliases com @/, convencoes de pastas (kebab-case) e arquivos (PascalCase.tsx), public API via index.ts, shared vs features, agrupamento por dominio. Usar quando: criar projeto React novo; criar feature nova; refatorar estrutura de pastas; revisar PR com mudancas de imports/pastas; decidir onde colocar codigo; organizar componentes/paginas/hooks; configurar aliases no Vite/tsconfig."
---

# React Architecture & Project Structure (Vite + TypeScript)

Documento normativo para geracao de codigo por LLMs.
Define os padroes obrigatorios de organizacao, estrutura de pastas e imports.
LLMs devem seguir estas regras estritamente.

---

# 1. Objetivos da Estrutura

- Facilitar encontrar "onde colocar o codigo".
- Evoluir de pequeno -> medio -> grande sem reboot total.
- Separar **UI reutilizavel** de **logica de dominio/feature**.
- Manter caminhos de import limpos (`@/features/users` etc.).

---

# 2. Estrutura Base (Projetos Pequenos)

> Usar para POCs, ate ~10-15 componentes.

```text
src/
  main.tsx
  App.tsx

  assets/
    images/
    icons/
    fonts/

  components/
    Button.tsx
    Card.tsx
    Modal.tsx

  hooks/
    useToggle.ts
    useLocalStorage.ts

  utils/
    formatDate.ts
    parseCurrency.ts

  services/
    api.ts

  types/
    index.ts
```

Caracteristicas:

- Tudo no mesmo nivel.
- Componentes genericos em `components/`.
- Logica de dominio pequena, pode ficar em `services/` + `utils/`.

Quando migrar para intermediaria:

- Muita logica de negocio em `components/` ou `App.tsx`.
- Varias telas/fluxos diferentes.
- Fica dificil "enxergar" features.

---

# 3. Estrutura Intermediaria (Projetos Medios)

> Usar quando tiver multiplas paginas/fluxos e ~15-50 componentes.

```text
src/
  main.tsx
  App.tsx

  assets/
    images/
    icons/
    fonts/

  components/
    ui/
      button/
        Button.tsx
        Button.test.tsx
        Button.module.css
        index.ts
      card/
      modal/
    layout/
      Header/
      Footer/
      Sidebar/
      MainLayout/
    form/
      TextInput/
      Select/
      Checkbox/

  features/
    auth/
      components/
        LoginForm.tsx
        SignupForm.tsx
      hooks/
        useAuth.ts
      services/
        authApi.ts
      pages/
        LoginPage.tsx
        SignupPage.tsx
      types/
        auth.ts
      index.ts

    users/
      components/
        UserCard.tsx
        UserList.tsx
      hooks/
        useUsers.ts
      services/
        usersApi.ts
      pages/
        UsersPage.tsx
        UserDetailPage.tsx
      types/
        user.ts
      index.ts

  hooks/
    useDebounce.ts
    useMediaQuery.ts

  utils/
    formatters/
      formatDate.ts
      formatCurrency.ts
    validators/
      email.ts
      password.ts

  services/
    api.ts
    storage.ts

  router/
    routes.tsx

  types/
    api.ts
    index.ts
```

Principios:

- `components/ui`: componentes 100% reutilizaveis (nao conhecem dominio).
- `components/layout`: layout da app (header, sidebar, etc.).
- `features/*`: "ilhas" de dominio (auth, users, dashboard, etc.).
- `hooks/` e `utils/` globais, usados por features.

Cada feature:

- `components/` - UI especifica da feature.
- `hooks/` - hooks de dominio da feature.
- `services/` - chamadas de API da feature.
- `pages/` - paginas/containers da feature.
- `types/` - tipos especificos da feature.
- `index.ts` - exporta o que e publico da feature.

Exemplo de `features/users/index.ts`:

```ts
export { UsersPage } from './pages/UsersPage';
export { UserDetailPage } from './pages/UserDetailPage';
export { useUsers } from './hooks/useUsers';
export type { User } from './types/user';
```

Uso:

```ts
import { UsersPage } from '@/features/users';
```

---

# 4. Estrutura Escalavel Feature-Based (Projetos Grandes)

> Usar quando tiver muitas features, muita equipe, ou dominios claros.

```text
src/
  main.tsx
  App.tsx

  app/
    providers/
      QueryClientProvider.tsx
      ThemeProvider.tsx
      RouterProvider.tsx
    router/
      routes.tsx

  shared/
    components/
      ui/
        button/
        card/
        modal/
      layout/
        Header/
        Sidebar/
        Footer/
    hooks/
      useDebounce.ts
      useMediaQuery.ts
    utils/
      formatDate.ts
      formatCurrency.ts
    services/
      apiClient.ts
    types/
      index.ts
    config/
      env.ts

  features/
    auth/
      api/
        login.ts
        register.ts
      components/
        LoginForm.tsx
        SignupForm.tsx
      hooks/
        useAuth.ts
      pages/
        LoginPage.tsx
        SignupPage.tsx
      store/
        authStore.ts
      types/
        auth.ts
      index.ts

    users/
      api/
        getUsers.ts
        getUserById.ts
      components/
        UserCard.tsx
        UserList.tsx
        UserFilters.tsx
      hooks/
        useUsers.ts
        useUserFilters.ts
      pages/
        UsersPage.tsx
        UserDetailPage.tsx
      store/
        usersStore.ts
      types/
        user.ts
      index.ts

    dashboard/
      api/
        getStats.ts
      components/
        StatsCard.tsx
        Chart.tsx
      hooks/
        useDashboard.ts
      pages/
        DashboardPage.tsx
      index.ts
```

Principios:

- `shared/` = tudo que e generico e usado por varias features.
- `features/` = "mapa de negocio" da aplicacao; cada pasta e um dominio.
- Cada `features/*/index.ts` e o "public API" da feature.

---

# 5. Path Aliases (Imports Limpos)

## HARD RULES

**PA-01** Nunca usar imports relativos complexos (`../../../`).
**PA-02** Sempre usar aliases configurados no Vite e tsconfig.
**PA-03** Aliases devem espelhar a estrutura de pastas.

## 5.1 `vite.config.ts`

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@features': path.resolve(__dirname, './src/features'),
      '@components': path.resolve(__dirname, './src/shared/components'),
      '@hooks': path.resolve(__dirname, './src/shared/hooks'),
      '@utils': path.resolve(__dirname, './src/shared/utils'),
      '@services': path.resolve(__dirname, './src/shared/services'),
      '@types': path.resolve(__dirname, './src/shared/types'),
    },
  },
});
```

## 5.2 `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@app/*": ["src/app/*"],
      "@shared/*": ["src/shared/*"],
      "@features/*": ["src/features/*"],
      "@components/*": ["src/shared/components/*"],
      "@hooks/*": ["src/shared/hooks/*"],
      "@utils/*": ["src/shared/utils/*"],
      "@services/*": ["src/shared/services/*"],
      "@types/*": ["src/shared/types/*"]
    }
  }
}
```

## 5.3 Imports Corretos

```ts
// CORRETO
import { Button } from '@components/ui/Button';
import { useAuth } from '@features/auth';
import { formatDate } from '@utils/formatDate';

// INCORRETO
import { Button } from '../../../components/ui/Button';
```

---

# 6. Convencoes por Pasta

## HARD RULES

**CP-01** Pastas DEVEM usar `kebab-case`.
**CP-02** Arquivos de componentes DEVEM usar `PascalCase.tsx`.
**CP-03** Utils e hooks DEVEM usar `camelCase.ts`.
**CP-04** Toda pasta de componente reutilizavel DEVE ter `index.ts`.
**CP-05** Toda feature DEVE ter `index.ts` como public API.
**CP-06** Imports de features DEVEM ser feitos apenas pelo `index.ts`.

## 6.1 Pasta de Componente

```text
components/ui/button/
  Button.tsx
  Button.test.tsx
  Button.module.css
  index.ts
```

`index.ts`:

```ts
export { Button } from './Button';
export type { ButtonProps } from './Button';
```

## 6.2 Pasta de Feature

```text
features/users/
  api/
  components/
  hooks/
  pages/
  store/
  types/
  index.ts
```

Regra:

- Tudo que for publico para fora da feature sai por `index.ts`.
- Outros modulos importam APENAS de `@features/users`.

---

# 7. Checklist de Estrutura

Antes de criar/mover arquivos, validar:

- [ ] Ja escolhi o nivel: base, intermediario ou feature-based.
- [ ] Componentes realmente reutilizaveis estao em `components/ui` ou `shared/components`.
- [ ] Logica de dominio esta em `features/*` (nao em `shared`).
- [ ] Hooks genericos em `shared/hooks`, hooks de dominio em `features/*/hooks`.
- [ ] Services de dominio em `features/*/api` ou `features/*/services`.
- [ ] `index.ts` nas pastas que precisam de "API publica".
- [ ] Sem imports com `../../../`; usando aliases.
- [ ] Nomes de pastas em `kebab-case`, arquivos de componentes em `PascalCase.tsx`.