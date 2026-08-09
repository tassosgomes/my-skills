# Referência completa — Deploy React em Subpath

> Leia sob demanda quando o app Vite for servido fora da raiz, com Router, Nginx e Ingress Kubernetes.


# React Subpath Deploy

Configura um projeto React + Vite para funcionar corretamente em um subpath (ex: `/poc-01/`) em vez
da raiz `/`, resolvendo os três problemas clássicos de SPAs em subpath: referência de assets, roteamento
client-side e fallback do history API.

## Quando usar

- Projeto React (Vite) que será deployed em Kubernetes em um path como `/meu-app/`
- Múltiplas POCs ou apps que compartilham o mesmo hostname
- Qualquer cenário onde o frontend NÃO roda na raiz `/`

## Pré-requisitos

O projeto deve usar:
- **Vite** como bundler (não CRA)
- **React Router v6+** (se tiver roteamento client-side)
- **Docker** para build da imagem
- **Kubernetes** com Ingress (Nginx Ingress Controller ou NetScaler CPX)

## Fluxo de Trabalho

### 1. Coletar informações

Antes de gerar os arquivos, identifique:

- **Nome do subpath**: ex: `/poc-01/` (sempre com trailing slash)
- **O projeto já existe ou está sendo criado do zero?**
- **Usa React Router?** Se sim, qual versão?
- **Ingress controller**: Nginx Ingress ou NetScaler CPX?
- **Já existe um Ingress para o host ou será criado?**

Se o usuário não especificar o subpath, pergunte. Se o nome do projeto for claro (ex: "poc-telemarketing"),
sugira o path com base nele (`/poc-telemarketing/`).

### 2. Aplicar as 4 camadas de configuração

Cada camada resolve um problema específico. Todas são necessárias para o subpath funcionar.

#### Camada 1 — Vite `base`

Configura o prefixo dos assets (JS, CSS, imagens) no build.

No `vite.config.ts`, definir `base` usando variável de ambiente para reutilização:

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react()],
})
```

**Por que funciona**: O Vite usa `base` para prefixar todas as referências a assets no HTML gerado.
Sem isso, o browser tenta carregar `/assets/index.js` em vez de `/poc-01/assets/index.js` e recebe 404.

**Importante**: `VITE_BASE_PATH` deve incluir trailing slash (ex: `/poc-01/`).

#### Camada 2 — React Router `basename`

Configura o React Router para reconhecer que a aplicação está montada em um subpath.

```tsx
import { BrowserRouter } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* rotas aqui — paths relativos ao basename */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

**Por que funciona**: `import.meta.env.BASE_URL` é injetado automaticamente pelo Vite a partir do
valor de `base` no config. Zero duplicação de configuração.

**Se o projeto NÃO usa React Router**: pular esta camada. Projetos single-page sem navegação interna
não precisam.

#### Camada 3 — Nginx com `alias` + SPA fallback

O Nginx precisa servir os arquivos estáticos do build E redirecionar rotas desconhecidas para o
`index.html` (SPA fallback).

Usar template com substituição de variável via `envsubst` (suportado nativamente pela imagem `nginx:alpine`):

Criar `nginx.conf.template` na raiz do projeto:

```nginx
server {
    listen       80;
    server_name  _;

    location ${BASE_PATH} {
        alias /usr/share/nginx/html/;
        try_files $uri $uri/ ${BASE_PATH}index.html;
    }

    # Health check na raiz (útil para probes do Kubernetes)
    location /healthz {
        access_log off;
        return 200 'ok';
        add_header Content-Type text/plain;
    }
}
```

**Detalhe crítico — `alias` vs `root`**:
- `root /usr/share/nginx/html` + `location /poc-01/` → Nginx procura em `/usr/share/nginx/html/poc-01/` (ERRADO)
- `alias /usr/share/nginx/html/` + `location /poc-01/` → Nginx procura em `/usr/share/nginx/html/` (CORRETO)

Sempre usar `alias` para subpath.

#### Camada 4 — Dockerfile multi-stage

Criar `Dockerfile` na raiz do projeto:

```dockerfile
# ---- Build ----
FROM node:20-alpine AS build

ARG BASE_PATH=/app/
ENV VITE_BASE_PATH=${BASE_PATH}

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Serve ----
FROM nginx:alpine

ARG BASE_PATH=/app/
ENV BASE_PATH=${BASE_PATH}

# Copiar build
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx template — envsubst substitui ${BASE_PATH} automaticamente
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
```

**Uso**:
```bash
docker build --build-arg BASE_PATH=/poc-01/ -t meu-app:latest .
```

A mesma Dockerfile serve para qualquer subpath — só muda o `--build-arg`.

### 3. Kubernetes — Ingress multipath

Para o cenário de múltiplas POCs no mesmo host, o Ingress agrupa todos os paths:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: poc-arquitetura
spec:
  rules:
    - host: poc-arquitetura.ecad.org.br
      http:
        paths:
          - path: /poc-01
            pathType: Prefix
            backend:
              service:
                name: poc-01-svc
                port:
                  number: 80
          - path: /poc-02
            pathType: Prefix
            backend:
              service:
                name: poc-02-svc
                port:
                  number: 80
```

Para **NetScaler CPX**, adicionar annotation:
```yaml
metadata:
  annotations:
    ingress.citrix.com/insecure-termination: "allow"
```

### 4. Verificação

Após o deploy, validar que tudo funciona:

1. `https://host/poc-01/` carrega o index.html ✓
2. `https://host/poc-01/assets/index-xxx.js` retorna o JS ✓
3. `https://host/poc-01/alguma-rota` (deep link) carrega a SPA e navega ✓
4. `https://host/poc-01/healthz` retorna 200 ✓

Se algum falhar, a camada correspondente não foi configurada corretamente.

## Aplicando em projetos existentes

Se o projeto já existe:

1. Verificar se `vite.config.ts` já tem `base` definido — se sim, ajustar para usar env var
2. Verificar se o React Router já usa `basename` — se sim, ajustar para `import.meta.env.BASE_URL`
3. Verificar se há referências hardcoded a `/` em links, imagens ou fetch calls — substituir por
   paths relativos ou prefixados com `import.meta.env.BASE_URL`
4. Criar `nginx.conf.template` e `Dockerfile` se não existirem
5. Buscar por `<a href="/..."` ou `<img src="/..."` no código — estes quebram em subpath

## Aplicando em projetos novos

Ao criar um projeto do zero com `npm create vite@latest`:

1. Scaffold normalmente
2. Aplicar as 4 camadas acima
3. Copiar os templates `nginx.conf.template` e `Dockerfile` de `templates/`

## Templates

Esta skill inclui templates prontos em `templates/`:

- `nginx.conf.template` — Configuração Nginx com subpath dinâmico
- `Dockerfile` — Multi-stage build com BASE_PATH parametrizado
- `ingress.yaml` — Exemplo de Ingress multipath

Ao gerar os arquivos para o projeto, leia os templates e adapte ao contexto.

## Armadilhas comuns

- **Esquecer a trailing slash no BASE_PATH**: `/poc-01` vs `/poc-01/` — sem a barra final, o Nginx
  pode não resolver o alias corretamente
- **Usar `root` em vez de `alias`**: O erro mais comum. `root` concatena location + path, `alias` substitui
- **Links absolutos no código React**: `<Link to="/dashboard">` funciona se o basename estiver configurado,
  mas `<a href="/dashboard">` NÃO — usar `<Link>` do React Router ou prefixar manualmente
- **Imagens com path absoluto**: `<img src="/logo.png">` quebra — usar import do Vite ou path relativo
- **Variáveis de ambiente sem prefixo VITE_**: Apenas variáveis com prefixo `VITE_` são expostas ao
  código client-side pelo Vite
- **Fetch/API calls com path absoluto**: Se o frontend faz `fetch('/api/data')`, considerar se o
  subpath afeta ou não (geralmente APIs ficam em outro host/path, então não afeta)
