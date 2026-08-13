---
name: tsg-flow-task-creator
description: >
  Gera listas de tarefas abrangentes e detalhadas para implementação, baseadas em PRD e Especificação
  Técnica. Use esta skill sempre que o usuário quiser criar tarefas de implementação, quebrar uma
  funcionalidade em tasks, gerar um plano de execução, criar tickets de desenvolvimento, ou decompor
  trabalho técnico. Também dispare quando o usuário disser "criar tarefas", "gerar tasks", "quebrar
  em tarefas", "plano de implementação", "o que preciso implementar", "gerar tickets", ou qualquer
  variação que indique a necessidade de transformar um PRD/TechSpec em trabalho executável. Esta skill
  é a terceira etapa do pipeline PRD → TechSpec → Tasks. Requer que o PRD e a TechSpec já existam.
  As tarefas geradas são persistidas em arquivos, explicadas para consumo por agentes de código
  (Cursor, Claude Code, etc.) e priorizam fatias verticais com feedback por comportamento.
metadata:
  group: tsg-flow
  pipeline_stage: tasks
  requires:
    - "tasks/prd-[slug]/prd.md"
    - "tasks/prd-[slug]/techspec.md"
  produces:
    - "tasks/prd-[slug]/tasks.md"
    - "tasks/prd-[slug]/<num>_task.md"
---

# Task Creator

Gera tarefas de implementação detalhadas, com validação cruzada de cobertura, otimizadas para agentes de código. Cada tarefa contém caminhos de arquivo concretos, contexto de implementação e critérios verificáveis por máquina.

## Templates

Antes de gerar, leia os templates empacotados nesta skill:
- `templates/tasks-template.md` — formato do resumo de tarefas
- `templates/task-template.md` — formato de cada tarefa individual

Leia também [references/vertical-slicing.md](references/vertical-slicing.md) antes de dividir o
trabalho. A conversa serve para explicar o resultado, mas os arquivos gravados são a fonte de
verdade para o Orquestrador e para os agentes de código.

## Entradas e Saídas

- **PRD requerido:** `tasks/prd-[nome-funcionalidade]/prd.md`
- **TechSpec requerida:** `tasks/prd-[nome-funcionalidade]/techspec.md`
- **Resumo de saída:** `tasks/prd-[nome-funcionalidade]/tasks.md`
- **Tarefas individuais:** `tasks/prd-[nome-funcionalidade]/<num>_task.md`

### Contrato de persistência e explicação

Esta skill DEVE produzir os arquivos acima; não encerre entregando apenas uma lista no chat.
Antes de responder ao usuário:

1. Crie o diretório da feature se necessário e escreva `tasks.md` usando o template.
2. Escreva um arquivo `<num>_task.md` para cada tarefa principal, sempre com `status: pending`.
3. Releia os arquivos gravados e confirme que cada task tem contexto suficiente para um agente
   implementar sem reconstruir a intenção a partir do PRD inteiro.
4. Remova placeholders do template e substitua cada comando genérico por uma verificação real ou
   por `N/A — [justificativa]` quando a categoria não se aplica.
5. Só depois apresente o resumo e peça confirmação para iniciar a implementação. A confirmação
   controla apenas o início da execução; o plano já deve estar disponível no filesystem.

Se a TechSpec estiver com `Status: Em Revisão` ou `Handoff: draft`, pare antes de gerar tasks finais;
um plano executável só pode consumir `techspec.md` aprovada.

**Parâmetro opcional:** `--target-model-tier=budget|frontier` (padrão `budget`)

Define a faixa de tamanho por tier. Tasks são executadas por um agente de código
com contexto e capacidade finitos; o tamanho da task deve caber no modelo que vai
implementá-la. Na dúvida, use `budget`, mas preserve primeiro a unidade mínima que compila e pode
ser provada por um gate próprio. Tasks pequenas demais também prejudicam a execução quando separam
código de seu teste, criam estados intermediários inválidos ou dependem de artefatos futuros.

## Pré-requisitos

Confirmar que ambos os documentos existem. Se a TechSpec estiver faltando, informar o usuário para usar a skill `tsg-flow-techspec-creator` primeiro.

## Etapas do Processo

### 1. Descoberta de Skills de Stack (Obrigatório — Primeira coisa a fazer)

As tarefas geradas devem incluir detalhes técnicos alinhados com as skills de linguagem/framework disponíveis. Siga este processo:

**A) Identificar a stack:**
- Verificar a seção "Skills de Referência" da TechSpec — ela já lista quais skills foram consultadas
- Se o usuário especificou a stack explicitamente, usar essa indicação
- Se a TechSpec não tem a seção, inferir a partir do Inventário de Artefatos (extensões de arquivo: `.cs` → csharp, `.tsx` → react, `.java` → java)

**B) Ler as skills relevantes para geração de tarefas:**
Consulte OBRIGATORIAMENTE os SKILL.md das seguintes skills da stack identificada:

| Domínio | Skill a Consultar | Como Influencia as Tasks |
|---------|-------------------|--------------------------|
| Testes | `[stack]-testing` | Define padrões de teste, frameworks, estrutura de arquivos de teste, convenções de naming |
| Qualidade | `[stack]-code-quality` | Define convenções que devem aparecer nos critérios de sucesso |
| Production Readiness | `[stack]-production-readiness` | Define checklist de prontidão que pode gerar tarefas adicionais |
| Observabilidade | `[stack]-observability` | Define padrões de logging/métricas que devem aparecer nas subtarefas |
| Arquitetura | `[stack]-architecture` | Confirma estrutura de pastas para os caminhos de arquivo nas tasks |

As skills de `common/` (design-patterns, restful-api) já devem ter sido consultadas pela TechSpec. Releia-as apenas se necessário para detalhar uma tarefa específica.

**C) Registrar as skills consultadas:**
Inclua no `tasks.md` uma seção "Skills de Stack Consultadas" listando quais skills foram lidas.

**Override manual:** Se o usuário indicar uma stack diferente da inferida, use a stack indicada.

### 2. Analisar PRD e Especificação Técnica

- Extrair requisitos e decisões técnicas
- Identificar componentes principais
- Identificar explicitamente as user stories cobertas por cada tarefa principal
- Extrair o **Inventário de Artefatos** da TechSpec (seção que lista todos os arquivos/componentes a criar ou modificar)
- Extrair o **Mapa de Fatias Verticais** e os checkpoints de feedback da TechSpec
- Se a TechSpec não tiver esse mapa, reconstruí-lo a partir de comportamentos do PRD e registrar a
  lacuna; nunca usar o inventário de camadas como substituto de uma fatia

### 3. Varredura por Categorias Obrigatórias (Não pule esta etapa)

Antes de gerar qualquer tarefa, verifique se o plano cobre TODAS as categorias abaixo. Para cada categoria, gere pelo menos uma tarefa OU declare explicitamente "N/A — [justificativa]":

As categorias abaixo são uma lente de cobertura, não uma ordem de agrupamento. Não crie uma task
"modelos", "validators" ou "testes" só para preencher uma linha: inclua esses elementos na fatia
vertical do comportamento que eles sustentam.

| # | Categoria | O que verificar | Skill de Stack Relacionada |
|---|-----------|-----------------|---------------------------|
| 1 | **Setup / Configuração** | Variáveis de ambiente, configs, feature flags, docker-compose, migrations iniciais | `[stack]-dependency-config` |
| 2 | **Modelos de Dados** | Entidades, schemas de banco, migrations, seeds | `[stack]-architecture` |
| 3 | **Lógica de Negócio** | Cada regra/requisito funcional do PRD deve virar pelo menos uma tarefa | `[stack]-architecture` |
| 4 | **Endpoints / Interfaces** | Cada endpoint ou interface da TechSpec precisa de tarefa | `common/restful-api` |
| 5 | **Integrações Externas** | Serviços terceiros, SDKs, webhooks, filas | `[stack]-dependency-config` |
| 6 | **Validações e Erros** | Input validation, error handling, edge cases documentados no PRD | `[stack]-code-quality` |
| 7 | **Testes** | Unitários, integração, e2e — como subtarefas dentro de cada tarefa principal | `[stack]-testing` |
| 8 | **Observabilidade** | Logs, métricas, alertas, health checks | `[stack]-observability` |
| 9 | **Documentação** | API docs, README, variáveis de ambiente, runbook | — |
| 10 | **Segurança** | Autenticação, autorização, sanitização de inputs, rate limiting | `[stack]-production-readiness` |

### 4. Gerar Estrutura de Tarefas

- Começar pelo menor comportamento demonstrável do mapa de fatias e expandir por valor entregue
- Organizar sequenciamento por fatias, com dependências mínimas e checkpoints de feedback
- Definir trilhas paralelas somente quando os arquivos e contratos forem realmente independentes
- Colocar controller/handler, regra, persistência, integração, teste e observabilidade da mesma
  jornada na mesma task, usando a faixa de arquivos como alerta de revisão, não como corte mecânico
- Criar uma tarefa horizontal apenas como `enabling` quando ela for tecnicamente inevitável; registrar
  a razão, o menor escopo e a fatia que ela desbloqueia
- **Aplicar a Coesão e Viabilidade do Gate (etapa 4A) a cada tarefa antes de prosseguir**

### 4A. Coesão e Viabilidade do Gate (Obrigatório — Regra Dura)

O gate define a fronteira da task. Uma task principal só é válida quando deixa o repositório em
estado compilável e possui evidência executável que prova exatamente o incremento entregue.

**Regras duras de gateabilidade:**

1. Todo arquivo, teste, fixture, comando, módulo ou script citado no checkpoint DEVE existir antes
   da task por uma dependência declarada, ou ser criado/modificado pela própria task.
2. Nunca usar no gate um teste criado por uma task futura. Nunca criar uma dependência circular na
   qual A valida com artefato de B e B é bloqueada por A.
3. Toda task de comportamento DEVE criar ou modificar o teste focalizado que a comprova. Exceção:
   teste preexistente que já ofereça caso/método/tag isolado e esteja listado em `Referência`.
4. O comando do gate DEVE selecionar um caso identificável por classe+método, tag, caminho ou filtro
   determinístico. Executar somente uma suíte compartilhada inteira não prova isolamento da task.
5. `compile`, `build`, `lint`, busca textual ou inspeção manual podem validar tasks `enabling`, mas
   não substituem teste comportamental em task `vertical`.
6. Nenhuma task pode exigir um arquivo produzido depois dela para compilar ou testar. Registre todas
   as dependências de artefato em `blocked_by`.
7. Checkpoints vagos como "validar exemplos", "verificar manualmente" ou "testar depois" são
   proibidos. Declare comando completo, seleção do teste e resultado esperado.

**Faixas orientativas de tamanho:**

| Indicador | `budget` (padrão) | `frontier` |
|---|---|---|
| Arquivos a **criar** | 4–8 | 6–12 |
| Arquivos a **modificar** | 1–4 | 1–6 |
| Subtarefas | ≤ 6 | ≤ 8 |
| Fatias verticais por task `vertical` | **exatamente 1** | 1 |

As faixas não são limites mecânicos. Acima da faixa, tente dividir por comportamento independente;
abaixo dela, verifique se houve microfragmentação. Preserve uma task maior quando a separação
romperia compilação, transação, teste ou gate. Registre no `tasks.md` a justificativa de coesão
para qualquer task acima da faixa.

**Regra de tamanho mínimo:** DTO, mapper, exception, interface, entity, repository, configuração ou
contrato isolado não constitui fatia vertical. Incorpore-o ao comportamento que o consome. Uma task
abaixo da faixa só permanece separada quando for `enabling` inevitável com gate estático próprio ou
quando entregar comportamento independente com teste focalizado próprio.

**Fatia vertical, nunca camada.** Uma tarefa é uma fatia vertical quando entrega um
comportamento observável de ponta a ponta para *um* recurso ou regra. Agrupar por
camada arquitetural ("todos os endpoints", "todos os validators", "todos os
handlers") é o modo de falha mais comum e mais caro desta skill.

Toda task deve declarar `slice_type: vertical` ou `slice_type: enabling`. Tasks `vertical` seguem a
regra de exatamente uma fatia. Tasks `enabling` são exceções horizontais temporárias: só podem existir
quando nenhum comportamento observável pode ser entregue sem o habilitador, devem ter o menor escopo
possível e precisam apontar a fatia desbloqueada. Se habilitadores passarem de aproximadamente 20%
do plano, reavalie a decomposição antes de finalizar.

```
❌ ERRADO  10.0 Expor as 20 operações Minimal API
           → 8 arquivos, 9 subtarefas, 4 user stories, bloqueada por 2 tasks
           → não paralelizável "para evitar colisão de rotas/DTOs"

✅ CERTO   10.0 Endpoints de política comercial (5 operações)
           10.1 Endpoints de acomodação (5 operações)
           10.2 Endpoints de tarifa comercial (4 operações)
           10.3 Endpoints de validação/submissão/histórico (3 operações)
           10.4 Endpoint de métricas (1 operação)
           → arquivos disjuntos, logo TODAS paralelizáveis entre si
```

Se a justificativa de `parallelizable: false` for "evita colisão de arquivos/DTOs/rotas", revise a
fronteira. Pode haver fatias independentes que devem ser quebradas, ou microtasks que deveriam ser
fundidas ao incremento que altera o arquivo compartilhado. Colisão real de contrato deve ser
resolvida por uma tarefa anterior somente quando esse contrato tiver validação autônoma.

**Calibração de `complexity`** — o campo precisa discriminar, não ser constante:

| Valor | Critério | Consequência |
|---|---|---|
| `low` | 1 arquivo, configuração/wiring, sem regra de negócio | validação só pelo gate determinístico |
| `medium` | fatia vertical coesa, gate focalizado e tamanho gerenciável | fluxo padrão |
| `high` | acoplamento irredutível (agregado de domínio, migration com dados, invariante transversal) | **exige revisão humana do plano antes de implementar** |

`high` é exceção. Se mais de ~20% das tarefas forem `high`, o critério está sendo
mal aplicado ou a fragmentação está grosseira — revise antes de finalizar.

### 5. Gerar Arquivos de Tarefas Individuais

- Criar arquivo para cada tarefa principal usando `templates/task-template.md`
- **Toda tarefa nasce com `status: pending`** no frontmatter YAML. Esse campo alimenta
  o painel Kanban do usuário e é atualizado durante a execução por `tsg-flow-orchestrator`
  (`in_progress`, `validating`, `blocked`) e `tsg-flow-integrator` (`done`). Valores canônicos:
  `pending` | `in_progress` | `validating` | `blocked` | `done` — nunca gere um alias.
- Detalhar subtarefas e critérios de sucesso
- Declarar `gate_command`, `gate_test_selector` e `gate_expected_result`; usar `N/A` para selector
  somente em task `enabling`, com justificativa
- Incluir caminhos de arquivo concretos em cada tarefa
- Declarar as decisões fechadas, limites de decisão e ambiguidades bloqueantes antes de finalizar a task
- **Na seção "Detalhes de Implementação" de cada task, incluir as convenções relevantes das skills de stack** — ex: padrão de teste da skill de testing, padrão de error handling da skill de code-quality

### 5A. Persistir e revisar os arquivos (Obrigatório)

Após gerar o conteúdo, escreva imediatamente:

- `tasks/prd-<slug>/tasks.md`, com o mapa de fatias, checkpoints de feedback e validações cruzadas;
- um `<num>_task.md` por tarefa principal, com `slice_type`, comportamento observável e critérios
  verificáveis.

Releia cada arquivo do disco. A explicação de uma task deve permitir que o implementer entenda o
valor entregue, o fluxo ponta a ponta, os arquivos exatos, as decisões que não pode reinventar e o
checkpoint que provará a fatia. Se a única evidência for "a camada foi criada", a task é horizontal:
reagrupe-a numa fatia ou marque-a como `enabling` com justificativa explícita.

### 6. Validação Cruzada (Obrigatório — Não pule esta etapa)

Antes de finalizar, execute esta checagem e inclua o resultado no `tasks.md`:

**A) Cobertura de Requisitos Funcionais:**
Para cada requisito funcional numerado do PRD, verifique se existe pelo menos uma tarefa que o cobre:

```
| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01     | 2.0     | ✅ Coberto |
| RF-02     | —       | ❌ GAP → Criar task |
```

Se houver GAPs, crie as tarefas faltantes ANTES de finalizar.

**B) Cobertura de Componentes da TechSpec:**
Para cada componente/artefato listado no Inventário de Artefatos da TechSpec, verifique se existe tarefa de implementação:

```
| Artefato | Task | Status |
|----------|------|--------|
| src/services/auth.service.ts | 3.0 | ✅ |
| src/middleware/rate-limit.ts  | —   | ❌ GAP |
```

**C) Cobertura de Categorias:**
Confirme que todas as 10 categorias obrigatórias foram endereçadas (tarefa ou N/A explícito).

**D) Coesão, tamanho e integridade do gate:**

Gere estas tabelas no `tasks.md`. Nenhuma linha de integridade pode ficar com ❌ na versão final:

```
| Task | slice_type | Criar | Modificar | Subtarefas | Fatias | Faixa | Justificativa |
|------|------------|-------|-----------|------------|--------|-------|---------------|
| 1.0  | vertical   | 7     | 2         | 5          | 1      | ✅ | Dentro da faixa budget |
| 2.0  | vertical   | 10    | 3         | 6          | 1      | ⚠️ | Coesão transacional e um único teste E2E |

| Task | Gate | Teste/fixture existe no momento da task? | Filtro isolado? | Repo compilável? | Dependência futura? | Status |
|------|------|-------------------------------------------|-----------------|-------------------|---------------------|--------|
| 1.0  | `./gradlew test --tests 'X.y'` | Sim, modificado na task | Sim | Sim | Não | ✅ |
```

Construa também uma tabela `artefato → primeira task produtora → tasks consumidoras` para testes,
fixtures e arquivos compartilhados. Detecte referência antes da produção, ciclo ou consumidor sem
`blocked_by` e corrija o plano. Feche com a distribuição de `complexity`. Se `high` passar de ~20%
do total, declare por que cada `high` é acoplamento irredutível — ou refragmente.

**E) Entrega vertical e feedback:**

- toda task `vertical` tem exatamente um comportamento observável, uma jornada ponta a ponta e um
  checkpoint executável sem esperar as outras tasks;
- o teste focalizado é criado/modificado na mesma task, ou existe por dependência anterior declarada;
- o filtro do gate seleciona somente o caso/método/tag da task e falha quando selecionar zero testes;
- nenhum código da task importa, instancia ou executa artefato que será produzido por task futura;
- o checkpoint contém comando, cenário, saída esperada ou evidência concreta — "testar depois" não
  é checkpoint;
- testes, validações, observabilidade e documentação específica da jornada estão na própria task;
- toda task `enabling` explica por que não pode ser incorporada a uma fatia, qual é seu menor escopo
  e qual fatia desbloqueia;
- não há uma task que agrupe a mesma camada para vários comportamentos independentes.

## Otimização para Agentes de Código

Como o consumidor principal é um agente de código, cada tarefa DEVE incluir:

1. **Caminhos de arquivo concretos** — na seção "Arquivos Envolvidos":
   - `Criar:` arquivos novos com caminho completo (seguindo a estrutura da skill de arquitetura)
   - `Modificar:` arquivos existentes que serão alterados
   - `Referência:` arquivos para consultar mas não alterar
   - `Skills:` skills de stack que o agente deve consultar ao implementar esta tarefa

2. **Critérios de sucesso verificáveis por máquina** — comandos ou verificações que o agente pode executar, alinhados com as skills de testing/code-quality:
   - Comandos de teste: `dotnet test --filter "ClassName=AuthServiceTests"` ou `npm test -- --grep "AuthService"`
   - Verificações de compilação: `dotnet build` ou `npm run build`
   - Verificações de lint: `dotnet format --verify-no-changes` ou `npm run lint`
   - Respostas esperadas de endpoint: `POST /api/v1/auth → 200 com token JWT`

3. **Contexto de implementação** — snippets de código, assinaturas de função ou interfaces relevantes da TechSpec copiados diretamente na tarefa, **incluindo convenções das skills de stack** (ex: "Seguir o padrão de Repository definido em `dotnet-architecture`").

4. **Prontidão para implementação** — cada task deve deixar explícito:
   - decisões de negócio e arquitetura já fechadas;
   - limites para decisões que o implementer pode tomar usando padrões existentes;
   - dependências que precisam estar concluídas;
   - ambiguidades bloqueantes, que devem ser `Nenhuma` antes de a task entrar em `pending`.

5. **Feedback incremental** — cada task deve indicar a menor demonstração ou comando que valida o
   comportamento entregue e o que ainda ficará fora do escopo daquele checkpoint.

## Diretrizes de Criação de Tarefas

- Agrupar tarefas por **fatia vertical de domínio**, nunca por camada arquitetural
- Ordenar tarefas logicamente, com dependências antes de dependentes
- Tornar cada tarefa principal independentemente completável **e independentemente validável**:
  se o gate determinístico não conseguir provar a tarefa isoladamente, funda-a ao incremento que
  fornece o teste ou redefina a fronteira; não crie uma microtask sem gate próprio
- Tornar cada tarefa pronta para preflight: uma lacuna que mude comportamento, contrato, dados ou arquitetura deve ser resolvida no PRD/TechSpec antes da execução
- Respeitar as regras duras de gateabilidade da etapa 4A; tratar contagem de arquivos como heurística
- Definir escopo e entregáveis claros para cada tarefa
- Incluir testes como subtarefas dentro de cada tarefa principal
- Amarrar cada tarefa principal às user stories do PRD sempre que possível
- Fazer o feedback aparecer depois de cada fatia vertical; não agrupar tarefas para só validar no
  fim de todas as camadas

## Análise de Paralelização

Para a análise de execução paralela, considere:
- Verificação de duplicação de arquitetura
- Análise de componentes faltantes
- Validação de pontos de integração
- Análise de dependências e identificação de caminho crítico
- Oportunidades de paralelização e lanes de execução

## Diretrizes Finais

- Assuma que o leitor principal é um **agente de código** (Cursor, Claude Code)
- Para funcionalidades grandes (>10 tarefas principais), sugira divisão em fases
- Use o formato X.0 para tarefas principais, X.Y para subtarefas
- Indique claramente dependências e marque tarefas paralelas
- **Nunca finalize sem executar a Validação Cruzada (Etapa 6), incluindo a checagem D de gate**
- **Nunca finalize com uma task cujo teste ou compilação dependa de artefato futuro**
- Prefira a menor quantidade de tasks que preserve comportamento coeso, contexto gerenciável e
  gate focalizado; tanto tasks grandes demais quanto microtasks geram loops implementer↔validator
- **Cada tarefa deve referenciar as skills de stack relevantes** para que o agente de código possa consultá-las durante a implementação

Após completar a análise, persistir e reler todos os arquivos necessários, apresente os resultados ao
usuário e aguarde confirmação para prosseguir com a implementação. Não implemente código nesta skill.
