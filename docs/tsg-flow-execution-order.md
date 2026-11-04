# TSG Flow — ordem de execução

Use a rota que corresponde ao trabalho. As skills de definição produzem arquivos; o Orchestrator
coordena a implementação depois que o plano está pronto. Caminhos abaixo são relativos ao projeto alvo.

## 1. Dimensione a mudança

**A complexidade determina a profundidade — não existe pipeline fixo.** Antes de iniciar uma
feature, dimensione o escopo e aplique somente os artefatos que ele exige.

| Escopo | O que é | PRD | TechSpec | Tasks | Execução |
|---|---|---|---|---|---|
| **Pequeno** | ≤3 arquivos, uma frase descreve | Parágrafo no chat ou `_idea.md` | Pular | Pular | Implementar + gate |
| **Médio** | Feature clara, <10 tasks | PRD enxuto | **Inline** — decidir ao implementar, sem `techspec.md` | **Implícitas** | Implementar + gate por comportamento |
| **Grande** | Multi-componente, fronteiras novas | PRD completo | `techspec.md` | `tasks.md` + arquivos | Orchestrator com checkpoint por task |
| **Complexo** | Ambiguidade real, domínio novo, contrato externo | PRD + discovery | `techspec.md` + contrato | Tasks + fases | Orchestrator + validação full |

1. **PRD e verificação existem sempre.** É preciso saber o que construir e provar que foi
   construído. O que varia é a forma, não a existência.
2. **TechSpec é pulada** quando não há decisão arquitetural nova, contrato novo nem padrão novo —
   o desenho acontece durante a implementação.
3. **Tasks são puladas** quando há ≤3 passos óbvios.
4. **Contrato de API** entra sempre que a feature cria ou altera API consumida por outro time ou
   pelo frontend, independente do tamanho.
5. **Orchestrator** entra a partir de Grande. Abaixo disso, o fluxo direto do projeto basta.

### Válvula de segurança

Mesmo quando as tasks foram puladas, comece a execução **listando os passos atômicos**. Se a lista
passar de 5 passos ou revelar dependências não triviais, **pare e crie `tasks.md`** — o
dimensionamento errou. Subir de nível é barato; descobrir no meio da implementação que o plano não
existia, não.

O inverso também vale: se um plano Grande gerar tasks que são todas `enabling`, a decomposição
está errada — revise antes de executar.

## 2. Escolha o ponto de entrada

São três, um por nível:

| Situação | Comece por |
|---|---|
| Correção pequena, ajuste pontual ou manutenção bem delimitada | Fluxo direto do projeto |
| Feature isolada com contexto suficiente | `tsg-flow-prd-creator`, sem estado de produto |
| Produto amplo sem fronteiras claras, ou premissa de produto que mudou | `tsg-flow-product` |
| Avançar ou retomar uma capacidade do backlog | `tsg-flow-next` |
| Plano de tasks aprovado | `tsg-flow-orchestrator` |

A ordem expressa dependências, não uma obrigação de recriar todos os documentos em cada feature.

## 3. Onde cada coisa mora

Duas raízes, com uma regra: o que é durável fica em `docs/`, o que é de uma entrega fica em `work/`.

```text
docs/
  product/
    flow-state.json            # progresso por capacidade, decisões em aberto, fundação
    vision.md
    domain-map.md
    architecture-baseline.md
    capabilities.md
    domains/<dominio>.md       # só para domínio com 2+ PRDs no horizonte
  adr/                         # decisões arquiteturais, numeração global
  product-decisions/           # decisões duráveis de produto
work/
  <cap-id>-<slug>/             # uma entrega; feature isolada usa só <slug>
    prd.md  contracts.md  api-contract.yaml  techspec.md  tasks.md  <num>_task.md
    run-state.json             # estado de execução do orchestrator
    <num>_task_review.md  prd_review.md  design/  evidence/
```

Há dois arquivos de estado, de donos diferentes: `docs/product/flow-state.json` é da
`tsg-flow-next`; `work/<dir>/run-state.json` é do orchestrator. A `next` lê o segundo para marcar a
capacidade como em execução ou concluída.

## 4. Definição do produto — `tsg-flow-product`

Uma vez por produto, depois por mudança de premissa. Uma etapa por invocação, parando na aprovação.

| Etapa | Saída | Origens |
|---|---|---|
| Visão | `docs/product/vision.md` | — |
| Domain Map | `docs/product/domain-map.md` | visão |
| Baseline arquitetural | `docs/product/architecture-baseline.md` | visão, Domain Map |
| Backlog de capacidades | `docs/product/capabilities.md` com IDs `CAP` | visão, Domain Map, baseline |

As quatro são obrigatórias nesta rota: o gate exige cada origem, e a `next` não trabalha sem backlog.
Quem não precisa delas está na rota de feature isolada.

## 5. Planejamento por capacidade — `tsg-flow-next`

A `next` verifica pré-requisitos, declara fatia e tamanho, e encadeia até o plano aprovado:

| Etapa | Quando | Quem |
|---|---|---|
| Domain doc | domínio com 2+ PRDs no horizonte visível | a própria `next` |
| PRD | sempre | `tsg-flow-prd-creator` |
| Contrato | integração HTTP, mensageria ou dados compartilhados criada ou alterada | `tsg-flow-contract-creator` |
| TechSpec | Grande ou Complexo; declare Backend, Frontend ou Full-stack no cabeçalho | `tsg-flow-techspec-creator` |
| Tasks | Grande ou Complexo | `tsg-flow-task-creator` |

O contrato sai do PRD e antecede a TechSpec. Para frontend sem API, declare N/A e dispense o
contrato. Quando o frontend depende de decisões do backend, resolva o backend primeiro.

Decisões arquiteturais novas ficam em `docs/adr/adr-NNN.md`, com numeração global; nunca dentro de
`work/`. Leia o [ciclo e retenção das ADRs](tsg-flow-guide.md#adrs-sobrevivem-ao-prd).

## 6. Preparação do repositório

Não existe script de gate a gerar. Cada task declara em `gate` o **comando real do projeto** — o
mesmo que o CI executa — e o exit code do comando é o veredito.

Antes de iniciar o fluxo, levante os comandos em `.github/workflows/`, `Makefile`, `package.json`
ou no build script, e confirme que o runner **falha sozinho quando o seletor não pega nenhum
teste** (`--minimum-expected-tests` no Microsoft.Testing.Platform, exit 5 no pytest, falha padrão
em Jest, Vitest, Surefire e Gradle). Onde o runner sair `0` com zero testes, quantifique a
expectativa em `gate_expect` para que a divergência reprove.

## 7. Execução — `tsg-flow-orchestrator`

Depois de revisar/aprovar o plano e autorizar a implementação:

```text
tsg-flow-orchestrator --prd-dir=work/cap-001-exemplo --profile=standard --delivery=branch
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

## 8. Retomada e encerramento

Retome o Orchestrator com o mesmo prd-dir. Ele lê run-state.json, tasks e Git e reconcilia a operação
interrompida. Ao fim, a `tsg-flow-next` traz o resultado para o estado de produto. Não reinicie do Vision nem gere o plano inteiro outra vez por trocar de conversa.

Após a entrega, mantenha ADRs e documentação operacional em docs/. O diretório em work/ pode ser
arquivado em uma operação separada, preservando contratos consumidos por tooling e links ativos.
Veja o [guia de contratos e retenção](tsg-flow-guide.md).
