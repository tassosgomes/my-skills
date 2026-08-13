---
# status alimenta o painel Kanban. Valores canonicos (sempre escreva estes):
#   pending     -> 📋 A Fazer
#   in_progress -> ⚙️ Em Progresso
#   validating  -> 🔍 Em Validacao
#   blocked     -> ⛔ Bloqueado
#   done        -> ✅ Concluido
# Tarefas recem-criadas nascem sempre como `pending`.
status: pending
slice_type: vertical # vertical | enabling
parallelizable: false # Se pode executar em paralelo
blocked_by: [] # IDs de tarefas que devem ser completadas primeiro
---

<task_context>
<domain>engine/infra/[subdominio]</domain>
<type>implementation|integration|testing|documentation</type>
<scope>core_feature|middleware|configuration|performance</scope>
<!-- low: 1 arquivo, wiring/config, sem regra de negocio -> validacao so pelo gate
     medium: fatia vertical dentro do orcamento -> fluxo padrao
     high: acoplamento irredutivel -> EXIGE revisao humana do plano antes de implementar
     `high` e excecao. Se a maioria das tasks e high, a fragmentacao esta grosseira. -->
<complexity>low|medium|high</complexity>
<dependencies>external_apis|database|temporal|http_server</dependencies>
<unblocks>"[IDs de tarefas desbloqueadas]"</unblocks>
<feedback_checkpoint>[comando, cenario ou evidencia que valida esta task]</feedback_checkpoint>
<gate_command>[comando executavel completo]</gate_command>
<gate_test_selector>[classe+metodo, tag, caminho/filtro; N/A somente para enabling justificada]</gate_test_selector>
<gate_expected_result>[resultado deterministico esperado]</gate_expected_result>
<!-- Faixa orientativa budget: criar 4-8, modificar 1-4, subtarefas <=6. Gateabilidade e
     estado compilavel sao regras duras; nao fragmente apenas para cumprir contagem. -->
<vertical_slice>[o comportamento unico e observavel que esta task entrega; N/A para enabling]</vertical_slice>
</task_context>

# Tarefa X.0: [Titulo da Tarefa Principal]

## Relacionada as User Stories

- [US-XX] [Titulo da user story] ([cobertura direta|cobertura parcial|suporte])

## Visao Geral

[Breve descricao da tarefa, contexto, motivacao e valor que chega ao usuario ou ao sistema]

## Entrega Observavel

- **Entrada ou gatilho:** [request, evento, comando ou acao]
- **Resultado esperado:** [resposta, estado, evento, tela ou efeito observavel]
- **Checkpoint de feedback:** [comando/cenario + saida esperada]
- **Seletor focalizado:** [classe+metodo, tag ou caminho/filtro que seleciona somente esta task]
- **Fora deste checkpoint:** [o que ainda nao sera comprovado nesta task]

## Requisitos

- [Requisito 1]
- [Requisito 2]

## Arquivos Envolvidos

- **Criar:**
  - `[caminho/completo/do/arquivo.ext]`
  - `[caminho/completo/do/arquivo.test.ext]`
- **Modificar:**
  - `[caminho/completo/do/arquivo.ext]` ([descricao breve da alteracao])
- **Referencia:**
  - `[caminho/completo/do/arquivo.ext]` ([interface/tipo/config a consultar])
- **Skills para consultar durante implementacao:**
  - `[stack]-architecture` — [aspecto relevante, ex: "padrao de Repository"]
  - `[stack]-testing` — [aspecto relevante, ex: "convencao de naming de testes"]

## Subtarefas

- [ ] X.1 [Implementar o fluxo ponta a ponta da fatia]
- [ ] X.2 [Cobrir regra/caso negativo relevante]
- [ ] X.3 [Executar teste focalizado e registrar a evidencia]

## Sequenciamento

- Bloqueado por: [IDs ou "Nenhum"]
- Desbloqueia: [IDs]
- Paralelizavel: [Sim/Nao] ([justificativa])

## Rastreabilidade

- Esta tarefa cobre: [IDs das user stories]
- Evidencia esperada: [criterios de aceite, artefatos, testes ou docs que provam a cobertura]

## Detalhes de Implementacao

[Secoes relevantes da spec tecnica, incluindo o fluxo ponta a ponta, snippets de codigo, assinaturas
de interfaces e decisoes de design. Copie o contexto necessario aqui para que o agente de codigo nao
precise reconstruir a intencao consultando camadas sem relacao com esta fatia.]

**Convencoes da stack (das skills consultadas):**
- [Convencao 1 — ex: "Usar Repository Pattern conforme dotnet-architecture"]
- [Convencao 2 — ex: "Testes seguem padrao Arrange-Act-Assert conforme dotnet-testing"]
- [Convencao 3 — ex: "Logs estruturados com Serilog conforme dotnet-observability"]

## Prontidao para Implementacao

- **Decisoes fechadas:** [decisoes de negocio, contrato e arquitetura que o implementer nao deve inventar]
- **Limites de decisao do implementer:** [decisoes locais que podem seguir padroes existentes]
- **Dependencias disponiveis:** [tasks, componentes ou contratos que devem existir]
- **Artefatos exigidos pelo gate:** [para cada teste/fixture/script, indicar preexistente ou criado/modificado nesta task]
- **Dependencias futuras:** Nenhuma
- **Ambiguidades bloqueantes:** Nenhuma

## Criterios de Sucesso (Verificaveis)

- [ ] Teste focalizado passa: `[comando com classe+metodo, tag ou filtro especifico]`
- [ ] O seletor encontra pelo menos um teste e nao executa casos sem relação com esta task
- [ ] Build compila sem erros: `[comando de build]`
- [ ] [Verificacao funcional especifica — ex: endpoint responde 200 para request valido]
- [ ] [Verificacao de edge case — ex: endpoint responde 422 para input invalido]
- [ ] [Verificacao de qualidade — ex: lint passa sem warnings]
- [ ] Checkpoint de feedback executado: `[comando/cenario]` → `[saida esperada]`
- [ ] Todos os artefatos usados pelo gate existem antes da task ou foram criados/modificados nela
- [ ] Nenhum arquivo produzido por task futura e necessario para compilar ou validar esta task
- [ ] A evidencia acima prova somente esta fatia e nao depende de tasks futuras
