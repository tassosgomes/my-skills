# Contratos de mensageria

Use `../templates/asyncapi-template.yaml` como exemplo de AsyncAPI 3.0.0. O exemplo descreve
uma aplicação remetente; seus nomes, payload e garantias não são defaults de negócio.

## Decisões específicas

- Identifique a aplicação descrita e suas operações `send`/`receive`. No AsyncAPI 3,
  operações ficam em `operations` e apontam para `channels`. Não misture a estrutura
  `publish`/`subscribe` da versão 2 nem derive o receptor apenas invertendo o remetente.
- Distinga evento (fato ocorrido), comando (solicitação de ação) e resposta quando aplicável.
- Declare endereço dos canais, mensagens possíveis, headers, payload, exemplos e correlação.
  Use `correlationId` com localização válida quando existir no protocolo acordado.
- Defina servidores, protocolo e segurança a partir do contexto. Use bindings oficiais
  compatíveis para detalhes de Kafka, AMQP etc.; não invente broker ou topologia.
- Resolva garantias relevantes: duplicidade, chave de idempotência, escopo de ordenação,
  chave de particionamento, confirmação, retries, destino de falhas e reprocessamento.
  Registre como compromissos observáveis; o mecanismo de implementação fica na TechSpec.
- Não prometa exactly-once sem delimitar e justificar a garantia. Ausência de binding para
  uma decisão não autoriza um campo arbitrário: use descrição ou extensão `x-` documentada.
- Identifique formato do payload e compatibilidade de schema/serialização (JSON Schema,
  Avro etc.). Não assuma que schemas OpenAPI podem ser copiados sem adaptação.

## Validação

Com a CLI compatível instalada, execute para cada documento gerado:

```bash
asyncapi validate tasks/prd-[slug]/asyncapi-contract.yaml
```

Registre versão da CLI, comando e resultado; corrija erros e revise avisos. Verifique também
se exemplos obedecem ao formato de payload escolhido e se referências e bindings são válidos.
O parser não comprova entrega, ordenação ou idempotência: liste os cenários acordados para
verificação pela implementação. Não publique em broker ou registry durante a autoria.

Em `contracts.md`, apresente aplicação, operação, direção, canal, mensagem, consumidores
conhecidos, garantias e mudanças. Não replique o schema técnico.

Fontes: [AsyncAPI 3.0.0](https://www.asyncapi.com/docs/reference/specification/v3.0.0),
[CLI](https://www.asyncapi.com/docs/tools/cli/usage).
