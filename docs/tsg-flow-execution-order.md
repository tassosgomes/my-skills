# TSG Flow — ordem de execução

Use a rota que corresponde ao trabalho. As skills de definição produzem arquivos; o Orchestrator
coordena a implementação depois que o plano está pronto. Caminhos abaixo são relativos ao projeto alvo.

## 1. Escolha o ponto de entrada

| Situação | Comece por |
|---|---|
| Correção pequena, ajuste pontual ou manutenção bem delimitada | Fluxo direto do projeto, com planejamento breve se necessário |
| Feature isolada com contexto suficiente | PRD |
| Feature cujo PRD e specs já estão aprovados | Tasks, ou Orchestrator se o plano também estiver pronto |
| Produto amplo sem fronteiras claras | Vision → Domain Map |
| Evolução de produto já documentado | Reutilize documentos válidos; atualize somente a etapa cujas premissas mudaram |

A ordem expressa dependências, não uma obrigação de recriar todos os documentos em cada feature.

## 2. Definição do produto — normalmente uma vez, depois por mudança de premissas

| Ordem | Skill | Entrada | Saída e próximo uso |
|---|---|---|---|
| 1 | tsg-flow-vision-creator | Problema, públicos e escopo macro | vision.md |
| 2 | tsg-flow-domain-decomposer | Visão | context/domain-map.md |
| 3 | tsg-flow-architecture-baseline | Visão + Domain Map + arquitetura/ADRs existentes | context/architecture-baseline.md |
| 4, opcional | tsg-flow-capability-backlog | Visão + Domain Map; baseline quando existir | backlog/capabilities.md com IDs CAP |
| 5, por domínio necessário | tsg-flow-domain-creator | Visão + domínio selecionado no mapa + capacidades pertinentes | domains/<dominio>/domain.md |

O baseline define restrições consumidas pelas TechSpecs. O backlog é útil para priorizar MVP e fases.
Não detalhe todos os domínios antes de iniciar a primeira capacidade: comece pelos necessários à entrega.

## 3. Planejamento — por feature

| Ordem | Skill | Quando executar |
|---|---|---|
| 6 | tsg-flow-prd-creator | Definir comportamento, escopo e critérios de aceite da capacidade/feature |
| 7, condicional | tsg-flow-contract-creator | Criar/alterar API compartilhada. Reutilize contrato canônico já aprovado |
| 8, condicional | tsg-flow-techspec-creator | Escopo Grande/Complexo. Declare Backend, Frontend ou Full-stack no cabeçalho — um único documento |
| 9 | tsg-flow-task-creator | Consumir PRD e todas as specs necessárias aprovadas; gerar um único plano |

Para frontend com API, o contrato antecede a etapa 8. Para frontend sem API, declare N/A e dispense a
etapa 7. Escopo Pequeno/Médio dispensa a etapa 8 inteira (ver `tsg-flow-index`). Quando o frontend
depende de decisões do
backend, faça 8a primeiro. Serialize escritas nas ADRs e no diretório compartilhado.

As etapas 3, 8a e 8b reutilizam ADRs pertinentes. Decisões arquiteturais novas ficam em
`docs/adr/adr-NNN.md`, com numeração global; nunca dentro do diretório temporário do PRD.
Leia o [ciclo e retenção das ADRs](tsg-flow-guide.md#adrs-sobrevivem-ao-prd).

## 4. Preparação do repositório

Não existe script de gate a gerar. Cada task declara em `gate` o **comando real do projeto** — o
mesmo que o CI executa — e o exit code do comando é o veredito.

Antes de iniciar o fluxo, levante os comandos em `.github/workflows/`, `Makefile`, `package.json`
ou no build script, e confirme que o runner **falha sozinho quando o seletor não pega nenhum
teste** (`--minimum-expected-tests` no Microsoft.Testing.Platform, exit 5 no pytest, falha padrão
em Jest, Vitest, Surefire e Gradle). Onde o runner sair `0` com zero testes, quantifique a
expectativa em `gate_expect` para que a divergência reprove.

## 5. Execução — ponto de entrada único

Depois de revisar/aprovar o plano e autorizar a implementação:

```text
tsg-flow-orchestrator --prd-dir=tasks/prd-exemplo --profile=standard --delivery=branch
```

Este exemplo termina na branch local. Use delivery=pr ou delivery=merge quando esse destino estiver
autorizado. As linhas são invocações de skills no agente, não comandos de shell.

O Orchestrator executa internamente:

1. Integrator prepare-prd-branch.
2. Para cada task: Implementer preflight/implement → gate → Validator focused → Integrator checkpoint-task.
3. Em correção: Implementer fix → gate → Validator revalidation → checkpoint.
4. Depois de todas as tasks: Integrator prepare-integration (atualiza a branch com a base alvo).
5. Validator full sobre o resultado integrado.
6. Integrator complete-prd, conferindo revisão e base antes da entrega.

Se o full reprovar, reabra a task responsável, corrija, revise e faça checkpoint antes de repetir full.
Se código/base mudar depois do full, prepare integração e revalide. Nunca publique um rebase posterior
como se tivesse sido revisado anteriormente.

Os workers não devem ser chamados manualmente por rotina. Use-os diretamente apenas para operação
delimitada cujo contexto e pré-condições estejam disponíveis.

## 6. Retomada e encerramento

Retome o Orchestrator com o mesmo prd-dir. Ele lê flow-state.json, tasks e Git e reconcilia a operação
interrompida. Não reinicie do Vision nem gere o plano inteiro outra vez por trocar de conversa.

Após a entrega, mantenha ADRs e documentação operacional em docs/. PRD e tasks podem ser arquivados
em uma operação separada, preservando contratos consumidos por tooling e links ativos.
Veja o [guia de contratos e retenção](tsg-flow-guide.md).
