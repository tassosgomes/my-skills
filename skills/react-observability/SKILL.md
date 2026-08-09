---
name: react-observability
description: "Use quando a tarefa implementa ou altera telemetria React + TypeScript: OpenTelemetry Web, tracing, propagação W3C para APIs, spans customizados, captura global de erros, métricas ou sanitização de dados. Não use para o readiness gate completo nem para tuning de performance isolado."
metadata:
  group: react
---

# Observabilidade React

Use esta skill para instrumentar sinais operacionais do frontend. Telemetria deve responder a uma
pergunta de operação e permanecer segura; o gate agregado fica em `react-production-readiness`.

## Regras não negociáveis

- Inicialize telemetria somente em produção (`import.meta.env.PROD`); flags de build não substituem
  configuração operacional de runtime.
- Use OpenTelemetry Web com `service.name`, `BatchSpanProcessor` e exportador OTLP configurado para
  o ambiente alvo.
- Propague W3C Trace Context em `fetch`/Axios e crie spans customizados apenas para fluxos
  relevantes, encerrando-os em `finally`.
- Capture `error` e `unhandledrejection` globalmente sem transformar o navegador em fonte de
  dados sensíveis.
- Nunca registre senhas, tokens, cartões, CPF, dados médicos, payloads sensíveis ou identificadores
  pessoais sem sanitização; aplique LGPD/PCI-DSS ao log e aos atributos de span.
- Mantenha `service.name`, endpoint OTLP, instrumentações e níveis separados por ambiente.

## Limites com outras skills

- Use `react-production-readiness` apenas para verificar integração no release.
- Use `react-runtime-config` para URLs e configurações dinâmicas entre ambientes.
- Use `react-code-quality` para a revisão geral do código.

## Referência sob demanda

Leia [o guia completo de observabilidade](references/full-guide.md) somente para o sinal alterado:
OpenTelemetry, interceptors, `useTracing`, erros globais ou sanitização.

## Checklist do diff

- [ ] Telemetria fica desabilitada fora de produção.
- [ ] Traces propagam W3C e spans sempre terminam.
- [ ] Erros globais são capturados sem duplicação ou vazamento.
- [ ] Atributos e logs foram sanitizados.
- [ ] Exportação, instrumentações e `service.name` são configuráveis por ambiente.
- [ ] O volume e a cardinalidade da telemetria são justificáveis.
