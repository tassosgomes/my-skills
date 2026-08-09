# Referência completa — Testes React

> Leia sob demanda para receitas de Vitest, RTL, MSW, formulários, cobertura e pipeline CI.

## Conteúdo

- Setup Vitest/RTL/MSW e testes unitários
- Hooks, APIs e formulários
- Cobertura, CI, boas práticas e checklist


# React Testing Strategy (Vitest + RTL + MSW)

Documento normativo para estrategias de teste.
Pode bloquear geracao de codigo sem teste.

---

# 1. Objetivos

- Garantir comportamento correto de componentes, hooks e fluxos.
- Permitir refatorar com seguranca.
- Ter feedback rapido em desenvolvimento e CI.

Tipos principais:

- Testes unitarios (componentes, hooks, funcoes).
- Testes de integracao (componentes + contexto + API mockada).
- Testes E2E (Playwright, opcional).

---

# 2. Setup

## Dependencias

- `vitest` configurado em `vitest.config.ts`.
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- `msw` para mock de API.

## Estrutura

```text
src/
  test/
    setup.ts
    mocks/
      handlers.ts
      server.ts
  features/
    users/
      components/
        UserCard.tsx
        UserCard.test.tsx
```

## Setup File

```ts
// src/test/setup.ts
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});
```

## Setup com MSW

```ts
// src/test/setup.ts (com MSW)
import '@testing-library/jest-dom';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
```

---

# 3. Testes Unitarios de Componentes

## 3.1 Padrao AAA (Arrange-Act-Assert)

```tsx
// Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    // Arrange
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    const user = userEvent.setup();

    // Act
    await user.click(button);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });

    expect(button).toBeDisabled();
  });
});
```

## 3.2 HARD RULES

**UT-01** Use semantic queries (`getByRole`, `getByLabelText`, etc.).
**UT-02** Avoid `getByTestId` unless there is no alternative.
**UT-03** Test behavior, not internal implementation.
**UT-04** Use `userEvent` (not `fireEvent`) for user interactions.
**UT-05** Always follow AAA pattern (Arrange-Act-Assert).
**UT-06** Name tests with scenario + expected result.

---

# 4. Testando Hooks

## 4.1 Hook Simples

```ts
// useCounter.ts
import { useState, useCallback } from 'react';

export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);

  const increment = useCallback(() => setCount((c) => c + 1), []);
  const decrement = useCallback(() => setCount((c) => c - 1), []);
  const reset = useCallback(() => setCount(initialValue), [initialValue]);

  return { count, increment, decrement, reset };
}
```

```ts
// useCounter.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments count', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCounter(5));

    act(() => {
      result.current.increment();
      result.current.reset();
    });

    expect(result.current.count).toBe(5);
  });
});
```

---

# 5. Mock de API com MSW

## 5.1 Handlers

```ts
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () =>
    HttpResponse.json([
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' }
    ]),
  )
];
```

```ts
// src/test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

## 5.2 Componente que Consome API

```tsx
// UserList.tsx
import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
}

export function UserList(): JSX.Element {
  const { data, isLoading, error } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading users</div>;

  return (
    <ul>
      {data?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

```tsx
// UserList.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserList } from './UserList';

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('UserList', () => {
  it('renders users from API', async () => {
    renderWithQueryClient(<UserList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('John')).toBeInTheDocument();
      expect(screen.getByText('Jane')).toBeInTheDocument();
    });
  });

  it('shows error when API fails', async () => {
    server.use(
      http.get('/api/users', () =>
        new HttpResponse(null, { status: 500 })
      )
    );

    renderWithQueryClient(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/error loading users/i)).toBeInTheDocument();
    });
  });
});
```

---

# 6. Testando Formularios

```tsx
// LoginForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('submits valid data', async () => {
    const handleSubmit = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<LoginForm onSubmit={handleSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(handleSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows validation errors for empty submit', async () => {
    const user = userEvent.setup();

    render(<LoginForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });
});
```

---

# 7. Cobertura e CI

## 7.1 Script de Coverage

```jsonc
{
  "scripts": {
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  }
}
```

Em `vitest.config.ts`:

- `lines`, `branches`, `functions`, `statements` >= 80.

## 7.2 Pipeline CI

```bash
npm ci
npm run lint
npm run type-check
npm run test:coverage
npm run build
```

---

# 8. Boas Praticas

## CORRETO

- Nomear testes com cenario + resultado esperado.
- Usar padrao AAA (Arrange-Act-Assert).
- Usar `userEvent` para simular interacao.
- Usar MSW para APIs (sem bater em endpoints reais).
- Manter os testes perto do codigo (`Component.test.tsx` na mesma pasta).

## INCORRETO

- Testar detalhes de implementacao (ex.: chamadas de hooks internos).
- Depender de ordem de execucao de testes.
- Criar snapshots gigantes e frageis.
- Deixar testes lentos rodando no mesmo job de feedback rapido.

---

# 9. Checklist

Antes de concluir a feature:

- [ ] Componentes principais tem testes.
- [ ] Hooks de negocio tem testes separados.
- [ ] Fluxos com API usam MSW, nao fetch real.
- [ ] Formularios tem pelo menos 1 teste de sucesso e 1 de erro.
- [ ] `npm run test` passa localmente.
- [ ] Cobertura minima atendida (>= 70%).
- [ ] Sem snapshots gigantes e frageis.
- [ ] Testes usam queries semanticas (getByRole, getByLabelText).
- [ ] AAA pattern em todos os testes.
