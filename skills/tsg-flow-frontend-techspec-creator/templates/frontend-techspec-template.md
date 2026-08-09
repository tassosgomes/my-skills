# Template de Especificação Técnica — Frontend

> **PRD de origem:** `tasks/prd-[nome-funcionalidade]/prd.md`
> **API Contract (fonte de verdade):** `tasks/prd-[nome-funcionalidade]/api-contract.yaml`
> **TechSpec backend relacionada:** `tasks/prd-[nome-funcionalidade]/techspec.md` *(se existir)*
> **Data:** [YYYY-MM-DD]
> **Status:** [Rascunho | Em Revisão | Aprovado]

---

## Resumo Executivo

[Visão técnica em 1-2 parágrafos que cobre:]

- Stack escolhida (framework, fetching, estado, validação, testes)
- Estratégia de implementação
- **Trade-off primário da abordagem escolhida** (obrigatório — declarar explicitamente)

---

## Skills de Referência

[Skills consultadas na Phase 0 que embasaram as decisões desta TechSpec:]

| Skill | Caminho | Decisões Influenciadas |
|-------|---------|------------------------|
| `[framework]-architecture` | `[caminho]` | Estrutura de pastas, padrões |
| `[framework]-routing` | `[caminho]` | Roteamento, layout |
| `[fetching-lib]` | `[caminho]` | Estratégia de fetching, cache |
| `[state-lib]` | `[caminho]` | Gerenciamento de client state *(se aplicável)* |
| `[styling]` | `[caminho]` | Sistema de estilização |
| `[testing-frontend]` | `[caminho]` | Estratégia de testes |
| `accessibility` | `[caminho]` | Padrões de acessibilidade *(se aplicável)* |
| `i18n` | `[caminho]` | Internacionalização *(se aplicável)*  |

> Se nenhuma SKILL.md de frontend existir no projeto, declare aqui as decisões de stack tomadas
> e justifique cada uma.

---

## Mapeamento User Story → Tela → Endpoint

[Para cada user story do PRD, mapear telas/componentes e endpoints consumidos:]

| User Story | Tela / Componente | Endpoints do Contrato Consumidos |
|------------|-------------------|----------------------------------|
| US-01: [resumo] | `[NomeDaTela]` | `GET /v1/recursos`, `POST /v1/recursos` |
| US-02: [resumo] | `[NomeDoModal]` | `PATCH /v1/recursos/{id}` |

---

## Arquitetura de Frontend

### Estrutura de Pastas

[Estrutura proposta para a feature, respeitando convenções do projeto:]

```
src/
├── features/
│   └── [nome-feature]/
│       ├── components/        # Componentes específicos da feature
│       ├── hooks/             # Hooks de fetching e lógica
│       ├── pages/             # Páginas/rotas
│       ├── types/             # Tipos específicos (não gerados)
│       └── __tests__/         # Testes da feature
└── shared/
    └── api/
        └── generated/         # Tipos gerados do api-contract.yaml
```

### Roteamento

[Definir rotas e estrutura de layout:]

| Rota | Componente | Layout | Auth |
|------|------------|--------|:----:|
| `/[caminho]` | `[NomeDaPage]` | `[NomeDoLayout]` | ✅ |
| `/[caminho]/:id` | `[NomeDaPageDetalhe]` | `[NomeDoLayout]` | ✅ |

### Hierarquia de Componentes

[Diagrama ou lista hierárquica dos componentes principais:]

```
[NomeDaPage]
  ├── [Header]
  ├── [FilterBar]                   (controlled)
  ├── [ResourceList]
  │     └── [ResourceCard] (n)
  └── [Pagination]
```

---

## Geração de Tipos do API Contract

### Ferramenta Escolhida

- **Ferramenta:** [openapi-typescript | orval | kubb | outro]
- **Comando:** `[comando completo]`
- **Caminho de saída:** `[caminho/onde/serão/gerados/os/tipos]`
- **Estratégia de regeneração:** [manual | hook de pré-commit | step do CI]

### Exemplo de Configuração

```bash
# Comando de geração
npx openapi-typescript tasks/prd-[nome]/api-contract.yaml -o src/shared/api/generated/api.ts
```

### Tipos Gerados Reutilizados

[Quais tipos do contrato serão usados diretamente vs envelopados:]

| Schema do Contrato | Uso no Frontend |
|--------------------|-----------------|
| `[Recurso]` | Tipo direto em listagens e detalhes |
| `Criar[Recurso]Request` | Tipo do form state (com validação extra via Zod) |
| `[Recurso]ListResponse` | Retorno do hook `useResources()` |

---

## Estratégia de Fetching

### Biblioteca

- **Lib:** [React Query (TanStack Query) | SWR | RTK Query | Apollo | outra]
- **Versão:** [versão]

### Padrões de Hook

[Convenções para nomear e estruturar hooks de fetching:]

| Tipo de Operação | Padrão | Exemplo |
|------------------|--------|---------|
| Listagem | `useList<Resource>` | `useListPedidos(filtros)` |
| Detalhe | `useGet<Resource>` | `useGetPedido(id)` |
| Mutation create | `useCreate<Resource>` | `useCreatePedido()` |
| Mutation update | `useUpdate<Resource>` | `useUpdatePedido()` |
| Mutation delete | `useDelete<Resource>` | `useDeletePedido()` |

### Estratégia de Cache e Invalidação

- **Stale time padrão:** [tempo]
- **Cache time padrão:** [tempo]
- **Invalidação após mutation:** [estratégia — invalidate por queryKey, optimistic update, etc.]
- **Retry policy:** [tentativas + backoff]

### Tratamento Centralizado de Erros

[Mapeamento dos `code` do contrato para mensagens/comportamentos de UI:]

| code do contrato | Comportamento na UI |
|------------------|---------------------|
| `VALIDATION_ERROR` | Exibir erros por campo no formulário |
| `UNAUTHORIZED` | Redirecionar para login |
| `FORBIDDEN` | Toast de erro + redirect |
| `NOT_FOUND` | Página 404 ou empty state |
| `BUSINESS_RULE_VIOLATION` | Toast com `message` do erro |
| `INTERNAL_ERROR` | Toast genérico + log do `traceId` |

---

## Gerenciamento de Estado

### Server State

Gerenciado por: [lib de fetching escolhida acima]

### Client State

[Se aplicável — distinguir o que é client state vs URL state vs server state:]

| Estado | Onde Vive | Justificativa |
|--------|-----------|---------------|
| Filtros de listagem | URL (search params) | Compartilhável e persiste no refresh |
| Modal aberto/fechado | useState local | Efêmero, sem necessidade de persistência |
| Carrinho (se houver) | [Zustand/Context] | Compartilhado entre rotas |
| Tema | [Lib de tema] | Global e persistente |

---

## Validação de Formulários

### Biblioteca

- **Form lib:** [react-hook-form | formik | outro]
- **Schema validation:** [zod | yup | joi | outro]

### Sincronização com Contract

[Como manter validação alinhada ao contrato:]

- **Estratégia:** [reutilizar tipos gerados + camada de validação adicional para regras de negócio]
- **Validações reaproveitadas do contrato:** [obrigatoriedade, tipos, formatos, enums]
- **Validações adicionais (regras de negócio do PRD):** [listar]

### Exemplo de Schema

```ts
// Pseudo-código — substituir pela sintaxe real
const CriarPedidoSchema = z.object({
  // Campos do contrato
  cliente_id: z.string().uuid(),
  itens: z.array(z.object({
    produto_id: z.string().uuid(),
    quantidade: z.number().int().min(1)
  })).min(1),
  // Validações adicionais (regras do PRD)
  observacoes: z.string().max(500).optional()
});
```

---

## Mocks e Ambiente de Desenvolvimento

### Estratégia

- **Durante dev (sem backend):** [Prism do contrato | MSW | json-server]
- **Durante testes:** [MSW | Prism | mock factory]

### Comandos

```bash
# Subir mock server do contrato
npx @stoplight/prism-cli mock tasks/prd-[nome]/api-contract.yaml
# Mock disponível em http://localhost:4010

# Apontar frontend para o mock
VITE_API_URL=http://localhost:4010 npm run dev
```

### Configuração de MSW *(se aplicável)*

- Local dos handlers: `src/mocks/handlers/`
- Estratégia: handlers gerados a partir do contrato com `@mswjs/source`
- Setup: `src/mocks/setup.ts` ativado em modo de teste

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Skills Aplicáveis | Descrição |
|---------|------|-------------------|-----------|
| `src/features/[nome]/pages/[NomeDaPage].tsx` | Page | `[framework]-architecture` | Página principal da feature |
| `src/features/[nome]/components/[Nome].tsx` | Component | `[framework]-architecture`, `accessibility` | Componente apresentacional |
| `src/features/[nome]/hooks/use[Resource].ts` | Hook (server state) | `[fetching-lib]` | Hook de fetching |
| `src/features/[nome]/hooks/use[Form].ts` | Hook (form) | `[form-lib]` | Hook do formulário |
| `src/features/[nome]/types/index.ts` | Types | — | Tipos específicos da feature |
| `src/shared/api/generated/api.ts` | Types (gerado) | — | Tipos gerados do contrato |
| `src/features/[nome]/__tests__/[Nome].test.tsx` | Test (unit) | `[testing-frontend]` | Testes unitários |
| `e2e/[nome].spec.ts` | Test (e2e) | `[e2e-tool]` | Teste end-to-end |
| `src/mocks/handlers/[nome].ts` | Mock | — | Handlers MSW *(se aplicável)* |

### Arquivos a Modificar

| Caminho | Skills Aplicáveis | Alteração |
|---------|-------------------|-----------|
| `src/router/index.tsx` | `[framework]-routing` | Registrar novas rotas |
| `src/shared/api/error-mapping.ts` | — | Adicionar mapeamentos de erro específicos *(se houver)* |
| `package.json` | — | Script de geração de tipos |
| `.env.example` | — | Documentar novas variáveis |

### Arquivos de Referência (não alterar)

| Caminho | Motivo da Consulta |
|---------|-------------------|
| `src/shared/components/[BaseComponent].tsx` | Padrão a seguir para criar novos componentes |
| `src/shared/api/client.ts` | Cliente HTTP base a ser usado pelos hooks |

---

## Acessibilidade

[Requisitos de acessibilidade aplicáveis:]

- **Padrão:** [WCAG 2.1 AA | outro]
- **Navegação por teclado:** [requisitos]
- **Screen readers:** [labels, ARIA, regiões]
- **Contraste:** [seguir design tokens]
- **Foco visível:** [obrigatório em todos os interativos]

---

## Internacionalização *(se aplicável)*

- **Lib:** [i18next | react-intl | outro]
- **Idiomas suportados:** [lista, do Vision Doc se houver]
- **Estratégia de chaves:** [namespace por feature]
- **Pluralização e formatos:** [datas, moedas, números]

---

## Análise de Impacto

[Componentes e áreas afetadas pela implementação:]

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|--------------------|-----------------|-------------------|----------------|
| Roteamento principal | Modificado | Adicionar rotas | Atualizar router config |
| Cliente HTTP base | Referência | Reutilizado | Nenhuma |
| Design system | Referência | Reutilizar componentes | Nenhuma |
| [outros] | [tipo] | [descrição] | [ação] |

---

## Abordagem de Testes

### Testes Unitários

- **Lib:** [Vitest | Jest]
- **Componentes a testar:** [hooks de fetching, validações de formulário, transformações de dados]
- **Mocks:** [MSW para network, sem mock de implementação]
- **Cobertura esperada:** [% mínima — geralmente 70%+ para hooks e utils]

### Testes de Integração

- **Lib:** [Testing Library + MSW]
- **Cenários a cobrir:** [fluxos completos de tela: render → interação → fetching → assertion]

### Testes E2E

- **Lib:** [Playwright | Cypress]
- **Cenários críticos:** [happy path de cada user story do PRD]
- **Ambiente:** [Prism mock + frontend buildado]

### Testes de Contrato

- **Estratégia:** [validar que tipos gerados estão atualizados via CI]
- **Comando:** [comando de check]

---

## Sequenciamento de Desenvolvimento

### Build Order

1. **Configurar geração de tipos** a partir do contrato — sem dependências
2. **Tipos gerados** — depende de 1
3. **Cliente HTTP / hooks de fetching base** (se não existirem) — depende de 2
4. **Hooks específicos da feature** (`useListResource`, `useGetResource` etc.) — depende de 3
5. **Componentes apresentacionais** (sem lógica de fetching) — sem dependências (paralelizável)
6. **Páginas integrando hooks + componentes** — depende de 4 e 5
7. **Configuração de mocks (MSW)** — depende de 2
8. **Testes unitários e de integração** — depende de 4, 5 e 7
9. **Roteamento** (registrar a página) — depende de 6
10. **Testes E2E** — depende de 9 e mock server (Prism)

### Dependências Técnicas Bloqueantes

- API Contract aprovado e versionado *(pré-requisito absoluto)*
- Design system / componentes base disponíveis
- Sistema de roteamento configurado
- Variáveis de ambiente para apontar para mock vs backend real

---

## Performance

[Considerações de performance aplicáveis:]

- **Code splitting:** [estratégia — lazy loading de rotas, dynamic imports]
- **Bundle size:** [orçamento aceitável + ferramenta de monitoramento]
- **Renderização:** [memoização onde fizer sentido — sem premature optimization]
- **Imagens:** [estratégia de otimização]
- **Fetching:** [prefetch, parallel queries, suspense se aplicável]

---

## Considerações Técnicas

### Decisões Principais

[Escolhas técnicas significativas com racional:]

- **Decisão:** [o que foi escolhido]
- **Racional:** [por que esta opção]
- **Trade-offs:** [o que se abriu mão]
- **Alternativas rejeitadas:** [o que mais foi considerado e por que não]

### Riscos Conhecidos

- Descrição do risco
- Estratégia de mitigação

### Conformidade com Skills

| Decisão | Skill de Referência | Conforme? |
|---------|---------------------|:---------:|
| [decisão] | `[skill]` | ✅ |
| [decisão] | `[skill]` | ⚠️ Desvio: [justificativa] |

---

## Questões em Aberto

- [ ] [Questão 1]
- [ ] **Conflito identificado com o API Contract?** Listar aqui.
- [ ] [Mudanças sugeridas no contrato — instruir uso de `tsg-flow-contract-creator` em modo update]

---

## Architecture Decision Records

[ADRs criadas durante o processo de design (numeração compartilhada com backend):]

### Herdadas (criadas em fases anteriores)

- [ADR-001: Título](adrs/adr-001.md) — Resumo (origem: PRD)
- [ADR-002: Título](adrs/adr-002.md) — Resumo (origem: TechSpec backend)

### Criadas nesta sessão (frontend)

- [ADR-NNN: Título](adrs/adr-NNN.md) — Resumo da decisão de frontend
- [ADR-NNN+1: Título](adrs/adr-NNN+1.md) — Resumo da decisão de frontend

---

## Próximos Passos

1. **Implementação:** Use a skill `tsg-flow-task-creator` referenciando este `frontend-techspec.md` para
   gerar as tarefas
2. **Geração de tipos:**
   ```bash
   [comando de geração de tipos]
   ```
3. **Mock server para dev:**
   ```bash
   npx @stoplight/prism-cli mock tasks/prd-[nome]/api-contract.yaml
   ```
4. **Validação:** Itens de "Questões em Aberto" devem ser resolvidos antes ou durante a
   implementação. Conflitos com o API Contract requerem `tsg-flow-contract-creator` em modo update.
