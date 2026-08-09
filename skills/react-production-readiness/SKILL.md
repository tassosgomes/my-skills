---
name: react-production-readiness
description: "Use somente antes de merge, release, deploy ou auditoria pré-produção de um frontend React + Vite + TypeScript, quando o usuário pedir um readiness gate completo. Não acione para configurar isoladamente um log, teste, container, runtime config ou subpath."
metadata:
  group: react
---

# Production Readiness React

Este é o gate agregado: verifica se os controles necessários estão integrados para o ambiente alvo.
Não substitui as skills especializadas nem deve bloquear uma alteração local por itens irrelevantes.

## Gate mínimo

- **Observabilidade:** OpenTelemetry em produção, propagação W3C, captura de erros, sanitização e
  exportação configurada.
- **Runtime e segurança:** `runtime-env.js` carregado antes do bundle, sem URLs de backend vindas
  de `import.meta.env`, sem secrets no código e com uma imagem para todos os ambientes.
- **Container/deploy:** Dockerfile multi-stage, entrypoint que falha cedo, configuração Nginx,
  probes e documentação das variáveis; valide subpath quando o app não roda na raiz.
- **Qualidade/arquitetura:** strict TypeScript, sem `any`, componentes funcionais, aliases,
  fronteiras de feature e tratamento de estados/erros.
- **Testes/CI:** unitários e integração com MSW quando há API, E2E para fluxos críticos, lint,
  type-check, testes, cobertura conforme baseline e build aprovados.

## Limites com outras skills

- `react-observability` implementa sinais.
- `react-runtime-config` implementa configuração em runtime e container.
- `react-subpath-deploy` implementa base path, Router, Nginx e Ingress fora da raiz.
- `react-testing` cria ou diagnostica testes.
- `react-architecture` e `react-code-quality` corrigem estrutura e código.

## Referência sob demanda

Leia [a referência completa de readiness](references/full-guide.md) durante o gate de release,
auditoria ou revisão pré-produção; carregue somente as seções aplicáveis ao ambiente.

## Checklist de saída

- [ ] Build, lint, type-check, testes e gates de cobertura passaram.
- [ ] Observabilidade e sanitização estão prontas para o ambiente alvo.
- [ ] Runtime, secrets, container, probes e rollback estão definidos.
- [ ] Arquitetura, UX e tratamento de erros não têm bloqueios conhecidos.
- [ ] Exceções bloqueantes têm evidência e responsável.
