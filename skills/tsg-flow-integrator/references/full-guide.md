# Referência completa — Integrador do TSG Flow

## Entradas

```text
--mode=prepare-prd-branch|reopen-task|checkpoint-task|complete-prd
--prd-dir=<path>
--task=<id>                    # reopen-task e checkpoint-task
```

O fluxo é standard por task, com checkpoint individual após cada aprovação.

## Branch e base do PRD

Use uma branch estável:

```text
feature/<slug-do-prd-dir>
```

Em `prepare-prd-branch`:

1. verifique árvore de trabalho e branch atual;
2. crie ou reutilize a branch;
3. não crie commit;
4. compute o commit-base:

   ```text
   git merge-base HEAD main
   ```

5. devolva esse SHA como `BASE_REF` ao orquestrador.

O validator usa o `BASE_REF` no full para comparar a entrega completa, mesmo que o `HEAD` já esteja no
checkpoint da última task.

## checkpoint-task

Pré-condição: retorno explícito `VALIDAÇÃO APROVADA` do validator focused para a mesma task.

Antes do commit:

1. atualize a checkbox correspondente em `{PRD_DIR}/tasks.md`;
2. altere somente o campo `status` para `done` em `{PRD_DIR}/N_task.md`;
3. confirme que `{PRD_DIR}/N_task_review.md` existe;
4. confirme que código e testes estão dentro dos arquivos autorizados;
5. liste arquivos staged e unstaged;
6. não inclua mudanças do usuário ou de outras tasks;
7. crie um commit usando `git-commit`;
8. devolva branch, SHA e arquivos.

Arquivos padrão do checkpoint:

- implementação e testes;
- task com status atualizado;
- `tasks.md`;
- relatório focused da task;
- outros artefatos expressamente autorizados.

## reopen-task

Pré-condição: o validator full atribuiu um bloqueio a uma task já concluída.

1. confirme a task e o bloqueio;
2. altere a checkbox para `[ ]`;
3. defina `status: in_progress`;
4. faça um commit somente de estado com `git-commit`;
5. retorne o hash ao orquestrador;
6. não edite código.

## Proteção contra task mal especificada

Se o implementer retornar `TASK BLOCKED`, não faça commit e não altere a task para `done`. O orquestrador
deve informar o usuário e preservar o checkpoint anterior.

Se houver alterações não commitadas da task bloqueada, não as descarte automaticamente. Liste-as e aguarde
decisão/limpeza segura; nunca use operação destrutiva sobre arquivos sem escopo confirmado.

## complete-prd

Pré-condições:

- todas as tasks estão `[x]`;
- todas têm `status: done`;
- não há task `blocked`;
- o validator devolveu `FULL VALIDATION APROVADA`;
- `prd_review.md` existe;
- a árvore está pronta para o commit final.

Procedimento:

1. inclua `prd_review.md` e correções finais autorizadas no commit final;
2. confirme `git status` limpo;
3. rebaseie a branch sobre `main`;
4. se houver conflito, pare e reporte;
5. pergunte:

   ```text
   Todas as tasks e a revisão full do PRD foram aprovadas. Deseja fazer merge direto em main ou abrir um PR?
   ```

6. Para PR:
   - execute `gh auth status`;
   - reporte o usuário autenticado;
   - faça push da branch;
   - execute `gh pr create`;
   - não use navegador nem API direta;
   - não exclua a branch local.

7. Para merge direto:
   - sincronize `main` conforme o fluxo do repositório;
   - execute `git merge <branch> --ff-only`;
   - faça push conforme autorizado;
   - pergunte antes de excluir branch local.

O integrator não executa a revisão full nem aplica recomendações de design patterns.
