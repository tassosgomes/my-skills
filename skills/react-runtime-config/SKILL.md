---
name: react-runtime-config
description: "Use quando uma tarefa React + Vite altera configuração entre ambientes, Dockerfile, pipeline ou containerização sem rebuild: runtime-env.template.js, envsubst, window.RUNTIME_ENV, runtimeConfig.ts, Nginx ou entrypoint. Não use para subpath/base path específico nem para um readiness gate completo."
metadata:
  group: react
---

# Runtime Config React / 12-Factor

Use esta skill quando a configuração deve mudar no start do container, não no build. O objetivo é
uma imagem imutável compartilhada entre dev, homologação e produção.

## Regras não negociáveis

- URLs de backend e configurações que variam entre ambientes não podem vir de `import.meta.env` ou
  ficar hard-coded no bundle; flags de build invariantes são a exceção.
- Toda variável dinâmica passa por `public/runtime-env.template.js`,
  `src/config/runtimeConfig.ts` e `docker/40-runtime-env.sh`.
- `index.html` carrega `runtime-env.js` antes do bundle; nunca exponha o template gerado.
- `window.RUNTIME_ENV` é a fonte única e deve ser lida por um módulo tipado, com defaults seguros
  apenas para desenvolvimento local.
- O entrypoint deve usar `envsubst` com allowlist, validar variáveis obrigatórias e falhar cedo.
- O Dockerfile usa build multi-stage Node -> Nginx; a imagem final contém somente o artefato e o
  runtime necessário.
- Não versione secrets nem valores reais no template, no código ou na documentação de exemplo.

## Limites

- Para `base`/`basename`/Ingress em um subpath, use `react-subpath-deploy`.
- Para o gate completo de entrega, use `react-production-readiness`.

## Referência sob demanda

Leia [o guia completo de runtime](references/full-guide.md) para o template, `runtimeConfig.ts`,
entrypoint, Dockerfile ou configuração por ambiente que o diff realmente altera.

## Checklist do diff

- [ ] A mesma imagem funciona nos ambientes previstos.
- [ ] Template, módulo tipado e entrypoint têm as mesmas chaves.
- [ ] `runtime-env.js` é carregado antes do bundle e o template não fica público.
- [ ] Variáveis obrigatórias são validadas e o processo falha cedo.
- [ ] Não há URL de backend em `import.meta.env` ou secret versionado.
- [ ] Build multi-stage e runtime Nginx permanecem reproduzíveis.
