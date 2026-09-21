# Contratos de dados

Use ODCS quando existir acordo entre produtor e consumidores sobre dados disponibilizados,
como tabela, arquivo, dataset ou stream. Banco de uso interno não basta para exigir ODCS.
Use `../templates/odcs-template.yaml` como exemplo mínimo, adaptando ao PRD.

## Decisões específicas

- Identifique produto de dados, finalidade, uso permitido, limitações, produtor, consumidores
  conhecidos e responsáveis pelo acordo. Não invente equipes, contatos ou compromissos.
- Separe `apiVersion: v3.0.1` (padrão) de `version` (contrato), com `kind: DataContract`,
  identidade estável e estado coerente. Aprovação para implementar não significa dados em produção.
- Defina modelos e propriedades com significado, tipos lógicos/físicos quando conhecidos,
  obrigatoriedade, chaves e exemplos. ODCS tem modelo próprio; não copie `components/schemas`.
- Defina qualidade mensurável quando requerida: regra, dimensão, métrica, limite e escopo.
  Diferencie regras declaradas das evidências obtidas contra dados reais.
- Resolva compromissos relevantes de atualização, disponibilidade, retenção e suporte,
  com unidade, janela e método de medição. Não preencha SLA por conveniência do template.
- Registre classificação dos dados, restrições de acesso/uso e infraestrutura já conhecida,
  usando campos oficiais. Metadados ODCS não criam permissões no sistema de origem.
- Compare alterações de estrutura, significado, qualidade e serviço com a versão de entrada.
  Um campo do mesmo tipo com novo significado também pode quebrar consumidores.

## Validação

Valide o YAML contra o JSON Schema oficial da versão escolhida. Para v3.0.1:

- [Schema versionado](https://raw.githubusercontent.com/bitol-io/open-data-contract-standard/v3.0.1/schema/odcs-json-schema-v3.0.1.json)
- Use um validador que suporte o dialeto declarado em `$schema` e resolva as referências.
  Converta YAML para JSON preservando os tipos, se necessário; falhe em erro de parsing/schema.
- Use a ferramenta já disponível no projeto ou um ambiente isolado. Registre comando,
  versão do validador, URL/versão do schema, resultado e limitações em `contracts.md`.
- Confira exemplos contra as propriedades e revise regras/SLA com os participantes. Validação
  estrutural não executa regras de qualidade nem certifica os dados reais.

Exemplo reproduzível em ambiente isolado, quando `uv` estiver disponível (execute da raiz
do projeto, substituindo o slug; as dependências não são adicionadas ao projeto):

```bash
uv run --with jsonschema --with pyyaml python - tasks/prd-[slug]/data-contract.yaml <<'PY'
import json
import sys
import urllib.request
import yaml
from jsonschema import validators

url = 'https://raw.githubusercontent.com/bitol-io/open-data-contract-standard/v3.0.1/schema/odcs-json-schema-v3.0.1.json'
with urllib.request.urlopen(url) as response:
    schema = json.load(response)
validator = validators.validator_for(schema)
validator.check_schema(schema)
with open(sys.argv[1], encoding='utf-8') as source:
    document = yaml.safe_load(source)
validator(schema).validate(document)
print('ODCS v3.0.1 válido')
PY
```

O exemplo verifica estrutura. Use as versões de dependências acordadas pelo projeto e registre
as efetivamente usadas. Se não houver acesso ao schema, informe a validação pendente.

Em `contracts.md`, apresente produto/modelos, consumidores, compromissos, mudanças e cenários
de verificação. Catalogação, publicação e atualização do acervo são responsabilidade da
plataforma e não são pré-requisitos para concluir este documento do PRD.

Fonte: [ODCS v3.0.1](https://bitol-io.github.io/open-data-contract-standard/v3.0.1/).
