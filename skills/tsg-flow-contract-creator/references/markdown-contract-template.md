# API Contract — [Nome da Feature]

> **Gerado a partir de:** `tasks/prd-[nome-funcionalidade]/prd.md`  
> **Data:** [data]  
> **Status:** Rascunho | Em Revisão | Aprovado  
> **Versão do contrato:** 1.0.0

---

## Premissas e Decisões

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Autenticação | JWT Bearer | [motivo] |
| Paginação | offset/limit | [motivo] |
| Formato de datas | ISO 8601 UTC | Consistência entre fusos horários |
| Valores monetários | Centavos (inteiro) | Evitar problemas de ponto flutuante |
| Nomenclatura de campos | camelCase | [motivo] |
| Versionamento | Prefixo `/v1/` | [motivo] |

---

## Resumo de Endpoints

| Método | Path | Descrição | Auth | Status Possíveis |
|--------|------|-----------|------|-----------------|
| `GET` | `/v1/[recursos]` | Listar [recursos] | ✅ | 200, 401, 500 |
| `POST` | `/v1/[recursos]` | Criar [recurso] | ✅ | 201, 400, 401, 422, 500 |
| `GET` | `/v1/[recursos]/{id}` | Buscar por ID | ✅ | 200, 401, 404, 500 |
| `PATCH` | `/v1/[recursos]/{id}` | Atualizar [recurso] | ✅ | 200, 400, 401, 404, 422, 500 |
| `DELETE` | `/v1/[recursos]/{id}` | Remover [recurso] | ✅ | 204, 401, 404, 500 |

---

## Endpoints Detalhados

### `GET /v1/[recursos]` — Listar [recursos]

**Propósito:** [O que este endpoint faz e quando é usado]  
**Consumido por:** Frontend — [nome da tela/componente]

#### Query Parameters

| Parâmetro | Tipo | Obrigatório | Default | Descrição |
|-----------|------|-------------|---------|-----------|
| `page` | integer | Não | 1 | Número da página |
| `limit` | integer | Não | 20 | Itens por página (máx 100) |
| `[filtro]` | string | Não | — | [Descrição do filtro] |

#### Response 200

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "[campo]": "[valor de exemplo realista]",
      "status": "ativo",
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T14:22:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

---

### `POST /v1/[recursos]` — Criar [recurso]

**Propósito:** [O que este endpoint faz]  
**Consumido por:** Frontend — [nome do formulário/modal]

#### Request Body

```json
{
  "[campo_obrigatorio]": "[valor de exemplo realista]",
  "[campo_opcional]": null
}
```

#### Response 201

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "[campo_obrigatorio]": "[valor de exemplo realista]",
  "status": "ativo",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

#### Erros Possíveis

| Código HTTP | code | Quando ocorre |
|-------------|------|---------------|
| 400 | `VALIDATION_ERROR` | Campo obrigatório ausente ou formato inválido |
| 422 | `BUSINESS_RULE_VIOLATION` | [Regra de negócio específica] |

---

### `GET /v1/[recursos]/{id}` — Buscar por ID

**Propósito:** [O que este endpoint faz]  
**Consumido por:** Frontend — [nome da tela de detalhe]

#### Path Parameters

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `id` | UUID | Identificador único do recurso |

#### Response 200

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "[campo]": "[valor de exemplo realista]",
  "status": "ativo",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:22:00Z"
}
```

---

### `PATCH /v1/[recursos]/{id}` — Atualizar [recurso]

**Propósito:** [O que este endpoint faz]  
**Nota:** Atualização parcial — enviar apenas os campos a alterar.

#### Request Body

```json
{
  "[campo_atualizavel]": "[novo valor]"
}
```

---

### `DELETE /v1/[recursos]/{id}` — Remover [recurso]

**Propósito:** [O que este endpoint faz]  
**Nota:** Retorna `204 No Content` — sem body na response.

---

## Schemas de Entidades

### [Recurso]

| Campo | Tipo | Obrigatório | Nullable | Descrição |
|-------|------|-------------|----------|-----------|
| `id` | UUID | ✅ | ❌ | Identificador único |
| `[campo]` | string | ✅ | ❌ | [Descrição] |
| `[campo_opcional]` | string | ❌ | ✅ | [Descrição] |
| `status` | enum | ✅ | ❌ | `ativo`, `inativo`, `pendente` |
| `createdAt` | datetime | ✅ | ❌ | Data de criação (ISO 8601) |
| `updatedAt` | datetime | ✅ | ❌ | Última atualização (ISO 8601) |

---

## Códigos de Erro

| HTTP | code | Descrição |
|------|------|-----------|
| 400 | `VALIDATION_ERROR` | Campo inválido ou ausente |
| 401 | `UNAUTHORIZED` | Token ausente, inválido ou expirado |
| 403 | `FORBIDDEN` | Sem permissão para a operação |
| 404 | `NOT_FOUND` | Recurso não encontrado |
| 422 | `BUSINESS_RULE_VIOLATION` | Violação de regra de negócio |
| 500 | `INTERNAL_ERROR` | Erro interno — verificar `traceId` nos logs |

### Formato Padrão de Erro

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Dados inválidos na requisição",
  "details": [
    {
      "field": "email",
      "message": "Formato de e-mail inválido"
    }
  ],
  "traceId": null
}
```

---

## Como usar este contrato

### Backend
Implemente os endpoints exatamente conforme descrito. Use `x-backend-notes` no YAML para hints de implementação.

### Frontend
1. Use os schemas para gerar tipos TypeScript:
   ```bash
   npx openapi-typescript api-contract.yaml -o src/types/api.ts
   ```
2. Use o Prism para mockar a API durante desenvolvimento:
   ```bash
   npx @stoplight/prism-cli mock api-contract.yaml
   # API mock disponível em http://localhost:4010
   ```

### Design (Stitch/v0)
Passe os exemplos JSON das responses como contexto para gerar componentes com dados realistas.

### Testes de Contrato
```bash
# Validar implementação contra o contrato
npx dredd api-contract.yaml http://localhost:3000
```

---

## Questões em Aberto

- [ ] [Questão 1 — ex: Confirmar se endpoint X precisa de paginação]
- [ ] [Questão 2 — ex: Definir TTL do cache para listagens]
- [ ] [Questão 3 — ex: Validar se campos Y e Z são realmente opcionais]