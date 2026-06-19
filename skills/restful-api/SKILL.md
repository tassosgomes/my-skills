---
name: restful-api
description: "Use este skill quando o usuario precisar definir padroes de APIs REST/HTTP (agnostico a linguagem/framework). Exemplos de ativacao: padronizar versionamento via path; definir convencoes de URLs (plural, ingles, kebab-case); definir paginacao padrao; aplicar RFC 9457 (Problem Details) para erros; adotar OpenAPI 3 e design-first; padronizar codigos de status e payload JSON; validar contrato com Spectral linter."
---

# Diretrizes para APIs REST/HTTP

> Skill **transversal e agnostica** a linguagem/framework. Aplica-se igualmente a servicos em .NET, Java/Spring, Node.js, Python, Go, Rust, etc. As regras aqui descritas tratam do **contrato HTTP/OpenAPI**, não da implementacao especifica.

## 1. Mapeamento de Endpoints

Utilize o estilo idiomatico do framework HTTP escolhido (ex.: Controllers, Minimal APIs, Route handlers, Resource classes, Decorators). Mantenha **consistencia interna** ao servico: nao misture estilos no mesmo modulo sem motivo. O que importa, do ponto de vista do contrato, e que o endpoint resultante atenda as convencoes descritas a seguir.

## 2. Padroes de Roteamento e Nomenclatura

### 2.1. Estrutura de URLs
- Utilize o padrao REST para consultas, mantendo o nome dos recursos em **ingles** e no **plural**
- Permita a navegabilidade em recursos aninhados
  - Exemplo: `/playlists/{playlistId}/videos` ou `/customers/{customerId}/invoices`

### 2.2. Convencao de Nomenclatura
- Para as URLs dos recursos, prefira o padrao **kebab-case** para melhor legibilidade
  - Exemplo: `/scheduled-events`
- Garanta a convencao no roteamento da framework escolhida (ex.: configurar lower-case routes, kebab-case transformers ou simplesmente declarar os paths nesse formato)

### 2.3. Limitacoes de Aninhamento
- Evite criar endpoints com mais de **3 niveis** de aninhamento de recursos

## 3. Versionamento Obrigatorio

### 3.1. Padrao de Versionamento
- O versionamento de API deve ser realizado **obrigatoriamente** atraves do **path da URI**
- A versao maior (_major_) da API deve ser incluida como o primeiro elemento do path apos o nome da API, prefixada com a letra `v`

**Exemplo**: `https://api.example.com/users/v1/profile`

### 3.2. Estrutura Recomendada
```
https://[dominio]/[api-name]/v[major-version]/[resource]
```

## 4. Tratamento de Mutacoes (Operacoes de Escrita)

Para acoes que nao se encaixam claramente no modelo CRUD (Create, Read, Update, Delete), utilize o verbo **POST** com URLs que descrevam a acao (estilo RPC).

**Exemplo**: `POST /users/{userId}/change-password` em vez de `PUT /users/{userId}` com um payload complexo.

## 5. Formato de Dados e Seguranca

### 5.1. Formato de Dados
- O formato do payload de requisicao e resposta deve ser sempre **JSON** (`application/json`; charset UTF-8)

### 5.2. Autenticacao e Autorizacao
- Sempre valide a **autenticacao** (quem o usuario e) e a **autorizacao** (o que o usuario pode fazer) em todos os endpoints que requerem protecao
- Implemente as validacoes na camada idiomatica do framework (middlewares, filters, interceptors, guards, decorators, etc.)
- Os esquemas de seguranca (`securitySchemes`) devem ser **explicitamente definidos** na documentacao OpenAPI, e cada operacao protegida deve declarar `security`

## 6. Codigos de Status de Retorno

### 6.1. Codigos de Sucesso
- **200 OK**: Sucesso na requisicao
- **201 Created**: Recurso criado com sucesso (usar em conjunto com o header `Location`)
- **204 No Content**: Sucesso, mas sem conteudo para retornar (comum em operacoes de DELETE)

### 6.2. Codigos de Erro do Cliente
- **400 Bad Request**: A requisicao esta mal formatada (ex: JSON invalido, parametros faltando)
- **401 Unauthorized**: O usuario nao esta autenticado
- **403 Forbidden**: O usuario esta autenticado, mas nao tem permissao para acessar o recurso
- **404 Not Found**: O recurso solicitado nao foi encontrado
- **422 Unprocessable Entity**: A requisicao estava bem formatada, mas contem erros de negocio (ex: e-mail ja cadastrado)

### 6.3. Codigos de Erro do Servidor
- **500 Internal Server Error**: Erro inesperado no servidor

### 6.4. Tabela de Códigos de Status HTTP

Utilize os códigos de status abaixo para garantir semântica e previsibilidade nas respostas da API:

| Código | Status | Descrição e Uso Recomendado |
|--------|--------|------------------------------|
| 200 | OK | Sucesso na requisição. Retorna o recurso solicitado no corpo. |
| 201 | Created | Recurso criado com sucesso. Obrigatório retornar o header `Location`. |
| 204 | No Content | Sucesso, mas sem corpo de resposta (comum em DELETE ou PUT). |
| 400 | Bad Request | Erro de sintaxe (ex: JSON malformado ou campos obrigatórios faltando). |
| 401 | Unauthorized | O usuário não está autenticado ou o token é inválido/expirado. |
| 403 | Forbidden | Usuário autenticado, mas sem permissão de acesso ao recurso específico. |
| 404 | Not Found | O recurso solicitado (ID ou rota) não foi encontrado no servidor. |
| 422 | Unprocessable Entity | Erros de regra de negócio (ex: CPF já cadastrado, saldo insuficiente). |
| 429 | Too Many Requests | O cliente excedeu o limite de requisições (Rate Limiting). |
| 500 | Internal Server Error | Erro inesperado no servidor. Não deve expor detalhes sensíveis (Stack Trace). |

## 7. Padrao de Respostas de Erro (RFC 9457)

### 7.1. Formato Obrigatorio
As respostas de erro devem **obrigatoriamente** aderir ao formato definido pela **[RFC 9457 (Problem Details for HTTP APIs)](https://www.rfc-editor.org/rfc/rfc9457.html)**, com `Content-Type: application/problem+json`.

### 7.2. Estrutura da Resposta de Erro
```json
{
  "type": "https://example.com/probs/out-of-credit",
  "title": "You do not have enough credit.",
  "status": 403,
  "detail": "Your current balance is 30, but that costs 50.",
  "instance": "/account/12345/msgs/abc"
}
```

### 7.3. Implementacao (independente de stack)
Adote a biblioteca idiomatica de cada stack para nao reinventar serializacao/middlewares:

| Stack | Recurso recomendado |
|-------|---------------------|
| .NET / ASP.NET Core | `IExceptionHandler` + `ProblemDetails` builtin |
| Java / Spring Boot 3+ | `ProblemDetail` + `@RestControllerAdvice` |
| Node.js / Express / Fastify | `http-problem-details` ou serializador proprio |
| Python / FastAPI | Custom exception handler retornando JSON RFC 9457 |
| Go | Tipo `Problem` proprio + middleware central de erro |

O contrato HTTP **e o mesmo** para todas as stacks: `application/problem+json` com os campos obrigatorios (`type`, `title`, `status`).

## 8. Paginacao Obrigatoria

### 8.1. Padrao de Paginacao
Respostas que retornam uma **colecao** de recursos devem **obrigatoriamente** suportar paginacao atraves dos query parameters padronizados:
- **`_page`**: numero da pagina (iniciando em 1)
- **`_size`**: quantidade de itens por pagina (recomenda-se default `10` e limite maximo definido por servico)

### 8.2. Exemplo de Requisicao
```
GET /v1/users?_page=2&_size=20 HTTP/1.1
Accept: application/json
```

### 8.3. Estrutura da Resposta Paginada
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "size": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## 9. Documentacao e OpenAPI

### 9.1. Especificacao OpenAPI 3 (Recomendado)
- **Recomenda-se fortemente** o uso da especificacao **[OpenAPI 3 (OAS3)](https://swagger.io/specification/)** para definicao formal de contratos de API
- O formato **YAML** (`openapi.yaml`) e o padrao recomendado para escrita e manutencao da especificacao

### 9.2. Filosofia "Design-First" (Recomendada)
- **Recomenda-se** a adocao da abordagem **["Design-First"](https://swagger.io/blog/code-first-vs-design-first-api/)**
- O contrato OpenAPI deve ser projetado, revisado e validado antes da implementacao do codigo

### 9.3. Geracao da especificacao (independente de stack)
Quando o time optar por **code-first**, gere o `openapi.yaml` a partir do codigo usando a ferramenta idiomatica e **commite o YAML resultante** no repositorio para servir de fonte de verdade para o linter:

| Stack | Ferramenta tipica |
|-------|-------------------|
| .NET / ASP.NET Core | Swashbuckle, Microsoft.AspNetCore.OpenApi, NSwag |
| Java / Spring Boot | springdoc-openapi |
| Node.js | `@nestjs/swagger`, `fastify-swagger`, `swagger-jsdoc` |
| Python | FastAPI (automatico), `drf-spectacular`, `apispec` |
| Go | `swaggo/swag`, `kin-openapi` |

Independente do gerador, o resultado deve passar no mesmo ruleset Spectral (secao 13).

### 9.4. Documentacao Obrigatoria
- Documente todos os endpoints, metodos e codigos de status
- Inclua `examples` de requisicoes e respostas
- Descreva claramente os esquemas de autenticacao e autorizacao
- Disponibilize uma UI navegavel (Swagger UI, Redoc, Scalar, etc.)

## 10. Features Avancadas

### 10.1. Partial Responses
Considere implementar partial responses para consultas que podem retornar grandes volumes de dados, permitindo que o cliente especifique os campos desejados.

**Exemplo**: `?fields=id,name,email`

### 10.2. Filtros e Ordenacao
Implemente padroes consistentes para:
- **Filtros**: `?status=active&category=tech`
- **Ordenacao**: `?sort=name&order=asc`

## 11. Comunicacao com APIs Externas

Independente da linguagem, todo cliente HTTP que chama uma API externa **deve**:

- Definir **timeout explicito** (connect e request) — nunca usar default infinito
- Implementar **retry com backoff exponencial** para erros transientes (5xx, timeouts, `429`)
- Aplicar **circuit breaker** quando o servico chamado for critico ou instavel
- Respeitar `Retry-After` em respostas `429`/`503`
- Propagar headers de **observabilidade** (`traceparent`, `x-correlation-id`)
- **Nao logar** credenciais nem payloads sensiveis

Ferramentas tipicas por stack (apenas referencia):
- .NET: `IHttpClientFactory` + Polly
- Java: `WebClient`/`RestClient` + Resilience4j
- Node.js: `undici`/`axios` + `cockatiel`/`opossum`
- Python: `httpx` + `tenacity`
- Go: `net/http` + `hashicorp/go-retryablehttp`

## 12. Justificativas

### 12.1. Versionamento Obrigatorio
- **Clareza**: O versionamento na URL e explicito e inequivoco para os consumidores da API
- **Facilita o roteamento**: Em API Gateways e a exploracao da documentacao

### 12.2. RFC 9457 para Erros
- **Previsibilidade**: Garante que todas as APIs respondam a erros de forma consistente
- **Rastreabilidade**: O formato padronizado inclui campos que facilitam a depuracao

### 12.3. Paginacao Padronizada
- **Protecao**: Previne sobrecarga do servidor ou da rede
- **Consistencia**: Simplifica a implementacao em clientes

### 12.4. OpenAPI e Design-First
- **Desenvolvimento paralelo**: Permite que equipes trabalhem simultaneamente com base em um contrato mockado
- **Reducao de retrabalho**: Alinha expectativas antes da codificacao

## 13. Validacao Automatica com Spectral

Estas regras so geram valor se forem **verificadas automaticamente**. Adote o **[Spectral](https://stoplight.io/open-source/spectral)** (linter open source da Stoplight para OpenAPI/AsyncAPI/JSON Schema) como porta de qualidade obrigatoria do contrato — independente da linguagem do servico.

### 13.1. Instalacao

CLI via npm (suficiente, mesmo em projetos nao-Node — o npm e usado apenas como gerenciador de binario):

```bash
npm install -D @stoplight/spectral-cli
# ou execucao sem instalacao
npx @stoplight/spectral-cli lint openapi.yaml
```

Imagem Docker oficial para pipelines sem Node:

```bash
docker run --rm -v "$PWD:/tmp" stoplight/spectral lint /tmp/openapi.yaml
```

### 13.2. Ruleset recomendado (`.spectral.yaml`)

Coloque na raiz do repositorio. Estende `spectral:oas` (validacoes nativas OpenAPI 3) e adiciona as regras desta skill:

```yaml
extends: [[spectral:oas, all]]

rules:
  # 2.1 / 2.2 — paths em ingles, plural, kebab-case
  paths-kebab-case:
    description: "Paths devem usar kebab-case e somente caracteres [a-z0-9-/{}]"
    severity: error
    given: $.paths[*]~
    then:
      function: pattern
      functionOptions:
        match: "^(/([a-z0-9-]+|\\{[a-zA-Z0-9]+\\}))+/?$"

  # 2.3 — no maximo 3 niveis de recurso aninhado
  paths-max-nesting:
    description: "Evite mais de 3 niveis de aninhamento de recursos"
    severity: warn
    given: $.paths[*]~
    then:
      function: pattern
      functionOptions:
        notMatch: "^(/[^/]+){7,}$"

  # 3.1 — versionamento obrigatorio no path (.../vN/...)
  path-must-have-version:
    description: "Todo path deve conter segmento de versao vN (ex.: /v1/users)"
    severity: error
    given: $.paths[*]~
    then:
      function: pattern
      functionOptions:
        match: "/v[0-9]+(/|$)"

  # 5.1 — JSON obrigatorio em request/response bodies
  content-type-json-only:
    description: "Bodies devem usar application/json (ou application/problem+json em erros)"
    severity: error
    given:
      - $.paths[*][*].requestBody.content
      - $.paths[*][*].responses[*].content
    then:
      function: enumeration
      field: "@key"
      functionOptions:
        values:
          - application/json
          - application/problem+json

  # 5.2 — toda operacao deve declarar security (exceto health/docs)
  operation-security-defined:
    description: "Cada operacao deve declarar security (use [] explicito para publicas)"
    severity: error
    given: $.paths[*][get,post,put,patch,delete]
    then:
      field: security
      function: defined

  # 6 — respostas de sucesso e erro obrigatorias
  operation-has-success-response:
    description: "Operacao deve declarar pelo menos uma resposta 2xx"
    severity: error
    given: $.paths[*][*].responses
    then:
      function: pattern
      field: "@key"
      functionOptions:
        match: "^(2\\d\\d|2XX)$"

  # 7 — erros devem usar application/problem+json (RFC 9457)
  error-uses-problem-details:
    description: "Respostas 4xx/5xx devem usar application/problem+json"
    severity: error
    given: $.paths[*][*].responses[?(@property.match(/^[45]/))].content
    then:
      field: application/problem+json
      function: truthy

  # 7.2 — schema Problem com campos obrigatorios RFC 9457
  problem-details-schema:
    description: "Schemas de erro devem conter pelo menos type, title e status"
    severity: warn
    given: $.paths[*][*].responses[?(@property.match(/^[45]/))].content.application/problem+json.schema.properties
    then:
      - field: type
        function: truthy
      - field: title
        function: truthy
      - field: status
        function: truthy

  # 8 — colecoes devem expor _page e _size
  collection-pagination-params:
    description: "GET de colecao deve aceitar _page e _size"
    severity: warn
    given: $.paths[?(@property.match(/s$/))][get].parameters
    then:
      function: schema
      functionOptions:
        schema:
          type: array
          contains:
            type: object
            properties:
              name: { enum: [_page, _size] }

  # 9 — info.version e contact obrigatorios
  info-contact-defined:
    description: "info.contact deve ser preenchido"
    severity: warn
    given: $.info
    then:
      field: contact
      function: truthy

  # 9.4 — toda operacao deve ter summary, description e operationId
  operation-must-be-documented:
    description: "Operacoes devem ter summary, description e operationId"
    severity: warn
    given: $.paths[*][*]
    then:
      - field: summary
        function: truthy
      - field: description
        function: truthy
      - field: operationId
        function: truthy
```

> Ajuste os `severity` (`error`/`warn`/`info`/`hint`) conforme a maturidade do servico. Comece em `warn` para nao quebrar o build de APIs legadas e suba para `error` em greenfields.

### 13.3. Execucao local

```bash
# Lint padrao (usa .spectral.yaml na raiz)
spectral lint openapi.yaml

# Falhar somente em severity >= error
spectral lint openapi.yaml --fail-severity=error

# Saida JUnit para integrar em CI
spectral lint openapi.yaml --format=junit --output=spectral-report.xml
```

### 13.4. Integracao em CI (GitHub Actions, exemplo)

```yaml
name: api-contract
on: [pull_request]
jobs:
  spectral:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: stoplightio/spectral-action@latest
        with:
          file_glob: "**/openapi.yaml"
          spectral_ruleset: ".spectral.yaml"
```

Equivalente generico (sem action dedicada) usando Docker — funciona em qualquer CI:

```yaml
- name: Lint OpenAPI
  run: |
    docker run --rm -v "$PWD:/tmp" stoplight/spectral \
      lint /tmp/openapi.yaml \
      --ruleset /tmp/.spectral.yaml \
      --fail-severity=error
```

### 13.5. Pre-commit (opcional)

Para feedback antes do push, adicione no `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: spectral-lint
        name: Spectral OpenAPI lint
        entry: npx --yes @stoplight/spectral-cli lint
        language: system
        files: '^.*openapi\.ya?ml$'
        args: ["--fail-severity=error"]
```

### 13.6. Checklist de adocao

- [ ] `openapi.yaml` versionado no repositorio (mesmo em code-first)
- [ ] `.spectral.yaml` na raiz, estendendo `spectral:oas`
- [ ] Regras desta skill habilitadas
- [ ] `spectral lint` executando em CI com `--fail-severity=error`
- [ ] PRs bloqueados quando o linter falha
- [ ] Equipe tem comando local documentado (README) para reproduzir o lint