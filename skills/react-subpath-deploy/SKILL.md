---
name: react-subpath-deploy
description: "Use sempre que um SPA React + Vite precisar rodar fora da raiz: base path no Vite, React Router basename, fallback Nginx, Dockerfile com path dinâmico, Ingress multipath ou múltiplas POCs no mesmo host. Dispare com subpath, multipath, base path, compartilhar host ou deploy de POC. Não use para runtime config genérico."
metadata:
  group: react
---

# Deploy React em Subpath

Esta skill é a primária quando o frontend é servido em `/meu-app/` em vez de `/`. Ela coordena
assets, roteamento client-side e fallback da SPA; templates prontos ficam em `templates/`.

## Pré-requisitos e coleta

- Confirme Vite, Docker e Kubernetes; React Router v6+ só é necessário se houver rotas client-side.
- Confirme o subpath com barra final (`/poc-01/`), o Ingress controller e se o Ingress/host já existe.
- Se o path não for informado, peça-o antes de gerar arquivos.

## Quatro camadas obrigatórias

1. **Vite:** `base` vem de `VITE_BASE_PATH` e sempre termina com `/`.
2. **Router:** quando houver React Router, use `basename={import.meta.env.BASE_URL}`; sem Router,
   não adicione uma camada desnecessária.
3. **Nginx:** use `alias` para o diretório estático e fallback para `${BASE_PATH}index.html`; não
   use `root` que concatena o subpath incorretamente.
4. **Entrega:** Dockerfile multi-stage recebe `BASE_PATH`; Ingress usa paths `Prefix` para cada app.

## Regras não negociáveis

- Assets, links, imagens e deep links devem respeitar o subpath; procure referências absolutas à raiz.
- O template Nginx e o Dockerfile devem ser adaptados do contexto, não copiados cegamente.
- A mesma imagem pode ser construída para paths diferentes via argumento explícito, sem misturar o
  path do app com a URL da API.
- Valide a URL inicial, um asset, um deep link e `/healthz` após o deploy.

## Recursos sob demanda

- [Guia completo de subpath](references/full-guide.md): fluxo, exemplos e armadilhas.
- [Dockerfile template](templates/Dockerfile), [Nginx template](templates/nginx.conf.template) e
  [Ingress template](templates/ingress.yaml): pontos de partida para geração.

## Checklist de saída

- [ ] `base` tem trailing slash e o build gera assets no prefixo correto.
- [ ] Router usa `import.meta.env.BASE_URL` quando aplicável.
- [ ] Nginx usa `alias` e fallback de SPA.
- [ ] Dockerfile e Ingress usam o subpath solicitado.
- [ ] Não há links/assets absolutos que escapem do subpath.
- [ ] URL, asset, deep link e health check foram validados.
