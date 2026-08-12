---
name: tsg-flow-contract-creator
description: >
  Cria API Contracts (OpenAPI 3.1) como ponto de sincronização entre frontend e backend,
  a partir de um PRD existente. Use esta skill sempre que o usuário quiser definir o contrato
  de API, gerar OpenAPI spec, criar API-first design, sincronizar front e back, ou quando
  mencionar "contrato de API", "OpenAPI", "swagger", "API-first", "schema da API",
  "endpoints da API". Também dispare quando o usuário disser "vamos definir a API antes de
  implementar", "o front e o back não se encaixam", "quero mockar a API", "preciso do contrato
  antes de começar o frontend". Esta skill é a etapa 1.5 do pipeline PRD → API Contract →
  TechSpec (Backend) → TechSpec (Frontend) → Tasks. Requer que o PRD já exista em
  `tasks/prd-[nome-funcionalidade]/prd.md`.
metadata:
  group: tsg-flow
  pipeline_stage: contract
  consumed_by:
    - planning
  requires:
    - "tasks/prd-[slug]/prd.md"
  produces:
    - "tasks/prd-[slug]/api-contract.yaml"
    - "tasks/prd-[slug]/api-contract.md"
---

# API Contract Creator

Gera um API Contract em OpenAPI 3.1 como **ponto de sincronização obrigatório** entre backend e frontend. O contrato é a fonte da verdade — nenhum lado começa a implementar antes dele estar aprovado.

## Por que esta etapa existe

Em sistemas grandes, PRDs que cobrem front e back juntos geram desalinhamentos: o frontend assume uma estrutura de resposta, o backend entrega outra, e a integração quebra. Esta skill resolve isso antes que aconteça.

```
PRD (O QUÊ)
    ↓
[VOCÊ ESTÁ AQUI] API Contract (OpenAPI 3.1)  ← ponto de sincronização
    ↓                        ↓
TechSpec Backend      TechSpec Frontend
    ↓                        ↓
Tasks Backend         Tasks Frontend
    ↓                        ↓
              Integração (sem surpresas)
```

## Entradas e Saídas

- **PRD requerido:** `tasks/prd-[nome-funcionalidade]/prd.md`
- **Contrato de saída (YAML):** `tasks/prd-[nome-funcionalidade]/api-contract.yaml`
- **Contrato de saída (Markdown legível):** `tasks/prd-[nome-funcionalidade]/api-contract.md`

## Fluxo de Trabalho

### 1. Ler e Analisar o PRD (Obrigatório)

- Confirmar que `tasks/prd-[nome-funcionalidade]/prd.md` existe
- Extrair: user stories, requisitos funcionais, entidades de domínio, fluxos principais
- Identificar: quais dados o frontend precisa exibir, quais ações o usuário executa, quais regras de negócio existem

### 2. Esclarecer Dúvidas de Contrato (Obrigatório — não pule)

Antes de gerar qualquer endpoint, pergunte sobre pontos críticos não cobertos pelo PRD:

**Autenticação e Autorização**
- Qual mecanismo? (JWT Bearer, API Key, OAuth2, sessão)
- Endpoints públicos vs autenticados?
- Há níveis de permissão (roles)?

**Paginação e Filtros**
- Padrão de paginação preferido? (cursor, offset/limit, page/size)
- Quais campos são filtráveis/ordenáveis nas listagens?

**Formato de Erros**
- Há um padrão de error response já definido no projeto?
- Campos esperados: `code`, `message`, `details`, `traceId`?

**Versionamento**
- Prefixo de versão? (`/v1/`, `/api/v1/`, sem versão?)
- Estratégia para breaking changes?

**Padrões de Nomenclatura**
- `camelCase` ou `snake_case` nos campos JSON?
- Singular ou plural nos paths? (`/user` ou `/users`)

**Casos Especiais**
- Há uploads de arquivo? (multipart/form-data)
- Há webhooks ou eventos de saída?
- Há endpoints de saúde/métricas expostos?

⚠️ Se o usuário não souber responder algum ponto, assuma um padrão razoável, documente a premissa e siga.

### 3. Mapear Endpoints a partir das User Stories

Para cada user story do PRD, derive os endpoints necessários:

- **Ação do usuário** → verbo HTTP + path
- **Dado exibido** → response schema
- **Dado enviado** → request body / query params
- **Regra de negócio** → validações e possíveis erros

Agrupe por recurso (resource-oriented design):
```
/usuarios          → CRUD de usuário
/pedidos           → CRUD de pedido
/pedidos/{id}/itens → sub-recurso
```

Evite endpoints procedurais (`/criarPedido`) — prefira recursos + verbos HTTP semânticos.

### 4. Gerar o Contrato OpenAPI 3.1

Leia o template em `templates/openapi-template.yaml` e o ruleset em
`rulesets/openapi.yaml` (empacotados nesta skill) e gere o `api-contract.yaml` seguindo
estas diretrizes:

**Estrutura obrigatória por endpoint:**
- `summary` — descrição curta (máx 10 palavras)
- `description` — regras de negócio relevantes, quando necessário
- `operationId` — camelCase único (ex: `listarPedidos`, `criarPedido`)
- `tags` — agrupamento por recurso
- `security` — referência ao scheme definido em `components/securitySchemes`
- `parameters` — path params, query params com `description` e exemplos
- `requestBody` — com `$ref` para schema em `components/schemas`
- `responses` — ao menos `200/201`, `400`, `401`, `404`, `422`, `500`
- `x-frontend-notes` — (extensão customizada) hints para o frontend (ex: "use debounce de 300ms")
- `x-backend-notes` — (extensão customizada) hints para o backend (ex: "requer índice em created_at")

**Schemas em `components/schemas`:**
- Definir cada entidade uma vez, reutilizar com `$ref`
- Separar schemas de request, response e entidade base quando diferirem
- Incluir `examples` como array nos Schema Objects onde houver exemplo — não use o campo
  depreciado `example` em schemas OpenAPI 3.1
- Usar união de tipos com `null` (`type: [string, "null"]`, por exemplo) quando aplicável;
  não usar `nullable: true` como convenção de OpenAPI 3.0
- Em Media Type Objects e Parameters, prefira `examples` nomeados quando houver exemplos de
  request/response; esse mapa não deve ser confundido com o array `examples` de um Schema Object
- Documentar enums com `description` explicando cada valor

**Boas práticas:**
- Nunca expor IDs internos de banco desnecessariamente
- Datas sempre em ISO 8601 (`2024-01-15T10:30:00Z`)
- Valores monetários como inteiro em centavos ou string decimal — documentar a escolha
- Arrays vazios retornam `[]`, nunca `null`

### 5. Gerar o Contrato em Markdown (api-contract.md)

Além do YAML técnico, gere uma versão legível em Markdown para revisão por stakeholders não-técnicos. Leia o template em `references/markdown-contract-template.md`.

O Markdown deve conter:
- Tabela resumo de todos os endpoints (Método | Path | Descrição | Auth | Status)
- Por endpoint: propósito, quem consome, exemplo de request/response em JSON formatado
- Seção de schemas de entidades principais em formato de tabela (Campo | Tipo | Obrigatório | Descrição)
- Seção de códigos de erro e seus significados
- Seção de premissas e decisões tomadas

### 6. Validação do Contrato (Checklist Interno)

Antes de salvar, verifique:

- [ ] Todos os endpoints das user stories estão cobertos?
- [ ] Todo `$ref` aponta para um schema existente em `components`?
- [ ] Todos os endpoints autenticados têm `security` definido?
- [ ] Há response de erro para todos os casos de negócio relevantes?
- [ ] Os `operationId` são únicos em todo o documento?
- [ ] Campos obrigatórios estão marcados em `required`?
- [ ] Exemplos são realistas (não `string`, `123`, mas dados que façam sentido)?
- [ ] Paginação está consistente em todos os endpoints de listagem?

### 6.1. Lint obrigatório com Spectral

Depois de gerar o YAML, execute o ruleset da skill conforme
`references/spectral.md`. Corrija todos os erros antes de salvar e registre no protocolo de saída
que a validação foi executada. O lint deve ser repetível pelo backend e pelo frontend usando o mesmo
arquivo de regras.

Se encontrar falhas, corrija antes de salvar.

### 7. Salvar os Arquivos (Obrigatório)

- Salvar YAML: `tasks/prd-[nome-funcionalidade]/api-contract.yaml`
- Salvar Markdown: `tasks/prd-[nome-funcionalidade]/api-contract.md`
- Confirmar ambas as operações de escrita

### 8. Protocolo de Saída

A resposta final deve conter:

1. **Resumo de decisões** — padrões adotados, premissas assumidas
2. **Tabela de endpoints gerados** — visão rápida do que foi criado
3. **Conteúdo completo do `api-contract.yaml`**
4. **Caminhos dos arquivos salvos**
5. **Questões em aberto** — pontos que precisam de validação antes da implementação
6. **Resultado do lint Spectral** — comando/ruleset usado e eventuais warnings restantes
7. **Próximos passos:**
   - Backend: "Use a skill `tsg-flow-techspec-creator` referenciando este contrato como input adicional"
   - Frontend: "Use a skill `tsg-flow-frontend-techspec-creator` referenciando este contrato — os schemas são a fonte de verdade para os tipos"
   - Mocks: "Execute `npx @stoplight/prism-cli mock api-contract.yaml` para ter um servidor mock imediatamente"

## Princípios Fundamentais

- **O contrato é neutro** — não favorece implementação do backend nem do frontend
- **Schemas são a fonte de verdade** — tipos do frontend devem ser gerados a partir deles
- **Exemplos realistas e não depreciados** — exemplos ruins ou incompatíveis com OpenAPI 3.1 geram código ruim no frontend
- **Extensões customizadas são bem-vindas** — `x-frontend-notes`, `x-backend-notes`, `x-deprecated-at`
- **Erros são first-class** — documentar erros é tão importante quanto o happy path

## Integração com o Pipeline

Após o contrato gerado e aprovado:

| Para | Instrução |
|------|-----------|
| **TechSpec Backend** | Referenciar `api-contract.yaml` como spec de implementação dos endpoints |
| **TechSpec Frontend** | Gerar tipos TypeScript a partir dos schemas; usar mocks do Prism durante dev |
| **Design (Stitch/v0)** | Passar os exemplos dos schemas como contexto para gerar UI com dados reais |
| **Testes de Contrato** | Usar ferramentas como Pact ou Dredd para validar implementação contra o YAML |

## Checklist de Qualidade Final

- [ ] PRD lido e user stories mapeadas para endpoints
- [ ] Dúvidas críticas esclarecidas ou premissas documentadas
- [ ] Contrato YAML válido e completo
- [ ] Versão Markdown gerada e legível
- [ ] Lint Spectral executado com `rulesets/openapi.yaml` e sem erros
- [ ] Ambos os arquivos salvos nos caminhos corretos
- [ ] Próximos passos comunicados claramente
