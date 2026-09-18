# Runtime, container e subpath

Leia quando a tarefa for colocar o app para rodar num ambiente: configuração que muda por deploy,
Dockerfile, Nginx ou servir o app fora da raiz do host.

Assets prontos em `../assets/`: `Dockerfile`, `nginx.conf.template`, `docker/40-runtime-env.sh`,
`ingress.yaml`.

## Princípio

Uma imagem para dev, homologação e produção. O que muda entre ambientes muda em **variável de
ambiente lida no start do container** — nunca em rebuild.

**DESVIO deliberado do bulletproof-react:** o `config/env.ts` dele lê `import.meta.env`, que o Vite
resolve em tempo de build. Isso obriga uma imagem por ambiente. Mantemos a forma dele (arquivo
único, validado por schema, que falha no boot) e trocamos a fonte para `window.RUNTIME_ENV`.

`import.meta.env` continua válido para o que **não** varia entre ambientes: `MODE`, `PROD`,
`BASE_URL` e flags que decidem o que entra no bundle.

## Como funciona

Quatro peças:

1. `public/runtime-env.template.js` — template com placeholders `${VAR}`.
2. `docker/40-runtime-env.sh` — roda no start, `envsubst` gera `runtime-env.js` e apaga o template.
3. `index.html` — carrega `runtime-env.js` **antes** do bundle.
4. `src/config/env.ts` — lê `window.RUNTIME_ENV`, valida com Zod, exporta tipado.

Toda config nova passa pelas quatro. Config que existe em três das quatro é a falha mais comum.

### `public/runtime-env.template.js`

```js
// Template. Os valores são substituídos no start do container. Não commitar valores reais.
window.RUNTIME_ENV = {
  API_URL: '${API_URL}',
  OTEL_ENDPOINT: '${OTEL_ENDPOINT}',
};
```

### `index.html`

```html
<script src="%BASE_URL%runtime-env.js"></script>
<script type="module" src="/src/main.tsx"></script>
```

`%BASE_URL%` é substituído pelo Vite no build pelo valor de `base`, virando um caminho **absoluto**
(`/poc-01/runtime-env.js`). Caminho relativo (`src="runtime-env.js"`) parece funcionar na raiz do
app e quebra no deep link: em `/poc-01/users/42` o browser resolveria
`/poc-01/users/runtime-env.js`, cairia no fallback da SPA e carregaria o `index.html` como se fosse
JavaScript.

Nunca referencie `runtime-env.template.js` aqui — só o `.js` gerado.

### `src/config/env.ts`

Valida no boot e **falha alto**. Um app que sobe com `API_URL` indefinida e só quebra na primeira
tela é pior que um app que não sobe.

```ts
import * as z from 'zod';

const EnvSchema = z.object({
  API_URL: z.url(),
  OTEL_ENDPOINT: z.url().optional(),
});

declare global {
  interface Window {
    RUNTIME_ENV?: Record<string, string | undefined>;
  }
}

// Em dev o runtime-env.js não existe (o Vite serve apenas o template), então caímos aqui.
const devFallbacks = import.meta.env.DEV ? { API_URL: 'http://localhost:8080' } : {};

const createEnv = () => {
  // Descarta placeholders não substituídos, caso o template vaze para o lugar do gerado.
  const raw = Object.fromEntries(
    Object.entries(window.RUNTIME_ENV ?? {}).filter(
      ([, value]) => value && !value.startsWith('${'),
    ),
  );

  const parsed = EnvSchema.safeParse({ ...devFallbacks, ...raw });

  if (!parsed.success) {
    throw new Error(`Config de runtime inválida:\n${z.prettifyError(parsed.error)}`);
  }

  return parsed.data;
};

export const env = createEnv();
```

Consumo: `import { env } from '@/config/env'` e `env.API_URL`. Nada de `window.RUNTIME_ENV` espalhado
pelo código — a única leitura do objeto global é essa.

### `docker/40-runtime-env.sh`

`/docker-entrypoint.d/` é o mecanismo oficial da imagem `nginx`: tudo que estiver lá roda antes do
Nginx subir. O prefixo numérico ordena.

```sh
#!/bin/sh
set -eu

: "${API_URL:?API_URL não definida no ambiente}"
export OTEL_ENDPOINT="${OTEL_ENDPOINT:-}"

envsubst '${API_URL} ${OTEL_ENDPOINT}' \
  < /usr/share/nginx/html/runtime-env.template.js \
  > /usr/share/nginx/html/runtime-env.js

rm /usr/share/nginx/html/runtime-env.template.js
```

Duas regras: liste as variáveis explicitamente no `envsubst` (sem a lista, ele come qualquer `$algo`
que apareça no arquivo) e falhe para toda variável obrigatória que faltar.

## Subpath

Serve o app em `https://host/poc-01/` em vez de `/`. Quatro camadas; as quatro são necessárias e
falham de formas diferentes.

**O subpath é propriedade da aplicação, não do ambiente.** `/poc-01/` é `/poc-01/` em dev,
homologação e produção. Por isso ele entra em build arg e não em variável de runtime — e isso não
contradiz o princípio acima, que trata do que varia *entre deploys da mesma aplicação*.

| Camada | Onde | Resolve |
|---|---|---|
| 1 | `vite.config.ts` → `base` | prefixo dos assets no HTML gerado |
| 2 | `createBrowserRouter` → `basename` | rotas reconhecerem o prefixo |
| 3 | `nginx.conf.template` → `alias` + `try_files` | servir arquivos e dar fallback de SPA |
| 4 | `Dockerfile` → `ARG BASE_PATH` | mesma imagem para qualquer subpath |

`BASE_PATH` sempre com barra final: `/poc-01/`. Sem ela o `alias` do Nginx não resolve.

### Camada 1 — Vite

```ts
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
});
```

### Camada 2 — Router

```tsx
createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
```

O Vite injeta `import.meta.env.BASE_URL` a partir do `base`, então o valor não é declarado duas
vezes. O pacote é `react-router` — `react-router-dom` foi descontinuado na v7.

### Camada 3 — Nginx

```nginx
location ${BASE_PATH} {
    alias /usr/share/nginx/html/;
    try_files $uri $uri/ ${BASE_PATH}index.html;
}
```

`alias` **substitui** o prefixo; `root` **concatena**. Com `root` e `location /poc-01/`, o Nginx
procura em `/usr/share/nginx/html/poc-01/`, que não existe. Este é o erro mais comum do subpath.

A imagem `nginx` aplica `envsubst` sozinha no que estiver em `/etc/nginx/templates/*.template`.

### Camada 4 — Dockerfile

```bash
docker build --build-arg BASE_PATH=/poc-01/ -t meu-app:latest .
docker run -d -p 8080:80 -e API_URL=https://api.example.com meu-app:latest
```

Subpath no build, config no run.

## Verificação

Nesta ordem — cada falha aponta para uma camada:

1. `GET /poc-01/` devolve o `index.html` → camadas 3 e 4.
2. `GET /poc-01/assets/index-*.js` devolve o JS → camada 1.
3. `GET /poc-01/alguma/rota` (deep link, F5 na URL) carrega a SPA → `try_files` da camada 3.
4. Navegar dentro do app mantém o prefixo → camada 2.
5. `GET /poc-01/runtime-env.js` traz os valores substituídos, sem `${...}` → entrypoint.
6. `GET /healthz` devolve 200 → probe do Kubernetes.

## Armadilhas

- `<a href="/rota">` e `<img src="/logo.png">` ignoram o basename e quebram em subpath. Use `<Link>`
  do router, `import` do Vite para imagem, ou prefixe com `import.meta.env.BASE_URL`.
- URL montada por concatenação de string escapa do `config/paths.ts` e é o que sobrevive à
  verificação e quebra em produção.
- `envsubst` sem lista de variáveis destrói qualquer `$` legítimo no arquivo.
- Template não removido no entrypoint deixa `runtime-env.template.js` servido publicamente.
- `version:` no `docker-compose.yml` é campo obsoleto no Compose v2 e gera warning.
