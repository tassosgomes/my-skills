# Telemetria

Leia quando a tarefa for instrumentar o frontend ou capturar erro de produção.

## Princípio

Todo sinal existe para responder a uma pergunta de operação. Se ninguém consegue dizer qual pergunta
um span responde, ele é custo — de banda do usuário, de armazenamento e de ruído na busca.

O valor de tracing no frontend é **ligar a ação do usuário ao trace do backend**. Sem propagação
W3C, você tem dois conjuntos de dados que não se cruzam e o esforço não se paga.

## Stack

OpenTelemetry Web com exportador OTLP/HTTP. SDK 2.x — a API mudou em relação a exemplos da v1 que
ainda circulam:

| v1 (não use) | 2.x |
|---|---|
| `new Resource({...})` | `resourceFromAttributes({...})` |
| `provider.addSpanProcessor(p)` | `new WebTracerProvider({ spanProcessors: [p] })` |

```bash
npm i @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/sdk-trace-base \
      @opentelemetry/exporter-trace-otlp-http @opentelemetry/instrumentation \
      @opentelemetry/auto-instrumentations-web @opentelemetry/context-zone \
      @opentelemetry/resources @opentelemetry/semantic-conventions
```

## Setup

`src/lib/telemetry.ts`:

```ts
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

import { env } from '@/config/env';

export const initTelemetry = () => {
  if (!env.OTEL_ENDPOINT) return;

  const provider = new WebTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'frontend',
      [ATTR_SERVICE_VERSION]: __APP_VERSION__,
      'deployment.environment.name': import.meta.env.MODE,
    }),
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: env.OTEL_ENDPOINT }), {
        maxQueueSize: 100,
        maxExportBatchSize: 10,
        scheduledDelayMillis: 5000,
      }),
    ],
  });

  provider.register({ contextManager: new ZoneContextManager() });

  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          // Sem isso, o header traceparent não sai em requisição cross-origin
          // e o trace do frontend nunca encontra o do backend.
          propagateTraceHeaderCorsUrls: [new RegExp(env.API_URL)],
          clearTimingResources: true,
        },
        '@opentelemetry/instrumentation-user-interaction': {
          eventNames: ['click', 'submit'],
        },
      }),
    ],
  });
};
```

`__APP_VERSION__` vem de `define` no `vite.config.ts` — versão é imutável por build, então é
`import.meta.env`/`define`, não runtime config.

Inicialize em `main.tsx` **antes** de montar o React, e só quando houver endpoint. O endpoint vem de
`config/env.ts`, ou seja, ligar telemetria por ambiente não exige rebuild.

`ZoneContextManager` é o que mantém o contexto do span através de `await` e callback. Sem ele, todo
span assíncrono nasce órfão.

## Propagação para a API

O backend só junta os traces se `propagateTraceHeaderCorsUrls` casar com a URL da API **e** o
servidor liberar `traceparent` em `Access-Control-Allow-Headers`. Os dois lados, sempre. Falha de
CORS aqui é silenciosa: a requisição funciona, o trace é que fica partido.

## Span manual

Só quando a auto-instrumentação não cobre: uma operação de negócio com duração própria, um fluxo com
várias etapas que precisa ser medido ponta a ponta. Envolver um clique que já é capturado por
`instrumentation-user-interaction` é duplicar dado.

Encerre o span em `finally` e registre o erro com `recordException` + `setStatus`. Span que não
fecha vira leak e some do trace.

## Erros

- **Erro de render:** error boundary por rota ou área reporta e mostra fallback.
- **Erro não capturado:** listeners de `error` e `unhandledrejection` no boot.
- **Erro de API:** já tratado no interceptor do `api-client`; não reporte duas vezes.

Publique source maps no rastreador e **não** os sirva junto do bundle — stack trace legível é para a
sua equipe, não para quem abre o DevTools.

## Dados proibidos em atributo

Atributo de span vaza para o coletor, para o backend de tracing e para quem tem acesso a ele. Nunca
coloque: token, senha, cookie, `Authorization`, CPF, e-mail, telefone, cartão, endereço, nome
completo, ou o corpo de request/response.

O que entra no lugar: identificador opaco (`user.id` como hash ou UUID), rota **com o padrão** e não
com o valor (`/users/:id`, nunca `/users/12345678900`), status, duração, contagem.

Query string carrega parâmetro sensível com frequência; remova antes de virar atributo. Trate a
sanitização como função única e testada, não como cuidado repetido em cada chamada.
