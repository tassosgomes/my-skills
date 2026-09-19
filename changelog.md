# Changelog das skills TSG Flow

## 2026-09-19 — `tsg-flow-index` removida

A skill roteava por uma tabela que apenas restatava a `description` de cada skill do fluxo, e sua
própria description colidia com a do `tsg-flow-prd-creator` ao disparar em "iniciar uma feature".
Os sete princípios que ela listava já estão operacionalizados dentro de cada skill criadora e
registrados na entrada de 2026-09-17 deste changelog.

O que era exclusivo dela virou orientação para humanos na seção 1 de
[docs/tsg-flow-execution-order.md](docs/tsg-flow-execution-order.md): a tabela de dimensionamento
Pequeno/Médio/Grande/Complexo, as cinco regras de quais artefatos cada escopo exige e a válvula de
segurança (mais de 5 passos atômicos ou dependência não trivial exige `tasks.md`). De 14 para
13 skills.

## 2026-09-17 — TSG Flow enxuto: do PRD à execução

### Objetivo

Reduzir a burocracia entre PRD e execução sem perder garantia de implementação. Os artefatos
passam a carregar só o que o modelo não deriva — comportamento, fronteira, decisão fechada e
evidência —, deixando estrutura, convenção e assinatura para as skills de stack no momento da
implementação. De 16 para 14 skills; 1.863 linhas removidas e 888 adicionadas.

### Princípios adotados

- **Um fato, um lar.** Cada informação vive em um documento; downstream referencia por ID ou
  âncora, nunca copia.
- **Seção sem conteúdo material é omitida**, não preenchida com "N/A" nem justificada.
- **Sem limite de extensão.** O documento encolhe cortando seção supérflua, nunca detalhe que
  remove ambiguidade. Removidos os limites de 1–2 parágrafos, 20 linhas, "1 linha" e 600–1.200
  palavras.
- **Regra estrutural vira verificação executável**, não checkbox.
- **Skills de fluxo são agnósticas a tecnologia.** Nenhuma referência a stack específica.

### Auto-sizing

Nova skill `tsg-flow-index`: dimensiona o fluxo em Pequeno, Médio, Grande e Complexo antes de
iniciar a feature. Médio dispensa TechSpec e tasks formais. Válvula de segurança: se a execução
listar mais de 5 passos atômicos, o dimensionamento errou — pare e crie `tasks.md`.

### TechSpec unificada

`tsg-flow-frontend-techspec-creator` foi removida. Passa a existir uma `techspec.md` por feature,
com escopo Backend, Frontend ou Full-stack declarado no cabeçalho e blocos condicionais. Motivo:
uma fatia vertical full-stack cruza UI e API — separar a spec por camada contradiz o fatiamento.
As duas specs tinham 10 seções idênticas por nome e o `adr-template.md` duplicado byte a byte.

Cortadas: Skills de Referência, Conformidade com Skills, Interfaces em código, Modelos de Dados em
código, Arquivos a Criar, Build Order, observabilidade genérica, estratégia de testes genérica e
Próximos Passos. Adicionadas: Riscos e Preocupações com `arquivo:linha` e mitigação obrigatória, e
a cadeia de verificação de conhecimento com cláusula anti-fabricação.

Template de 759 linhas (327 backend + 432 frontend) para 226, cobrindo os dois escopos.

### Tasks enxutas

Frontmatter de 16 campos para 5: `status`, `kind`, `blocked_by`, `gate`, `gate_expect`. Removidos
os campos que nenhuma skill lia (`<domain>`, `<scope>`, `<type>`, `complexity`,
`feedback_checkpoint`, `unblocks`, `static_evidence`, `parallelizable`), o `gate_test_selector`
que duplicava substring do comando e o `verification_type` derivável do gate.

Removidas do corpo as seções "Convenções da stack" e "Detalhes de Implementação" — copiavam a
skill de stack e a TechSpec para dentro da task. Template de 124 para 59 linhas.

### Gate: o comando do projeto, sem wrapper

`tsg-flow-gate-creator` foi removida, com `scripts/ai-flow/gate.sh`, seu contrato, o skeleton e a
referência .NET. A task passa a declarar o comando real do projeto — o mesmo que o CI roda — e o
exit code é o veredito.

Motivo: o gate existia principalmente para detectar filtro sem match parseando a saída do VSTest.
O Microsoft.Testing.Platform, exigido por `dotnet-testing`, já devolve exit 8 para zero testes e
exit 9 para `--minimum-expected-tests` violado. Jest, Vitest, Surefire, Gradle e pytest também já
falham por padrão. O wrapper reimplementava, com parse dependente de locale, uma garantia nativa.

A tabela de runners sobreviveu invertida: em vez de ensinar a contornar cada runner, aponta a
garantia nativa de cada um.

### Verificação

- Novo `tsg-flow-task-creator/scripts/validate_plan.py`: gate estrutural do plano em stdlib pura.
  Verifica frontmatter, contrato de gate, dependência futura, ciclo, paridade `tasks.md` ↔
  arquivos e cobertura de requisitos. Absorve os checkboxes de invariante que viviam em cada task.
  Fatia vertical exige `gate_expect` quantificado — é o que substitui o parse de saída do gate.
- `tsg-flow-validator` ganha **sensor de discriminação** no modo full: injeta falhas de
  comportamento em worktree isolada (nunca `git stash`), confirma que os testes as detectam e
  verifica que a árvore voltou à linha de base. Mutante sobrevivente é bloqueante e vira task.

### Notas de migração

- Planos com `frontend-techspec.md` continuam aceitos pelo Task Creator.
- Tasks legadas com `slice_type`, `verification_type`, `gate_command` e `gate_test_selector`
  continuam legíveis por implementer e validator.
- **Format escopado no diff** saiu junto com o gate e não tem substituto no fluxo. Projetos que
  dependiam dele precisam de `lint-staged`, hook de pre-commit ou `ratchetFrom` do Spotless, sob
  pena de falso positivo por débito pré-existente.

## 2026-09-17 — Skills .NET como guia de decisões, Minimal API, UUIDv7 e ArchUnitNET

### Objetivo

As skills .NET passam a registrar só as decisões e convenções do time. Conteúdo que ensinava C# ou
.NET (pares certo/errado de boas práticas universais, comandos básicos de CLI, explicação de
padrões e implementações completas de API de biblioteca) foi removido. Total de 6.574 para ~3.160
linhas.

### Novas decisões

- **Minimal API** substitui controllers: `{Agregado}Endpoints` com `MapGroup`, `TypedResults`,
  handlers estáticos nomeados e `ProducesProblem`; `AddValidation()` nativo não é usado.
- **UUIDv7** (`Guid.CreateVersion7()`) para Ids de entidade e de evento; `Guid.NewGuid()` e
  `DateTime.Now` banidos com `Microsoft.CodeAnalysis.BannedApiAnalyzers` + `BannedSymbols.txt`.
  O outbox passa a ser ordenado pelo Id.
- **ArchUnitNET** (`TngTech.ArchUnitNET.xUnitV3`) em `ProjectName.ArchitectureTests`, com regras
  para API simples, Monolito Modular e Microsserviços (`dotnet-testing/examples/architecture-tests.md`).
- **xUnit v3** no Microsoft.Testing.Platform (`global.json` com `test.runner`), `IAsyncLifetime`
  com `ValueTask` e `TestContext.Current.CancellationToken`.

### Correções de inconsistência

- Policies registradas com `Policies.*`/`Roles.*` também em `dotnet-program-setup`.
- Monolito Modular alinhado ao resto: Ids `Guid`, rotas `v1/...`, endpoints Minimal API.
- Resiliência HTTP unificada em `Microsoft.Extensions.Http.Resilience`.
- Volume do PostgreSQL 18 em `/var/lib/postgresql`.
- Testcontainers com imagem no construtor (`new PostgreSqlBuilder("postgres:18")`).

### Removidos

- `dotnet-code-quality/examples/best-practices.md`, `dotnet-dependency-config/examples/nuget-library.md`
  e `di-patterns.md` (lifetimes foram para o `SKILL.md`).
- `references/full-guide.md` de observability, performance e production-readiness; o que era
  decisão foi para o `SKILL.md`, e ficaram `observability/references/health-checks.md` e
  `production-readiness/references/deploy-gate.md`.

### Validação

Solution de rascunho em .NET 10.0.400 compilando o endpoint Minimal API, o `BannedSymbols.txt`
(erro RS0030 em `Guid.NewGuid()`), as fixtures xUnit v3 com Testcontainers e as regras ArchUnitNET do
exemplo; as regras detectaram as violações introduzidas de propósito.

## 2026-09-16 — Skills .NET alinhadas à organização do fc-api-catalog

### Objetivo

Adotar nas skills .NET a organização de projeto do `fc-api-catalog` (casos de uso por pasta,
SeedWork, testes espelhados com fixtures em camadas), sem levar os defeitos do projeto e sem
depender de bibliotecas com licença comercial ou de biblioteca própria.

### Arquitetura (`dotnet-architecture`)

- Layout `src/` + `tests/` com projetos `ProjectName.{Camada}` e um projeto de infraestrutura por
  tecnologia (`Infra.Data`, `Infra.Messaging`); removidas as pastas numeradas.
- Um caso de uso por classe em `Application/UseCases/{Agregado}/{CasoDeUso}/`, com interface
  própria injetada direto no controller. Removidos o CQRS com dispatcher e o Service Pattern
  simples (`cqrs.md`, `simple-service-pattern.md`); MediatR continua proibido.
- Novo `domain-model.md`: SeedWork, agregados com fábrica estática, eventos de domínio, validação
  por exceção e por notificação (substitui `clean-architecture.md`).
- Novo `use-cases.md` e `api-layer.md`: Input/Output, mapeamento manual `From{Entidade}`,
  envelope `data`/`pagination`, paginação `_page`/`_size`, JSON camelCase e actions sem sufixo
  `Async`.
- Repositório por agregado retorna `null`; `NotFoundException` é lançada pelo caso de uso.
  Infra depende só do Domain, exceto para implementar portas técnicas da Application.
- Tratamento de erros reescrito com `IExceptionHandler` + `IProblemDetailsService` e mapa de
  400/404/422/500.

### Dependências (`dotnet-dependency-config`)

- Mensageria com `RabbitMQ.Client` 7.x direto, no lugar de `Rmq.CloudEvents`.
- Novo `outbox-inbox.md`: outbox gravado pelo `UnitOfWork` na mesma transação, worker com
  `FOR UPDATE SKIP LOCKED` e publisher confirms, inbox como decorator para consumidores não
  idempotentes.
- Mapeamento manual como padrão; Mapster só com justificativa.
- `di-patterns.md` e o trecho de Unit of Work/repositório genérico do EF Core reescritos.

### Testes (`dotnet-testing`)

- Integração passa a ser caso de uso + repositório + `UnitOfWork` com PostgreSQL em
  Testcontainers; E2E passa a ser a API via `WebApplicationFactory` + Testcontainers. Playwright
  fica para projetos com front-end.
- Estrutura espelhada de `src/`, fixtures em camadas, `TestDataGenerator`, `DisplayName` + `Trait`
  e geradores de dados em `Tests.Common`.

### Qualidade e bootstrap

- `dotnet-code-quality`: pastas em PascalCase alinhadas ao namespace (antes `kebab-case`), pastas
  de agrupamento no plural e sufixo `Async` com exceção para actions de controller.
- `dotnet-program-setup`: extensões `AddUseCasesConfiguration`, `AddErrorHandlingConfiguration` e
  `AddControllersConfiguration`; mensageria registrando topologia e worker de outbox.
- `dotnet-index` e `README.md` atualizados.

### Coerência entre as skills .NET (segunda rodada)

- `dotnet-observability`: guia reescrito com `/health/live` e `/health/ready` separados por tag,
  checks de RabbitMQ e outbox, probes corretas, `ActivitySource`/`Meter` no caso de uso e scopes com
  convenções semânticas; removido controller com `try/catch` e stack trace em dados de health check.
- `dotnet-performance`: guia reescrito com projeções em interfaces de consulta, keyset, limites de
  `ExecuteUpdate`/`ExecuteDelete` frente a eventos de domínio, cache do Output com invalidação após
  commit e `AddStandardResilienceHandler` no lugar de `HttpPolicyExtensions`.
- `dotnet-production-readiness`: OpenTelemetry em `ObservabilityExtensions` com `UseOtlpExporter`,
  checklist com outbox, DLQ, migrations fora do boot e resiliência.
- `dotnet-dependency-config`: `RabbitMqTelemetry` com span de publish e process; `traceparent` salvo
  no outbox; `OutboxOptions` movido para `Infra.Data`; EF Core com `ProjectNameDbContext`, Ids
  gerados no domínio e auditoria por shadow properties.
- `dotnet-code-quality/examples/best-practices.md` e `dotnet-testing/examples/dev-containers.md`
  reescritos no padrão de casos de uso, Testcontainers e migrations.
- Identificadores, comentários de código, mensagens de log e de exceção passam a ser em inglês em
  todos os exemplos .NET, conforme a regra da `dotnet-code-quality`.

### Plataforma .NET 10

- .NET 10 (LTS) como versão oficial: `net10.0`, SDK em `global.json`, target framework em
  `Directory.Build.props` e versões de pacote centralizadas em `Directory.Packages.props`.
  .NET 8 e .NET 9 perdem suporte em 10/11/2026.
- Solution em `.slnx`, `dotnet-ef` e pacotes Microsoft/EF Core na major 10, Dev Container
  `dotnet:10.0`; removidas as ressalvas para .NET 8/9.
- `dotnet-program-setup`: Swashbuckle substituído por OpenAPI nativo (`AddOpenApi`/`MapOpenApi`) com
  Scalar como interface, só em Development.
- `restful-api`: geração de OpenAPI em .NET aponta para `Microsoft.AspNetCore.OpenApi`.

## 2026-08-12 — Lint Spectral para contratos OpenAPI

### Objetivo

Evitar que a `tsg-flow-contract-creator` entregue contratos OpenAPI 3.1 com exemplos depreciados
ou inconsistentes com JSON Schema.

### Mudanças

- Adicionado o ruleset `skills/tsg-flow-contract-creator/rulesets/openapi.yaml`, baseado em
  `spectral:oas`, com validações para OpenAPI 3.1, `example` depreciado em Schema Objects e
  `examples` como array nesse contexto.
- Adicionado o guia operacional `references/spectral.md`, incluindo o comando reproduzível com
  `npx @stoplight/spectral-cli`.
- Atualizada a `SKILL.md` para tornar o lint parte obrigatória da validação e do protocolo de saída.
- Atualizado o template OpenAPI para usar `examples`, mapas nomeados em Media Type Objects e
  união de tipos com `null` no lugar de `nullable`.

## 2026-08-08 — Renomeação dos creators para `tsg-flow-*`

### Objetivo

Alinhar as etapas de definição de produto e planejamento ao mesmo namespace das skills de execução
`tsg-flow-orchestrator`, `tsg-flow-implementer`, `tsg-flow-validator` e `tsg-flow-integrator`.

### Mudanças

- `flow-prd-creator` → `tsg-flow-prd-creator`.
- `flow-techspec-creator` → `tsg-flow-techspec-creator`.
- `flow-task-creator` → `tsg-flow-task-creator`.
- `flow-frontend-techspec-creator` → `tsg-flow-frontend-techspec-creator`.
- `flow-gate-creator` → `tsg-flow-gate-creator`.
- Promovidos para a fonte canônica os estágios `tsg-flow-vision-creator`,
  `tsg-flow-domain-decomposer`, `tsg-flow-domain-creator` e `tsg-flow-contract-creator`.
- As versões genéricas antigas foram preservadas em `snapshots/creators-pre-tsg-rename/` e não são
  mais skills ativas.
- Corrigidos os handoffs entre PRD, contrato, TechSpec, frontend e Tasks.
- Mantido o namespace `flow-qa-*` para o pipeline de QA, fora do escopo desta renomeação.

## 2026-08-08 — Fluxo standard por task com revisão full do PRD

### Objetivo

Simplificar o AI Flow para features médias e grandes descritas por PRD, TechSpec e tasks, mantendo
isolamento de responsabilidades e proteção Git sem gerar telemetria redundante.

### Mudanças de comportamento

- Removidos os perfis `fast` e `strict` do fluxo principal.
- `standard` tornou-se o único perfil: implementer, validator focused e integrator por task.
- O Plan Mode do harness fica como alternativa para alterações pequenas fora do AI Flow.
- O validator `focused` valida uma task por vez; não executa a auditoria completa do PRD.
- Adicionado `validator --mode=full` no encerramento, depois dos checkpoints de todas as tasks.
- O `full` revisa o diff inteiro contra a base do PRD, integração entre tasks, rastreabilidade,
  arquitetura, segurança, performance, regressões e testes.
- O `full` carrega `design-patterns` em modo Review e produz recomendações sem aplicar refatorações
  automaticamente.
- O integrator cria um checkpoint/commit após cada task aprovada. O commit é tratado como seguro de
  recuperação e não como obrigação de manter um PR com poucos commits.
- `prepare-prd-branch` retorna o `BASE_REF` usado pelo gate e pela revisão full.
- `complete-prd` só pode ocorrer após `FULL VALIDATION APROVADA`.
- Adicionado `reopen-task` para reabrir com commit de estado uma task concluída quando o full identificar
  um bloqueio atribuível a ela.

### Preflight e intervenção

- O implementer executa um preflight antes de editar código.
- O preflight retorna `TASK READY` ou `TASK BLOCKED`.
- Lacuna ou contradição material de PRD, TechSpec ou task interrompe o fluxo imediatamente e não consome
  uma tentativa de implementação.
- Foi adicionado o estado canônico `blocked` ao Kanban.
- `--max-attempts` assume `3` e aceita no máximo `5`.
- Falha de gate ou reprovação do validator conta como tentativa.
- Ao atingir o limite, o orquestrador preserva o último checkpoint, informa timeline, bloqueios e ação
  necessária e aguarda intervenção humana.
- O implementer não pode executar retries indefinidos dentro da própria chamada.

### Qualidade e memória

- Removidos `quality-ledger.jsonl`, `quality-ledger.md` e registros repetitivos de aprovação limpa.
- Relatórios de task e do PRD permanecem como evidência operacional focada.
- A memória padrão passa a ser composta por tasks, código e commits; decisões excepcionais ficam na
  sessão ou em relatório de bloqueio, sem diário automático.

### Contrato do gate

- Adicionado `--base=<ref>` para escopo de diff desde a base do PRD.
- Adicionado `--all-tests` para a suíte completa, reservado ao `full` final.
- `--filter=<expr>` continua sendo o caminho focused por task.
- O gate não executa a suíte completa por padrão.

### Arquivos principais alterados

- `skills/tsg-flow-orchestrator/`
- `skills/tsg-flow-implementer/`
- `skills/tsg-flow-validator/`
- `skills/tsg-flow-integrator/`
- `skills/flow-task-creator/`
- `skills/flow-gate-creator/`

## 2026-08-08 — Renomeação para a família `tsg-*`

As quatro skills do fluxo foram renomeadas para tornar explícito que esta é a versão final
customizada:

- `ai-flow-orchestrator` → `tsg-flow-orchestrator`
- `ai-flow-implementer` → `tsg-flow-implementer`
- `ai-flow-validator` → `tsg-flow-validator`
- `ai-flow-integrator` → `tsg-flow-integrator`

As referências ativas foram atualizadas. Snapshots e auditorias históricas que registram a
família `ai-*` foram preservados sem alteração.
