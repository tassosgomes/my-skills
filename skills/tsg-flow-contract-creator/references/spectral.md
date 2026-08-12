# Validação Spectral do contrato

O contrato OpenAPI 3.1 deve passar pelo ruleset empacotado em
`rulesets/openapi.yaml` antes de ser apresentado como pronto. O ruleset estende
`spectral:oas` e acrescenta três garantias da skill:

- `tsg-no-deprecated-schema-example`: bloqueia `example` em Schema Objects;
- `tsg-schema-examples-array`: exige que o `examples` de um Schema Object seja um array;
- `tsg-openapi-version`: bloqueia documentos que não sejam OpenAPI 3.1.x.

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
