# Convenções HTTP do contrato

Norma agnóstica de linguagem e framework para o contrato HTTP/OpenAPI. Aplica-se igualmente a
.NET, Java/Spring, Node.js, Python, Go e Rust: trata do **contrato**, não da implementação.

Estas regras são verificadas pelo ruleset em [`rulesets/openapi.yaml`](../rulesets/openapi.yaml).
Quando o texto e o ruleset divergirem, o ruleset é a versão executável — corrija o texto.

## 1. URLs e nomenclatura

- Recursos em **inglês** e no **plural**: `/customers`, `/invoices`.
- **kebab-case** nos segmentos: `/scheduled-events`.
- Navegabilidade em recursos aninhados: `/playlists/{playlistId}/videos`.
- No máximo **3 níveis** de aninhamento.
- Campos JSON em `camelCase`.

> **Exceção de idioma.** Um projeto pode adotar o idioma do domínio nos paths quando isso estiver
> registrado no `context/architecture-baseline.md` ou numa ADR aceita. Sem esse registro, a norma
> é inglês. O ruleset não verifica idioma — só kebab-case —, então a divergência precisa ser
> decidida explicitamente, nunca por omissão.

## 2. Versionamento obrigatório

A versão **major** aparece na URL efetiva, prefixada com `v`. Duas formas são aceitas:

- na URL base, em `servers` — `servers: [{ url: /api/v1 }]` (recomendada em OpenAPI: mantém os
  paths limpos e a versão num lugar só);
- em cada path — `/v1/customers`.

Escolha **uma** por contrato e não misture. Breaking change exige nova major.

## 3. Mutações fora do CRUD

Ações que não se encaixam em CRUD usam `POST` com URL que descreve a ação:
`POST /users/{userId}/change-password`, em vez de um `PUT /users/{userId}` com payload complexo.

## 4. Formato de dados e segurança

- Request e response sempre em JSON: `application/json`, UTF-8. Erros em `application/problem+json`.
- Datas em ISO 8601 (`2024-01-15T10:30:00Z`). Deixe explícito quando o horário for local com offset.
- Valores monetários como inteiro em centavos ou string decimal — documente a escolha no contrato.
- Arrays vazios retornam `[]`, nunca `null`.
- Nunca exponha ID interno de banco sem necessidade.
- `securitySchemes` definidos explicitamente; **toda** operação declara `security`, inclusive as
  públicas, com `security: []`. Omitir é ambíguo; `[]` é uma decisão.

## 5. Códigos de status

| Código | Uso |
|---|---|
| 200 | Sucesso com corpo. |
| 201 | Recurso criado. Obrigatório o header `Location`. |
| 204 | Sucesso sem corpo (comum em `DELETE`). |
| 400 | Sintaxe inválida: JSON malformado, parâmetro obrigatório ausente. |
| 401 | Não autenticado, ou token inválido/expirado. |
| 403 | Autenticado, sem permissão para o recurso. |
| 404 | Recurso não encontrado. |
| 422 | Requisição bem formada, violação de regra de negócio. |
| 429 | Limite de requisições excedido. Acompanhe de `Retry-After`. |
| 500 | Erro inesperado. Nunca exponha stacktrace nem detalhe de provedor. |

Documente apenas os códigos com cenário correspondente na operação. Lista genérica de erros em
todo endpoint é ruído e não descreve o comportamento real.

## 6. Erros: RFC 9457 obrigatório

Respostas de erro seguem a [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457.html), com
`Content-Type: application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Dados temporariamente indisponíveis",
  "status": 502,
  "detail": "Não foi possível obter dados da fonte. Tente novamente.",
  "instance": "/api/v1/localidades/3399415/clima",
  "code": "UPSTREAM_UNAVAILABLE",
  "traceId": "00-9f2b5d6c4e7a8b90123456789abcdef0-0123456789abcdef-01"
}
```

`type`, `title` e `status` são obrigatórios pela RFC. `code` (estável, para tratamento
programático no cliente), `traceId` e `errors` (validação por campo) são extensões recomendadas —
declare-as no schema quando usá-las.

O cliente trata o `code`, nunca o texto livre de `title`/`detail`.

## 7. Paginação

Coleções potencialmente ilimitadas **devem** paginar, com query params padronizados:

- `_page` — página, iniciando em 1;
- `_size` — itens por página; default `10`, máximo definido por serviço.

```json
{
  "data": [],
  "pagination": { "page": 1, "size": 10, "total": 100, "totalPages": 10 }
}
```

> **Exceção.** Coleção com teto fixo e pequeno, declarado no schema via `maxItems` e justificado
> no PRD (ex.: uma busca que devolve no máximo 10 candidatos para seleção), dispensa paginação.
> O ruleset ainda emite `warn` nesse caso: registre a exceção nas premissas do contrato.

## 8. Filtros, ordenação e resposta parcial

Padrões consistentes quando aplicáveis:

- filtros: `?status=active&category=tech`;
- ordenação: `?sort=name&order=asc`;
- campos: `?fields=id,name,email` para respostas grandes.

## 9. Documentação

- Todo endpoint com `summary`, `description`, `operationId` único em camelCase e `tags`.
- `examples` realistas em requests e responses — nunca `string`, `123` ou `foo`.
- Esquemas de autenticação descritos.
- Uma UI navegável publicada (Scalar, Redoc, Swagger UI).

## Fora do escopo desta norma

- **Resiliência de cliente HTTP** (timeout, retry com backoff, circuit breaker, `Retry-After`,
  propagação de `traceparent`): é implementação, não contrato. Vive nas skills de stack —
  `dotnet-dependency-config` e `dotnet-performance` no .NET, `java-dependency-config` no Java.
- **Estilo de mapeamento de endpoint** (Minimal API, Controller, Route handler): skill de stack.
- **Geração do OpenAPI a partir do código** (code-first): skill de stack. Seja qual for a origem,
  o YAML resultante é commitado e passa no mesmo ruleset.
