# Fatiamento vertical e contrato de saída

## O que uma task deve entregar

Uma task `vertical` entrega um comportamento único e observável, do ponto de entrada ao resultado:

`entrada → validação/regra → persistência ou integração → resposta/efeito → teste e telemetria`

Ela pode tocar controller, use case, domínio, repository e teste porque o critério é a jornada, não a
quantidade de camadas. As faixas de arquivos e subtarefas orientam o tamanho, mas não podem separar
o comportamento de seu teste nem deixar o repositório em estado intermediário inválido. Se a jornada
precisar ser dividida, cada parte resultante deve compilar e possuir gate comportamental próprio.

Exemplos:

- `Criar pedido válido` inclui entrada, regra de total, persistência, resposta e teste de integração.
- `Rejeitar pedido sem estoque` inclui a regra, o erro observável e o teste do caminho negativo.
- `Criar todos os repositories` não é uma task vertical: não há comportamento demonstrável.

Microfragmentação disfarçada de fatia vertical:

```text
❌ Modelar Associação
❌ Criar exceção de duplicidade
❌ Criar Command/Handler
❌ Criar DTO/OpenAPI
❌ Criar adapter JPA
❌ Criar mapper/error handler
❌ Criar controller e somente então o teste HTTP

✅ Criar Associação por HTTP com autorização, persistência e teste focalizado 201/409/403
```

Os sete itens do primeiro grupo são partes técnicas de uma única jornada. Separá-los cria gates de
compilação, dependências futuras e testes compartilhados, não feedback funcional independente.

## Como maximizar fatias verticais

1. Liste user stories, requisitos e regras que geram efeitos observáveis.
2. Escolha o menor fluxo que prove valor ou risco relevante.
3. Atribua a esse fluxo apenas os arquivos necessários para atravessar as camadas.
4. Inclua o teste focalizado e a telemetria que tornam o resultado verificável.
5. Registre o checkpoint: comando, request, cenário, saída esperada ou evidência visual.
6. Repita até cobrir o PRD, mantendo tasks independentes quando os arquivos forem disjuntos.

Antes de aceitar a divisão, aplique o teste contrafactual: "Se a próxima task nunca for executada,
esta entrega ainda compila e seu gate prova valor ou risco real?" Se a resposta for não, funda as
duas tasks. DTO, mapper, exception, entity, repository, interface ou contrato isolado normalmente é
parte da mesma fatia que o consome.

As categorias de cobertura (setup, dados, negócio, endpoints, testes etc.) servem para encontrar
lacunas. Elas não devem criar uma task por camada. O título da task deve descrever o comportamento,
não uma coleção de classes.

## Habilitadores horizontais

Use `slice_type: enabling` somente quando o trabalho não puder ser embutido em nenhuma fatia sem
duplicação insegura ou sem um contrato compartilhado inevitável. Exemplos aceitáveis são uma migration
compartilhada que precisa existir antes de qualquer leitura ou um contrato comum que fixa tipos para
várias fatias.

Para cada habilitador, documente:

- por que nenhuma fatia consegue carregá-lo;
- o menor conjunto de arquivos;
- a fatia que ele desbloqueia;
- a validação local possível, mesmo sem valor final.

"Preparar a camada X", "criar todos os DTOs" ou "evitar colisão" não são justificativas. Se a
colisão existe, reduza o contrato compartilhado e deixe cada fatia implementar seu comportamento.

## Checkpoint de feedback

O checkpoint deve ser executável logo após a task e não depender da conclusão das demais camadas. Ele
deve dizer:

- qual comando, request ou cenário executar;
- qual saída/estado/log/métrica é esperado;
- qual parte do PRD foi comprovada;
- o que ainda não foi comprovado.

O teste, fixture ou script usado pelo checkpoint deve existir antes da task por dependência
declarada ou ser criado/modificado na própria task. Prefira filtro por classe+método, tag ou caminho.
Uma suíte compartilhada inteira, `compile` ou inspeção manual não é evidência suficiente para uma
fatia vertical.

O checkpoint aprova apenas a task. A aprovação da feature inteira continua sendo responsabilidade da
validação full do TSG Flow.

## Conteúdo mínimo dos arquivos

`tasks.md` deve conter o mapa de fatias, rastreabilidade PRD → TechSpec → tasks, categorias, faixas
de tamanho, integridade dos gates, ciclo de vida de artefatos compartilhados, lanes, caminho crítico
e a sequência dos checkpoints.

Cada `<num>_task.md` deve conter: `status: pending`, `slice_type`, user stories, visão e valor,
fluxo ponta a ponta, arquivos concretos, subtarefas, dependências, decisões fechadas, limites de
decisão, ambiguidades, convenções da stack e critérios de sucesso com evidência observável.
