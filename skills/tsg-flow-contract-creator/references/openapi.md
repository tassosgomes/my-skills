# Contratos HTTP

Leia `http-conventions.md`, `spectral.md`, `../rulesets/openapi.yaml`,
`../templates/openapi-template.yaml` e `markdown-contract-template.md` antes de gerar HTTP.
As convenções HTTP são locais; não se aplicam às modalidades AsyncAPI e ODCS.

## Autoria

- Derive operações das necessidades de provedores e consumidores, incluindo serviços e jobs.
- Use recursos e verbos HTTP semânticos; ações fora de CRUD seguem a norma HTTP.
- Declare `summary`, `description`, `operationId` único, `tags` e `security` por operação,
  inclusive `security: []` para pública. Documente parâmetros e exemplos aplicáveis.
- Separe request e response quando diferirem. Reutilize schemas por `$ref`; declare campos
  obrigatórios, limites, enums e significado de valores monetários e datas.
- OpenAPI 3.1 usa tipos com `null`, não `nullable: true`. Em Schema Objects, use `examples`
  como array; em Media Type e Parameter Objects, use exemplos nomeados como mapa.
- Documente sucesso e erros com cenário correspondente. Não acrescente erros genéricos sem
  justificativa. Extensões `x-frontend-notes` e `x-backend-notes` são opcionais e só cabem
  quando existirem esses consumidores e a informação ajudar na integração.
- Webhooks/callbacks HTTP podem ser descritos em OpenAPI. Adicione AsyncAPI quando o escopo
  exigir um contrato de mensagens; não duplique interfaces automaticamente.
- Upload, streaming ou mídia não JSON exigem uma exceção explícita à norma e ao gate HTTP
  quando aplicáveis. Não altere a interface para satisfazer um ruleset incompatível.

## Revisão e saída

Confirme referências resolvidas, IDs únicos, exemplos conformes aos schemas, segurança,
paginação consistente e diferenças em relação à origem consultada. Gere `api-contract.md`
a partir do YAML seguindo o template legível; mantenha nele somente operações do escopo.
Execute o Spectral conforme `spectral.md` e registre o resultado no índice do PRD.

Tipos e mocks podem ser derivados do OpenAPI por ferramentas compatíveis com a versão
adotada, por exemplo openapi-typescript e Prism. Verificar a implementação contra o contrato
é uma etapa distinta do lint; não presuma suporte OpenAPI 3.1 de qualquer ferramenta de teste.

Fonte: [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html).
