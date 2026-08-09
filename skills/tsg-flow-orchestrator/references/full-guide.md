# Referência completa — Orquestrador do TSG Flow

Use este guia para executar o ciclo standard de um PRD e controlar a revisão full de encerramento.

## Contrato de execução

Entradas:

- `--prd-dir=<path>`;
- `--profile=standard`, opcional;
- `--max-attempts=3..5`, padrão `3`.

O TSG Flow não é um executor genérico de tarefas pequenas. Use somente o perfil `standard`.

## Preparação

1. Leia `{PRD_DIR}/tasks.md`.
2. Encontre a primeira task `pending`; se houver `in_progress`, `validating` ou `blocked`, retome somente
   quando a execução interrompida ou a intervenção humana tiver sido resolvida.
3. Leia `{PRD_DIR}/N_task.md`.
4. Verifique `{PRD_DIR}/techspec.md` e informe sua existência; não carregue o documento inteiro sem lacuna.
5. Delegue ao integrator:

   ```text
   --mode=prepare-prd-branch
   --prd-dir={PRD_DIR}
   ```

6. Capture o `BASE_REF` retornado. Ele deve ser a base estável da branch antes dos commits de tasks e será
   usado pelo gate e pelo validator full.
7. Antes da primeira task com `complexity: high`, apresente o plano ao usuário e aguarde confirmação.

## Preflight da task

O implementer é responsável pelo preflight antes do código. O orquestrador deve respeitar seus resultados:

```text
TASK READY
```

ou:

```text
TASK BLOCKED
Categoria: planejamento
Evidência: ...
Ação necessária: ...
```

`TASK BLOCKED` não consome tentativa e interrompe imediatamente o PRD. O orquestrador deve marcar a task
como `blocked` e informar:

- task e título;
- motivo e evidências concretas;
- último checkpoint seguro;
- arquivos modificados, se houver;
- ação esperada do usuário.

Não peça ao implementer para adivinhar um contrato de negócio ausente.

## Estados e propriedade

| Transição | Dono | Momento |
|---|---|---|
| `pending` → `in_progress` | orchestrator | antes do preflight/implementação |
| `in_progress` → `validating` | orchestrator | após gate do implementer passar |
| `validating` → `in_progress` | orchestrator | validator focused reprovar |
| `in_progress`/`validating` → `blocked` | orchestrator | preflight, limite ou infraestrutura bloqueante |
| `validating` → `done` | integrator | checkpoint aprovado e commit criado |

O implementer e o validator nunca alteram status. O integrator nunca decide aprovação sem retorno do
validator.

## Tentativas

O contador é por task:

```text
Tentativa 1: implement → gate → focused validation
Tentativa 2: fix somente os bloqueios → gate → revalidation
Tentativa 3: fix somente os bloqueios → gate → revalidation
```

Regras:

1. O padrão é `max-attempts=3`.
2. O limite explícito máximo é `5`; nunca aceite um loop sem limite.
3. Falha do gate do implementer conta como tentativa e retorna ao orquestrador.
4. Falha de preflight não conta: é planejamento insuficiente.
5. Uma observação não bloqueante não gera nova tentativa.
6. Ao atingir o limite, não delegue novamente. Marque `blocked` e pare.

Relatório obrigatório do Gate de Intervenção:

```text
GATE DE INTERVENÇÃO — Task N
Tentativas: X/Y
Último checkpoint seguro: <sha>
Diagnóstico: <task mal especificada | não convergência | infraestrutura>
O que aconteceu:
- tentativa ...
Bloqueios atuais:
- ...
Arquivos não commitados: ...
Ação necessária: ...
```

O relatório da sessão e os commits são a memória operacional padrão.

## Ciclo focused por task

Para cada task:

### 1. Marcar progresso

Edite somente `status: in_progress` em `{PRD_DIR}/N_task.md`.

### 2. Implementar

Delegue:

```text
tsg-flow-implementer
--prd-dir={PRD_DIR}
--task=N
--mode=implement
--attempt=X/Y
```

Em correção, use `--mode=fix` e passe somente o retorno bloqueante e os arquivos citados pelo validator.

### 3. Validar

Depois de `TASK READY` e do gate do implementer passar:

1. defina `status: validating`;
2. delegue um validator fresco:

   ```text
   tsg-flow-validator
   --prd-dir={PRD_DIR}
   --task=N
   --mode=focused
   ```

3. aguarde `VALIDAÇÃO APROVADA` ou `VALIDAÇÃO REPROVADA`.

### 4. Corrigir ou interromper

Em reprovação:

- preserve o retorno bloqueante sem reescrevê-lo;
- se houver orçamento, defina `in_progress` e reenvie ao implementer em `fix`;
- se não houver, marque `blocked`, informe o usuário e não faça commit da task.

### 5. Checkpoint

Somente após aprovação focused, delegue:

```text
tsg-flow-integrator
--mode=checkpoint-task
--prd-dir={PRD_DIR}
--task=N
```

Verifique que o integrator:

- atualizou `tasks.md` com `[x]`;
- definiu `status: done`;
- incluiu código, task, tasks e relatório focused;
- criou o commit;
- retornou o hash e a branch.

O commit por task é um checkpoint de recuperação. Ele permite voltar ao último estado aprovado quando a
task seguinte estiver mal especificada ou quando uma tentativa precisar ser abandonada.

## Full do PRD

Após todas as tasks terem checkpoint:

1. não rebaseie ainda;
2. delegue ao validator sem `--task`:

   ```text
   tsg-flow-validator
   --prd-dir={PRD_DIR}
   --mode=full
   --base-ref={BASE_REF}
   ```

3. conte cada ciclo `full → correção → novo full` no contador do PRD;
4. pare e marque o PRD como bloqueado se o limite for atingido.

Se um bloqueio full puder ser associado a uma task, delegue primeiro:

```text
tsg-flow-integrator
--mode=reopen-task
--prd-dir={PRD_DIR}
--task=N
```

Depois corrija com implementer, valide focused e crie novo checkpoint antes de repetir o full. Se for uma
incompatibilidade entre tasks ou uma lacuna de planejamento sem task dona, pare e peça intervenção; não
invente uma nova solução no orquestrador.

O full deve produzir `{PRD_DIR}/prd_review.md` com:

- resultado do gate agregado;
- rastreabilidade PRD/TechSpec/tasks;
- integração entre tasks;
- arquitetura, segurança, performance e regressões;
- auditoria `design-patterns` em modo Review;
- bloqueantes;
- recomendações não bloqueantes;
- veredito.

## Encerramento

Somente após `FULL VALIDATION APROVADA`, delegue:

```text
tsg-flow-integrator
--mode=complete-prd
--prd-dir={PRD_DIR}
```

O integrator deve incluir `prd_review.md` em um commit final antes de rebasear a branch. Depois pergunta
se o usuário deseja merge direto ou PR.

## Subagentes

Em standard, a independência do validator significa worker/sessão fresca. Se a ferramenta de subagentes
não estiver disponível, informe que a revisão independente não pode ser garantida e peça autorização
explícita para continuar sequencialmente.
