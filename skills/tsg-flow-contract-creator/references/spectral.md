# Validação Spectral do contrato

O contrato OpenAPI 3.1 deve passar pelo ruleset empacotado em
`rulesets/openapi.yaml` antes de ser apresentado como pronto. Ele é o **ruleset único** de
contratos HTTP deste repositório: estende `spectral:oas` e torna executável a norma de
[http-conventions.md](http-conventions.md).

Garantias de OpenAPI 3.1:

- `tsg-openapi-version`: bloqueia documentos que não sejam OpenAPI 3.1.x;
- `tsg-no-deprecated-schema-example`: bloqueia `example` em Schema Objects;
- `tsg-schema-examples-array`: exige que o `examples` de um Schema Object seja um array.

Garantias de convenção HTTP (`error`):

- `tsg-api-must-be-versioned`: versão major em `servers.url` **ou** nos paths;
- `tsg-paths-kebab-case`: paths em kebab-case;
- `tsg-content-type-json-only`: apenas `application/json` e `application/problem+json`;
- `tsg-operation-security-defined`: toda operação declara `security`, inclusive `[]`;
- `tsg-operation-has-success-response`: toda operação declara uma resposta 2xx;
- `tsg-error-uses-problem-details`: respostas 4xx/5xx em `application/problem+json`.

Avisos que exigem revisão humana, não correção automática (`warn`): `tsg-paths-max-nesting`,
`tsg-problem-details-schema`, `tsg-collection-pagination-params`, `tsg-info-contact-defined`
e `tsg-operation-must-be-documented`. `tsg-collection-pagination-params` dispara em coleções
com teto fixo declarado — uma exceção legítima descrita em http-conventions.md §7; registre-a
nas premissas do contrato em vez de adicionar paginação inútil.

## Como executar

No clone deste repositório:

```bash
npx --yes @stoplight/spectral-cli lint \
  tasks/prd-[slug]/api-contract.yaml \
  --ruleset skills/tsg-flow-contract-creator/rulesets/openapi.yaml \
  --fail-severity=error
```

Quando a skill estiver instalada em outro diretório, passe o caminho absoluto para
`rulesets/openapi.yaml` dentro da instalação:

```bash
npx --yes @stoplight/spectral-cli lint \
  tasks/prd-[slug]/api-contract.yaml \
  --ruleset /caminho/da/skill/tsg-flow-contract-creator/rulesets/openapi.yaml \
  --fail-severity=error
```

O comando retorna código diferente de zero quando há um erro. Warnings do ruleset base
devem ser revisados; o contrato não deve ser entregue com erro de lint.

## Regra para exemplos

No OpenAPI 3.1, `example` no Schema Object foi depreciado em favor do keyword JSON Schema
`examples`. Portanto, escreva exemplos de schema assim:

```yaml
type: string
description: Nome exibido ao consumidor
examples:
  - Marina Alves
```

`examples` de um Media Type Object ou de um Parameter Object é um mapa de exemplos
nomeados, diferente do array usado dentro de Schema Objects:

```yaml
content:
  application/json:
    schema:
      $ref: '#/components/schemas/UsuarioResponse'
    examples:
      usuario:
        value:
          nome: Marina Alves
```

Não substitua mecanicamente um mapa de exemplos de resposta por um array de schema.

## Validação em CI

O mesmo arquivo de regras roda no pipeline, para que backend e frontend sejam medidos pelo
mesmo critério que a skill usou na autoria:

```yaml
- name: Lint OpenAPI
  run: |
    npx --yes @stoplight/spectral-cli lint "**/api-contract.yaml" \
      --ruleset rulesets/openapi.yaml \
      --fail-severity=error
```

Contratos gerados a partir do código (code-first) passam pelo mesmo gate: commite o YAML
resultante e lint-e o arquivo commitado.
