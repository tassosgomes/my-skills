# Referência completa — Observabilidade React

> Leia sob demanda para OpenTelemetry Web, propagação W3C, tracing customizado, erros globais e sanitização.

## Conteúdo

- Princípios, dependências e configuração OpenTelemetry
- Instrumentação Axios e hook `useTracing`
- Erros globais, boas práticas e dados proibidos
- Sanitização, estrutura de arquivos e checklist


# React Telemetry & Observability (OpenTelemetry Web)

Documento normativo para telemetria e tracing no frontend React.
Skill critica — deve ser executada como auditoria automatica.

---

# 1. Principios

- Telemetria habilitada **apenas em producao** (`import.meta.env.PROD`)
- Traces propagados para APIs via headers (W3C Trace Context)
- O **service.name** deve ser o nome da pasta do servico (ex: `frontend`)
- Erros JavaScript nao tratados devem ser capturados automaticamente
- **Nunca** logar dados sensiveis (CPF, senhas, tokens, cartoes)

---

# 2. Dependencias

```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-trace-web \
            @opentelemetry/instrumentation-fetch \
            @opentelemetry/instrumentation-document-load \
            @opentelemetry/instrumentation-user-interaction \
            @opentelemetry/exporter-trace-otlp-http \
            @opentelemetry/context-zone \
            @opentelemetry/auto-instrumentations-web \
            @opentelemetry/resources \
            @opentelemetry/semantic-conventions
```

---

# 3. Configuracao OpenTelemetry

## 3.1 Arquivo de Telemetria

Criar `src/telemetry/index.ts`:

```typescript
import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { getWebAutoInstrumentations } from '@opentelemetry/auto-instrumentations-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { 
  ATTR_SERVICE_NAME, 
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT 
} from '@opentelemetry/semantic-conventions';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ZoneContextManager } from '@opentelemetry/context-zone';

const SERVICE_NAME = 'frontend';
const SERVICE_VERSION = '1.0.0';
const OTEL_ENDPOINT = 'https://otel.example.com/v1/traces';

export function initTelemetry(): void {
  const provider = new WebTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      [ATTR_DEPLOYMENT_ENVIRONMENT]: import.meta.env.MODE || 'development',
    }),
  });

  const exporter = new OTLPTraceExporter({
    url: OTEL_ENDPOINT,
  });

  provider.addSpanProcessor(
    new BatchSpanProcessor(exporter, {
      maxQueueSize: 100,
      maxExportBatchSize: 10,
      scheduledDelayMillis: 5000,
    })
  );

  provider.register({
    contextManager: new ZoneContextManager(),
  });

  registerInstrumentations({
    instrumentations: [
      getWebAutoInstrumentations({
        '@opentelemetry/instrumentation-fetch': {
          propagateTraceHeaderCorsUrls: [
            /https:\/\/.*\.example\.com.*/,
          ],
          clearTimingResources: true,
          applyCustomAttributesOnSpan: (span, request, result) => {
            if (result instanceof Response) {
              span.setAttribute('http.response.status_text', result.statusText);
            }
          },
        },
        '@opentelemetry/instrumentation-document-load': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-user-interaction': {
          enabled: true,
          eventNames: ['click', 'submit'],
        },
      }),
    ],
  });

  console.log('OpenTelemetry initialized:', SERVICE_NAME, SERVICE_VERSION);
}
```

## 3.2 Inicializacao no Entry Point

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initTelemetry } from './telemetry';
import { setupGlobalErrorHandling } from './telemetry/errorHandler';
import './index.css';

// Inicializar telemetria ANTES do React (apenas producao)
if (import.meta.env.PROD) {
  initTelemetry();
  setupGlobalErrorHandling();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

# 4. Instrumentacao Axios

Adicionar interceptors para propagar contexto de trace em requests Axios.

```typescript
// src/lib/api.ts
import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { trace, context, propagation } from '@opentelemetry/api';

const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 30000,
});

// Interceptor para propagar trace context
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (import.meta.env.PROD) {
    const activeContext = context.active();
    const headers: Record<string, string> = {};
    
    propagation.inject(activeContext, headers);
    
    Object.entries(headers).forEach(([key, value]) => {
      config.headers.set(key, value);
    });
  }
  
  return config;
});

// Interceptor para logging de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.PROD) {
      const tracer = trace.getTracer('frontend');
      const span = tracer.startSpan('axios-error');
      
      span.setAttribute('error.type', error.name);
      span.setAttribute('error.message', error.message);
      
      if (error.response) {
        span.setAttribute('http.status_code', error.response.status);
        span.setAttribute('http.url', error.config?.url || '');
      }
      
      span.recordException(error);
      span.end();
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

---

# 5. Hook de Tracing

Criar `src/hooks/useTracing.ts`:

```typescript
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';
import { useEffect, useCallback, useRef } from 'react';

const tracer = trace.getTracer('frontend');

interface TraceOptions {
  attributes?: Record<string, string | number | boolean>;
}

export function useTracing(componentName: string) {
  const mountSpanRef = useRef<Span | null>(null);

  useEffect(() => {
    if (import.meta.env.PROD) {
      mountSpanRef.current = tracer.startSpan(`${componentName}-mount`);
    }
    
    return () => {
      mountSpanRef.current?.end();
    };
  }, [componentName]);

  const traceAction = useCallback(
    async <T>(
      actionName: string,
      callback: () => T | Promise<T>,
      options: TraceOptions = {}
    ): Promise<T> => {
      if (!import.meta.env.PROD) {
        return callback();
      }

      const span = tracer.startSpan(`${componentName}-${actionName}`);
      
      if (options.attributes) {
        Object.entries(options.attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }

      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await callback();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({ 
            code: SpanStatusCode.ERROR, 
            message: error instanceof Error ? error.message : 'Unknown error' 
          });
          span.recordException(error as Error);
          throw error;
        } finally {
          span.end();
        }
      });
    },
    [componentName]
  );

  return { traceAction };
}
```

### Exemplo de Uso

```typescript
import { useState } from 'react';
import { useTracing } from '@/hooks/useTracing';
import api from '@/lib/api';

export function LeadForm() {
  const [loading, setLoading] = useState(false);
  const { traceAction } = useTracing('LeadForm');

  const handleSubmit = async (data: Lead) => {
    setLoading(true);
    
    try {
      await traceAction(
        'create-lead',
        async () => {
          const response = await api.post('/api/leads', data);
          return response.data;
        },
        {
          attributes: {
            'lead.source': 'web-form',
            'lead.has_email': Boolean(data.email),
          },
        }
      );
    } catch (error) {
      console.error('Erro ao criar lead:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ... */}
    </form>
  );
}
```

---

# 6. Tratamento Global de Erros

Criar `src/telemetry/errorHandler.ts`:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('frontend');

export function setupGlobalErrorHandling(): void {
  // Erros sincronos nao tratados
  window.addEventListener('error', (event: ErrorEvent) => {
    const span = tracer.startSpan('unhandled-error');
    
    span.setAttribute('error.type', 'unhandled');
    span.setAttribute('error.message', event.message);
    span.setAttribute('error.filename', event.filename || 'unknown');
    span.setAttribute('error.lineno', event.lineno || 0);
    span.setAttribute('error.colno', event.colno || 0);
    
    if (event.error) {
      span.recordException(event.error);
    }
    
    span.setStatus({ code: SpanStatusCode.ERROR, message: event.message });
    span.end();
  });

  // Promises rejeitadas nao tratadas
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const span = tracer.startSpan('unhandled-promise-rejection');
    
    span.setAttribute('error.type', 'unhandled-promise');
    
    if (event.reason instanceof Error) {
      span.setAttribute('error.message', event.reason.message);
      span.setAttribute('error.name', event.reason.name);
      span.recordException(event.reason);
    } else {
      span.setAttribute('error.reason', String(event.reason));
    }
    
    span.setStatus({ code: SpanStatusCode.ERROR });
    span.end();
  });
}
```

---

# 7. Boas Praticas

## CORRETO

```typescript
// Use o hook useTracing para acoes importantes
const { traceAction } = useTracing('CheckoutPage');

await traceAction('submit-order', async () => {
  await api.post('/orders', orderData);
}, {
  attributes: {
    'order.items_count': orderData.items.length,
    'order.total': orderData.total,
  },
});

// Adicione atributos relevantes ao contexto
span.setAttribute('user.authenticated', isAuthenticated);
span.setAttribute('page.name', 'checkout');

// Capture erros com contexto
try {
  await riskyOperation();
} catch (error) {
  span.recordException(error as Error);
  span.setStatus({ code: SpanStatusCode.ERROR });
  throw error;
}
```

## INCORRETO

```typescript
// NAO trace operacoes triviais
await traceAction('button-hover', () => {}); // Desnecessario

// NAO logue dados sensiveis nos atributos
span.setAttribute('user.password', password); // PROIBIDO
span.setAttribute('user.cpf', cpf); // PROIBIDO

// NAO esqueca de finalizar spans manuais
const span = tracer.startSpan('operation');
// ... codigo que pode lancar excecao
span.end(); // Pode nao ser chamado!

// CORRETO: use try/finally
const span = tracer.startSpan('operation');
try {
  // ...
} finally {
  span.end();
}

// NAO habilite telemetria em desenvolvimento
if (true) { // ERRADO
  initTelemetry();
}
```

---

# 8. Dados Proibidos em Atributos

| Tipo | Exemplos | Motivo |
|------|----------|--------|
| **Credenciais** | Senhas, tokens | Seguranca |
| **Dados pessoais** | CPF, endereco | LGPD |
| **Dados de pagamento** | Numero cartao, CVV | PCI-DSS |
| **Entrada de formularios** | Campos sensiveis | Privacidade |

## Sanitizacao de Dados

```typescript
// src/utils/sanitize.ts
export const sanitize = {
  email: (email: string): string => {
    if (!email || !email.includes('@')) return '***';
    const [local, domain] = email.split('@');
    return `${local.slice(0, 2)}***@${domain}`;
  },
  
  cpf: (cpf: string): string => {
    if (!cpf || cpf.length < 11) return '***';
    return `${cpf.slice(0, 3)}.***.***-${cpf.slice(-2)}`;
  },
  
  phone: (phone: string): string => {
    if (!phone || phone.length < 4) return '***';
    return `(**) *****-${phone.slice(-4)}`;
  },
};

// Uso em atributos de span
span.setAttribute('lead.email', sanitize.email(lead.email));
```

---

# 9. Estrutura de Arquivos

```
src/
  telemetry/
    index.ts           # Inicializacao OpenTelemetry
    errorHandler.ts    # Tratamento global de erros
  hooks/
    useTracing.ts      # Hook para traces em componentes
  lib/
    api.ts             # Axios com interceptors
  utils/
    sanitize.ts        # Sanitizacao de dados sensiveis
  main.tsx             # Entry point com inicializacao
```

---

# 10. Checklist

- [ ] OpenTelemetry inicializado apenas em producao
- [ ] service.name configurado (= nome da pasta do servico)
- [ ] Auto-instrumentacoes configuradas (fetch, document-load, user-interaction)
- [ ] Propagacao W3C Trace Context funcionando para APIs
- [ ] Interceptor Axios propagando headers de trace
- [ ] Hook `useTracing` disponivel para spans customizados
- [ ] Tratamento global de erros (`error` + `unhandledrejection`)
- [ ] Nenhum dado sensivel logado (CPF, senhas, tokens, cartoes)
- [ ] Sanitizacao implementada para dados pessoais
- [ ] BatchSpanProcessor configurado (nao SimpleSpanProcessor)
