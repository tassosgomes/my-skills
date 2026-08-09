---
name: tsg-flow-orchestrator
description: "Use quando coordenar a execução sequencial de um PRD via TSG Flow: preparar a branch, executar tasks com implementer e validator focused, controlar tentativas, parar para intervenção e executar a revisão full no encerramento."
metadata:
  group: tsg-flow
---

# Orquestrador do TSG Flow

Coordene a entrega de um PRD médio ou grande sem implementar código, corrigir código, validar
comportamento ou fazer Git diretamente. O fluxo usa o perfil `standard` por task e uma revisão
`full` do PRD antes da integração final.

## Entradas

- `--prd-dir=<path>` é obrigatório.
- `--profile=standard` é opcional; `standard` é o único perfil suportado.
- `--max-attempts=3..5` é opcional e assume `3`.
- Use `{PRD_DIR}` como base. Um PRD usa uma única ramificação.

Ofereça somente `standard`. Alterações pequenas devem usar o Plan Mode do harness; o TSG Flow é reservado
para features organizadas em PRD, TechSpec e tasks.

## Modelo do fluxo

| Etapa | Responsável | Escopo |
|---|---|---|
| Preparar branch | integrator | uma branch e um commit-base por PRD |
| Implementar | implementer | uma task por vez, após `TASK READY` |
| Validar task | validator | revisão independente `focused` |
| Proteger trabalho | integrator | checkpoint/commit após cada task aprovada |
| Revisar feature | validator | `full` no diff completo do PRD |
| Finalizar | integrator | commit da revisão, rebase, merge ou PR |

## Invariantes

1. Leia `{PRD_DIR}/tasks.md` primeiro e execute uma task por vez.
2. `tasks.md` é a fonte de verdade para a ordem; reconcilie checkbox e frontmatter antes de avançar.
3. Execute o preflight do implementer antes de qualquer alteração de código.
4. Não trate uma ambiguidade de requisito como escolha técnica. Em dúvida material, pare e peça intervenção.
5. Use validator independente/fresco para a revisão `focused` quando houver subagentes disponíveis.
6. Nunca reescreva ou suavize o retorno bloqueante do validator.
7. O integrator é o único dono de status `done`, checkbox e commit.
8. Nunca pule o `full` do PRD antes de `complete-prd`.
9. Nunca continue após o limite de tentativas sem intervenção do usuário.
10. Antes da primeira task com `complexity: high`, apresente o plano ao usuário e aguarde confirmação.

## Tentativas e Gate de Intervenção

- O limite padrão é `3`; aceite no máximo `5` quando o usuário configurar explicitamente.
- Uma tentativa é uma execução do implementer seguida por gate/validação. Falha do gate determinístico
  também conta, mesmo que o validator semântico não seja chamado.
- Falha de preflight (`TASK BLOCKED`) não consome tentativa: é defeito de planejamento.
- O implementer não repete correções indefinidamente dentro da própria sessão; devolve o resultado ao
  orquestrador, que controla o contador.
- Ao atingir o limite, marque `status: blocked`, preserve o último checkpoint e pare.
- O relatório de parada deve informar task, tentativas, último commit seguro, timeline curta, bloqueios,
  arquivos não commitados, diagnóstico e ação esperada do usuário.
- Após o usuário corrigir a task, PRD ou TechSpec, inicie uma nova execução e preserve o histórico apenas
  na conversa e no relatório de intervenção.

## Inicialização

1. Leia `tasks.md` e encontre a próxima task `pending`, ou retome `in_progress`, `validating` ou `blocked`
   somente após a condição de retomada ser resolvida.
2. Leia `{PRD_DIR}/N_task.md` e verifique se `techspec.md` existe. Não carregue PRD/TechSpec inteiros sem
   lacuna concreta.
3. Delegue `tsg-flow-integrator --mode=prepare-prd-branch --prd-dir={PRD_DIR}` antes da primeira task.
4. Capture o `base-ref` retornado pelo integrator para a revisão full do PRD.
5. Inicialize o contador por task e o `full-attempt` do PRD.

## Ciclo por task

1. Defina `status: in_progress`.
2. Delegue `tsg-flow-implementer --mode=implement --task=N --prd-dir={PRD_DIR}` com o número da tentativa.
3. Se retornar `TASK BLOCKED`, defina `status: blocked`, informe o usuário e pare sem commit.
4. Se o gate do implementer reprovar, conte a tentativa; reenvie somente se ainda houver orçamento.
5. Defina `status: validating` e delegue `tsg-flow-validator --mode=focused --task=N` em worker independente.
6. Se reprovar e ainda houver tentativas, defina `status: in_progress` e delegue `--mode=fix` com somente
   os bloqueios recebidos.
7. Se aprovar, delegue `tsg-flow-integrator --mode=checkpoint-task --task=N`.
8. Confirme `status: done`, `[x]` em `tasks.md` e o hash do checkpoint antes de avançar.

O checkpoint é um seguro operacional: protege tasks já concluídas e permite abandonar uma task mal
especificada sem perder o trabalho anterior.

## Revisão Full do PRD

Quando não houver tasks pendentes:

1. Delegue `tsg-flow-validator --mode=full --prd-dir={PRD_DIR} --base-ref={BASE_REF}` sem `--task`.
2. O validator deve revisar o diff inteiro desde `BASE_REF`, a rastreabilidade PRD → TechSpec → tasks,
   as interações entre tasks, integração, arquitetura, testes, segurança e regressões.
3. Carregue `design-patterns` em modo Review. Identifique pressões reais de design, compare a solução
   atual com alternativa simples e padrões candidatos, mas não refatore automaticamente.
4. Classifique resultado como `APROVADA`, `APROVADA COM RECOMENDAÇÕES` ou `REPROVADA`.
5. Recomendações de refatoração não bloqueiam o PRD. Se um bloqueio full for atribuído a uma task já
   concluída, delegue `tsg-flow-integrator --mode=reopen-task --task=N`, depois corrija, valide focused e
   crie novo checkpoint.
6. Conte ciclos de correção do `full` com o mesmo limite; ao excedê-lo, marque o PRD como bloqueado e peça
   intervenção.
7. Somente após `FULL VALIDATION APROVADA`, delegue `complete-prd`.

## Estados

Use somente:

| Estado | Dono | Significado |
|---|---|---|
| `pending` | task creator | ainda não iniciada |
| `in_progress` | orchestrator | implementação ou correção em andamento |
| `validating` | orchestrator | aguardando validator focused |
| `blocked` | orchestrator | intervenção humana necessária |
| `done` | integrator | task aprovada e commitada |

Uma task bloqueada não deve ser marcada como concluída. Ao retomar após intervenção, reabra-a como
`in_progress` e reinicie o contador ativo.

## Execução com subagentes

Quando subagentes estiverem disponíveis:

1. mantenha a sessão atual como orquestrador;
2. use um worker de implementação e um worker fresco de validação;
3. aguarde cada retorno antes da próxima etapa;
4. não execute localmente uma etapa delegada;
5. se não houver isolamento suficiente para a independência do validator, informe a limitação antes de
   continuar em modo sequencial.

## Referência sob demanda

Leia [references/full-guide.md](references/full-guide.md) para contratos detalhados, preflight, tentativa,
revisão full e intervenção humana.
