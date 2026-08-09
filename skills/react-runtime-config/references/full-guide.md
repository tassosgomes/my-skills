# Referência completa — Runtime Config React

> Leia sob demanda para o template de runtime, `runtimeConfig.ts`, entrypoint `envsubst` e Dockerfile.


# React Runtime Config & Containers (12-Factor Frontend)

Documento normativo para configuracao em runtime e containerizacao.
Define os padroes obrigatorios de deploy frontend seguindo 12-factor.

---

# 1. Principio Fundamental

> Uma unica imagem/container para dev, homologacao e producao.
> Sem rebuild da imagem ao mudar URL de backend ou outras configs.

O build deve gerar um **artefato unico e imutavel**.
A diferenca entre ambientes deve estar apenas nas **variaveis de ambiente** aplicadas em tempo de execucao.

---

# 2. Por que NAO usar so `import.meta.env`

O Vite injeta variaveis (`import.meta.env`) em **tempo de build**.
Se a URL do backend vem de `.env`, qualquer mudanca de ambiente exige **novo build**.

## HARD RULES

**RC-01** E **proibido** usar `import.meta.env` para URLs de backend e configs que variam entre ambientes.
**RC-02** `import.meta.env` pode ser usado para flags de build que NAO mudam entre ambientes (ex.: ativar Sentry no bundle).
**RC-03** Sempre consumir configs por meio do modulo `runtimeConfig.ts`.
**RC-04** Toda configuracao dinamica deve existir em: `runtime-env.template.js` + `runtimeConfig.ts` + `40-runtime-env.sh`.

---

# 3. Arquitetura da Solucao

## 3.1 Componentes Principais

1. **Template de config**: `public/runtime-env.template.js` com placeholders `${VARIAVEL}`.
2. **Script de runtime**: `docker/40-runtime-env.sh` - usa `envsubst` para gerar `runtime-env.js`.
3. **Carregamento no HTML**: `index.html` inclui `<script src="/runtime-env.js"></script>` antes do bundle.
4. **Acesso tipado**: `src/config/runtimeConfig.ts` le `window.RUNTIME_ENV` e expoe constantes tipadas.

## 3.2 Estrutura Minima de Arquivos

```text
.
├─ public/
│  └─ runtime-env.template.js   # template de config
├─ src/
│  └─ config/
│     └─ runtimeConfig.ts       # camada de acesso tipada
├─ index.html                   # carrega runtime-env.js
├─ Dockerfile                   # multi-stage com Nginx
└─ docker/
   └─ 40-runtime-env.sh         # script de runtime (Nginx)
```

---

# 4. Template de Config (`runtime-env.template.js`)

Criar em `public/runtime-env.template.js`:

```js
// ESTE ARQUIVO E UM TEMPLATE. NAO COMMITAR COM VALORES REAIS.
// Os valores serao substituidos em tempo de execucao pelo container.

window.RUNTIME_ENV = {
  API_URL: "${API_URL}",
  // Adicione outras configs conforme necessidade:
  // FEATURE_FLAG_X: "${FEATURE_FLAG_X}",
  // SENTRY_DSN: "${SENTRY_DSN}",
};
```

Regras:

- Sempre usar placeholders `${VARIAVEL}` que correspondam ao nome da env var no container.
- Nao colocar segredos hard-coded.
- Qualquer nova config DEVE passar por este arquivo.

---

# 5. Carregamento no `index.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>App</title>

    <!-- Carrega configs de runtime ANTES do app -->
    <script src="/runtime-env.js"></script>

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Regras:

- NAO referenciar `runtime-env.template.js` no HTML, apenas `runtime-env.js`.
- `runtime-env.js` sera gerado pelo container em `/usr/share/nginx/html/runtime-env.js`.

---

# 6. Acesso Tipado (`runtimeConfig.ts`)

```ts
// src/config/runtimeConfig.ts

type RuntimeEnv = {
  API_URL?: string;
  // FEATURE_FLAG_X?: string;
  // SENTRY_DSN?: string;
};

declare global {
  interface Window {
    RUNTIME_ENV?: RuntimeEnv;
  }
}

const runtimeEnv: RuntimeEnv =
  typeof window !== "undefined" && window.RUNTIME_ENV
    ? window.RUNTIME_ENV
    : {};

// OBRIGATORIO TER UM DEFAULT RAZOAVEL PARA DEV LOCAL
export const API_URL: string =
  runtimeEnv.API_URL || "http://localhost:3000";

// Exemplo:
// export const FEATURE_FLAG_X = runtimeEnv.FEATURE_FLAG_X === "true";
// export const SENTRY_DSN = runtimeEnv.SENTRY_DSN || "";
```

Uso:

```ts
import { API_URL } from "@/config/runtimeConfig";

export async function fetchUsers() {
  const res = await fetch(`${API_URL}/users`);
  if (!res.ok) throw new Error("Erro ao buscar usuarios");
  return res.json();
}
```

---

# 7. Dockerfile Padrao (Multi-Stage)

```dockerfile
# Stage 1: Build com Node
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build   # gera /app/dist

# Stage 2: Runtime com Nginx
FROM nginx:alpine

# Garantir que envsubst esteja disponivel
RUN apk add --no-cache gettext

WORKDIR /usr/share/nginx/html

# Copia o build gerado pelo Vite
COPY --from=builder /app/dist ./

# Copia o template de runtime (veio de public/)
COPY --from=builder /app/public/runtime-env.template.js ./runtime-env.template.js

# Copia script de inicializacao
COPY docker/40-runtime-env.sh /docker-entrypoint.d/40-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-env.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Pontos-chave:

- Imagem final e apenas Nginx + arquivos estaticos.
- `envsubst` usado em runtime para gerar `runtime-env.js`.
- Script `40-runtime-env.sh` executado automaticamente antes do Nginx subir.

---

# 8. Script de Runtime (`40-runtime-env.sh`)

```sh
#!/bin/sh
set -eu

export API_URL=${API_URL:-}

# Validacao: falhar se API_URL nao estiver definida
if [ -z "$API_URL" ]; then
  echo "ERROR: API_URL nao definida no ambiente."
  exit 1
fi

# Gera runtime-env.js a partir do template
envsubst '${API_URL}' \
  < /usr/share/nginx/html/runtime-env.template.js \
  > /usr/share/nginx/html/runtime-env.js

# Remover template para nao deixa-lo exposto
rm /usr/share/nginx/html/runtime-env.template.js

echo "runtime-env.js gerado com sucesso."
```

Regras:

- Sempre que adicionar nova variavel no template, incluir tambem no `envsubst` e validar.
- Scripts em `/docker-entrypoint.d` sao o mecanismo oficial da imagem `nginx`.

---

# 9. Configuracao por Ambiente (Sem Rebuild)

## Docker

```bash
# Producao
docker run -d -p 80:80 -e API_URL=https://api.example.com app:latest

# Homologacao
docker run -d -p 8080:80 -e API_URL=https://api-hml.example.com app:latest

# Dev com container
docker run -d -p 3000:80 -e API_URL=http://host.docker.internal:8080 app:latest
```

A imagem e sempre a mesma; mudam apenas as variaveis de ambiente.

## docker-compose

```yaml
version: "3.9"
services:
  frontend:
    image: app:latest
    ports:
      - "80:80"
    environment:
      API_URL: "https://api.example.com"
```

---

# 10. Extensibilidade

Para novas variaveis:

1. Adicionar no `runtime-env.template.js`.
2. Exportar em `runtimeConfig.ts` com tipagem adequada.
3. Ajustar `40-runtime-env.sh` (`envsubst` + validacao).
4. Documentar quais env vars cada app aceita.

---

# 11. Checklist

- [ ] `public/runtime-env.template.js` existe com todas as chaves necessarias.
- [ ] `index.html` carrega `runtime-env.js` antes do bundle.
- [ ] `src/config/runtimeConfig.ts` centraliza acesso a todas as configs.
- [ ] Nenhuma URL de backend lida de `import.meta.env` ou hard-coded.
- [ ] Dockerfile multi-stage com `nginx:alpine` e `envsubst`.
- [ ] `docker/40-runtime-env.sh` existe, executavel e valida env vars criticas.
- [ ] Documentacao lista todas as env vars esperadas por ambiente.
- [ ] Defaults seguros para dev local em `runtimeConfig.ts`.
