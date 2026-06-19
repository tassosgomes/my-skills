---
name: react-code-quality
description: "Padroes transversais de qualidade de codigo React + Vite + TypeScript: convencoes de nomenclatura (Ingles, PascalCase componentes, camelCase variaveis, kebab-case pastas), estrutura e tamanho de componentes (max ~300 linhas), React Hooks patterns (useState tipado, useEffect cleanup, useCallback/useMemo com motivo), TypeScript strict sem any, props tipadas com interface, componentes genericos, imports organizados com aliases, renderizacao condicional segura, tratamento de erros. Skill transversal que deve ser aplicada apos geracao de codigo. Usar quando: gerar codigo TSX; revisar PR; refatorar e padronizar; validar naming conventions; criar componentes e hooks."
---

# React Code Quality Standards (Vite + TypeScript)

Documento normativo para geracao de codigo por LLMs.
Define regras obrigatorias e diretrizes de qualidade de codigo React + TypeScript.
Skill transversal — deve ser aplicada sempre apos geracao de codigo.

---

# 1. GLOBAL RULES

## HARD RULES (OBRIGATORIAS)

**GR-01** Code MUST be written in English (components, functions, variables, comments).
**GR-02** TypeScript strict mode MUST be enabled (`strict: true`).
**GR-03** Never use `any` in production code. Prefer `unknown` + narrowing.
**GR-04** Only functional components with Hooks. No class components.
**GR-05** Components MUST have a single clear responsibility.
**GR-06** Component size: ideal ~200 lines, maximum ~300 lines.
**GR-07** Props MUST be typed with `interface` or `type`.
**GR-08** Never swallow errors silently. Show friendly UI messages; log details elsewhere.
**GR-09** Prefer pure functions and small components.
**GR-10** Avoid duplication; extract helpers and reusable components.

## SOFT GUIDELINES (PREFERENCIAS)

**GG-01** Prefer readability over cleverness.
**GG-02** Prefer composition over inheritance.
**GG-03** Prefer immutability.
**GG-04** Prefer explicit types when inference reduces readability.

---

# 2. NAMING CONVENTIONS

## HARD RULES

**NC-01** Components -> `PascalCase`
**NC-02** Hooks -> `camelCase` starting with `use` (ex: `useUserProfile`)
**NC-03** Variables, functions, parameters -> `camelCase`
**NC-04** Interfaces de props -> `ComponentNameProps`
**NC-05** Folders -> `kebab-case`
**NC-06** Component files -> `PascalCase.tsx`
**NC-07** Utils and hooks files -> `camelCase.ts`
**NC-08** Avoid ambiguous abbreviations.

## EXAMPLES

Correct:

```tsx
export function UserProfileCard() {}
export function useUserProfile() {}
export function useDebouncedValue() {}
const userName = 'John';
const isLoading = false;
```

Incorrect:

```tsx
export function userProfileCard() {}
export function User_profile() {}
export function getUserProfileHook() {}
export function UseUserProfile() {}
const UserName = 'John';
const usr = 'John';
```

## Interface/Type Naming

```tsx
interface UserProfileCardProps {
  user: User;
  onFollow?: (userId: string) => Promise<void>;
}

type Variant = 'primary' | 'secondary' | 'danger';
```

---

# 3. COMPONENT STRUCTURE

## Order Within File

1. Imports (React, libs, internos).
2. Types/Interfaces.
3. Internal constants.
4. Components / hooks.
5. Exports.

```tsx
import { useState, useEffect } from 'react';

interface UserProfileProps {
  userId: string;
}

export function UserProfile({ userId }: UserProfileProps): JSX.Element {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // ...
  }, [userId]);

  return <div>{user?.name}</div>;
}

export type { UserProfileProps };
```

## Size and Responsibility Rules

**CS-01** Single responsibility per component.
**CS-02** Ideal: ~200 lines, max ~300 lines.
**CS-03** Extract UI subcomponents when component grows.
**CS-04** Extract hooks for state/effect logic.

---

# 4. REACT HOOKS PATTERNS

## 4.1 useState

Always type states when the type is not obvious:

```tsx
const [count, setCount] = useState<number>(0);
const [user, setUser] = useState<User | null>(null);
const [items, setItems] = useState<string[]>([]);
```

## 4.2 useEffect

**HK-01** Separate concerns into multiple `useEffect` if necessary.
**HK-02** ALWAYS clean up effects that register listeners, timers, etc.

```tsx
useEffect(() => {
  const id = setInterval(() => {
    // ...
  }, 1000);

  return () => clearInterval(id);
}, []);
```

## 4.3 useCallback / useMemo

**HK-03** Use ONLY when there is a real benefit:
- Function is passed to memoized child components (`React.memo`).
- Function is a dependency of another hook (`useEffect`, `useMemo`, etc.).

**HK-04** Do NOT use by habit.

```tsx
// CORRECT: has reason — depends on onClose, passed to memoized child
const handleClose = useCallback(() => {
  onClose?.();
}, [onClose]);

// INCORRECT: unnecessary
const increment = useCallback(() => setCount((c) => c + 1), []);
```

## 4.4 Custom Hooks

**HK-05** Name MUST start with `use`.
**HK-06** Inputs and outputs MUST be well typed.
**HK-07** Do NOT access DOM directly (use ref if needed).

```tsx
interface UseFetchResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

export function useFetch<T>(url: string): UseFetchResult<T> {
  // ...
  return { data, error, isLoading };
}
```

---

# 5. TYPESCRIPT + REACT PATTERNS

## 5.1 Typed Props

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  disabled = false,
  onClick,
  children,
}: ButtonProps): JSX.Element {
  return (
    <button
      className={`btn btn--${variant}`}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

## 5.2 Generic Components

```tsx
interface ListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string | number;
}

export function List<T>({ items, renderItem, keyExtractor }: ListProps<T>): JSX.Element {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor(item, index)}>{renderItem(item, index)}</li>
      ))}
    </ul>
  );
}
```

## 5.3 Avoid `any`

**TS-01** Never use `any` in production code.
**TS-02** Prefer `unknown` + narrowing or explicit types.

```tsx
// INCORRECT
function parseResponse(data: any) {}

// CORRECT
function parseResponse(data: unknown): ApiResponse {
  // validate/parse here
}
```

---

# 6. IMPORTS

## HARD RULES

**IM-01** Order: standard libs -> external libs -> internal modules.
**IM-02** Use aliases (`@/`) when configured in Vite/tsconfig.
**IM-03** Never use deep relative paths (`../../../`).

```tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { useUserStore } from '@/stores/userStore';
import { formatDate } from '@/utils/formatDate';
```

---

# 7. CONDITIONAL RENDERING

## HARD RULES

**CR-01** Avoid falsy value pitfalls.

```tsx
// INCORRECT: can render 0
{items.length && <ItemsList items={items} />}

// CORRECT
{items.length > 0 && <ItemsList items={items} />}
{items.length === 0 && <EmptyState />}
```

---

# 8. PROPS DRILLING

**PD-01** More than 2 levels of props passing -> consider Context or global state.

```tsx
// INCORRECT: props passing through many levels
<Header user={user} />

// CORRECT: Context
<UserContext.Provider value={user}>
  <Header />
</UserContext.Provider>
```

---

# 9. ERROR HANDLING

**EH-01** Never swallow errors silently.
**EH-02** Show friendly messages in UI; log details elsewhere when needed.

---

# 10. PR CHECKLIST

Before opening PR:

- [ ] Names in English and consistent (components, functions, variables).
- [ ] Functional components only, no class components.
- [ ] No `any` in production code.
- [ ] Props typed with `interface` or `type`.
- [ ] Custom hooks following `useX` pattern.
- [ ] `useEffect` with cleanup when necessary.
- [ ] `useCallback`/`useMemo` used only when there is real benefit.
- [ ] Imports organized and no complex relative paths (`../../../`).
- [ ] No excessive props drilling.
- [ ] Code split into reusable components/hooks when it makes sense.
- [ ] Components under ~300 lines.
- [ ] TypeScript `strict: true` with no bypasses.