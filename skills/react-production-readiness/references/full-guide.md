# Referência completa — Production Readiness React

> Leia sob demanda durante um gate de merge, release, deploy ou auditoria pré-produção.


# React Production Readiness (Vite + TypeScript)

Skill agregadora para validacao pre-producao.
Usada antes de: merge, deploy, geracao de build final.

Esta skill consolida verificacoes de todas as outras skills React em um checklist unificado.

---

# 1. Telemetria e Observabilidade

- [ ] OpenTelemetry inicializado apenas em producao (`import.meta.env.PROD`)
- [ ] service.name configurado (= nome da pasta do servico)
- [ ] Auto-instrumentacoes ativas (fetch, document-load, user-interaction)
- [ ] Propagacao W3C Trace Context funcionando para APIs
- [ ] Interceptor Axios/fetch propagando headers de trace
- [ ] Hook `useTracing` disponivel para spans customizados
- [ ] Tratamento global de erros (`error` + `unhandledrejection`)
- [ ] BatchSpanProcessor configurado (nao SimpleSpanProcessor)
- [ ] Endpoint OTLP configurado corretamente

---

# 2. Seguranca e Dados Sensiveis

- [ ] Nenhum dado sensivel logado (CPF, senhas, tokens, cartoes)
- [ ] Sanitizacao implementada para dados pessoais (`sanitize.ts`)
- [ ] Sem segredos hard-coded no codigo
- [ ] Template `runtime-env.template.js` nao contem valores reais
- [ ] Conformidade LGPD em atributos de span/trace

---

# 3. Configuracao Runtime (12-Factor)

- [ ] `public/runtime-env.template.js` existe com todas as chaves
- [ ] `index.html` carrega `runtime-env.js` antes do bundle
- [ ] `src/config/runtimeConfig.ts` centraliza acesso a configs
- [ ] Nenhuma URL de backend via `import.meta.env` ou hard-coded
- [ ] Defaults seguros para dev local em `runtimeConfig.ts`
- [ ] Uma unica imagem Docker para todos os ambientes

---

# 4. Container e Deploy

- [ ] Dockerfile multi-stage (Node build -> nginx:alpine runtime)
- [ ] `docker/40-runtime-env.sh` existe e e executavel
- [ ] Script valida env vars obrigatorias (falha cedo)
- [ ] `envsubst` gera `runtime-env.js` a partir do template
- [ ] Template removido apos geracao (nao exposto)
- [ ] Porta 80 exposta
- [ ] Documentacao lista todas as env vars por ambiente

---

# 5. Qualidade de Codigo

- [ ] TypeScript `strict: true` habilitado
- [ ] Nenhum `any` em codigo de producao
- [ ] Todo codigo em Ingles
- [ ] Componentes funcionais apenas (sem class components)
- [ ] Props tipadas com `interface` ou `type`
- [ ] Componentes com max ~300 linhas
- [ ] Sem imports relativos complexos (`../../../`)
- [ ] Path aliases configurados (@/)
- [ ] `useEffect` com cleanup quando necessario
- [ ] `useCallback`/`useMemo` com motivo documentado

---

# 6. Arquitetura

- [ ] Estrutura de pastas coerente (base, intermediaria ou feature-based)
- [ ] Componentes reutilizaveis em `shared/components` ou `components/ui`
- [ ] Logica de dominio em `features/*`
- [ ] `index.ts` como public API de cada feature
- [ ] Hooks genericos em `shared/hooks`
- [ ] Hooks de dominio em `features/*/hooks`

---

# 7. Testes

- [ ] Componentes principais tem testes
- [ ] Hooks de negocio tem testes separados
- [ ] Fluxos com API usam MSW (nao fetch real)
- [ ] Formularios tem pelo menos 1 teste sucesso + 1 erro
- [ ] Padrão AAA em todos os testes
- [ ] Queries semanticas (getByRole, getByLabelText)
- [ ] Cobertura minima >= 70%
- [ ] `npm run test` passa localmente

---

# 8. CI Pipeline

- [ ] `npm ci` para instalar dependencias
- [ ] `npm run lint` configurado (ESLint)
- [ ] `npm run type-check` configurado (`tsc --noEmit`)
- [ ] `npm run test:coverage` com gates de cobertura
- [ ] `npm run build` sem erros
- [ ] Pipeline falha em qualquer etapa com erro

---

# 9. Renderizacao e UX

- [ ] Sem renderizacao condicional com valores falsy perigosos
- [ ] Sem props drilling excessivo (>2 niveis)
- [ ] Estados de loading/error/empty tratados
- [ ] Mensagens de erro amigaveis na UI

---

# Resumo de Validacao

Antes de aprovar para producao, TODAS as secoes acima devem estar com checklist completo.

Prioridade de correcao:

1. **Critico**: Seguranca (dados sensiveis), Config Runtime, Container
2. **Alto**: Telemetria, CI Pipeline, Testes
3. **Medio**: Qualidade de Codigo, Arquitetura
4. **Baixo**: UX refinements, Code style (se ja funcional)
