---
name: dotnet-production-readiness
description: "Use somente antes de merge/release/deploy, em auditoria pré-produção ou quando o usuário pedir um readiness gate completo para .NET. Não acione para configurar um único log, health check, teste ou query."
metadata:
  group: dotnet
---

# Production Readiness .NET

Esta skill é o gate agregado de prontidão. Ela não substitui as skills de observabilidade,
performance ou testes: chama a atenção para os requisitos de produção e carrega referências
detalhadas somente quando o gate estiver realmente no escopo.

## Gate mínimo

- **Telemetria:** OpenTelemetry/OTLP, `service.name`, tracing e métricas configurados conforme o
  ambiente.
- **Logs:** JSON estruturado, templates (sem interpolação insegura), correlação por TraceId e
  sanitização de CPF, e-mail, telefone, tokens, secrets e dados sensíveis.
- **Health:** liveness/readiness/startup e dependências críticas configurados para o orquestrador.
- **Resiliência:** timeout, retry/circuit breaker compatíveis com idempotência e graceful shutdown.
- **Configuração:** secrets fora do repositório, variáveis documentadas e configuração de runtime
  adequada ao ambiente.
- **Entrega:** type-check/lint/test/build, Dockerfile multi-stage quando aplicável, migrations,
  smoke test pós-deploy e estratégia de rollback.
- **Segurança operacional:** autenticação/autorização, HTTPS, CORS, rate limiting e validação de
  entrada revisados conforme o serviço.

## Limites com outras skills

- Use `dotnet-observability` para implementar ou corrigir um sinal específico.
- Use `dotnet-performance` para investigar e medir gargalos.
- Use `dotnet-testing` para escrever ou diagnosticar testes.
- Aqui, apenas verifique se esses controles necessários ao deploy existem e estão integrados.

## Referência sob demanda

Leia [a referência completa de readiness](references/full-guide.md) durante um gate de release,
auditoria ou revisão pré-produção. Não a carregue em tarefas rotineiras.

## Checklist de saída

- [ ] Build, lint/type-check e testes relevantes passaram.
- [ ] Logs, traces, métricas e health probes estão configurados para o ambiente alvo.
- [ ] Dados sensíveis não aparecem em logs, payloads de erro ou evidências.
- [ ] Secrets e connection strings não estão versionados.
- [ ] Resiliência, migrations, smoke test e rollback estão definidos.
- [ ] Falhas bloqueantes têm evidência e responsável pela correção.
