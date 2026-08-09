---
name: dotnet-observability
description: "Use quando a tarefa implementa ou altera health checks, liveness/readiness/startup probes, logging correlacionado, ActivitySource, métricas ou telemetria .NET. Não use para o checklist completo de deploy nem para uma investigação de performance isolada."
metadata:
  group: dotnet
---

# Observabilidade .NET

Esta skill trata da instrumentação e dos sinais operacionais do serviço. O gate de produção fica
em `dotnet-production-readiness`; tuning de latência, queries ou cache fica em
`dotnet-performance`.

## Regras normativas

- Use OpenTelemetry como padrão de tracing/telemetria e propague `TraceId`/`SpanId` quando houver
  contexto.
- Use logging estruturado com scopes; inclua contexto operacional sem registrar secrets, tokens,
  credenciais ou dados pessoais desnecessários.
- Crie `ActivitySource`/spans para operações críticas, registre atributos e exceções e encerre
  spans de forma garantida.
- Exponha health checks separados por intenção: liveness não depende de serviços externos,
  readiness verifica dependências necessárias para receber tráfego e startup cobre inicialização.
- Use tags, timeouts e status `Healthy`/`Degraded`/`Unhealthy` coerentes com a dependência.
- PostgreSQL é o exemplo padrão; Oracle só é alternativa para serviços que realmente o utilizam.
- Ajuste níveis e exportadores por ambiente; não use configuração de desenvolvimento como padrão
  de produção.

## Roteamento sob demanda

Para configurações completas, leia apenas [a referência de observabilidade](references/full-guide.md).
Ela contém exemplos de health checks, Kubernetes, scopes, logging, tracing e checklist. Não a
carregue para uma tarefa que apenas revisa uma query ou valida um deploy.

## Checklist do diff

- [ ] O sinal implementado responde a uma pergunta operacional clara.
- [ ] Liveness, readiness e startup não foram misturados.
- [ ] Health checks têm tags, timeout e status apropriados.
- [ ] Logs são estruturados e correlacionáveis sem dados sensíveis.
- [ ] Spans são encerrados e exceções são registradas com contexto seguro.
- [ ] Métricas e exportadores respeitam o ambiente.
- [ ] O endpoint e o comportamento esperado estão cobertos por teste focado.
