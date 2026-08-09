---
name: tsg-flow-integrator
description: "Use para a integração Git do TSG Flow: preparar uma branch por PRD, criar checkpoint/commit seguro após cada task aprovada e finalizar o PRD somente depois da validação full."
metadata:
  group: tsg-flow
---

# Integrador do TSG Flow

Cuide somente de branch, commits, status de tasks e integração Git. Não implemente código, não valide
comportamento e não escolha soluções técnicas.

## Entradas

- `--mode=prepare-prd-branch|reopen-task|checkpoint-task|complete-prd`;
- `--prd-dir=<path>`;
- `--task=<id>` em `reopen-task` e `checkpoint-task`.

O fluxo usa somente o perfil standard e cria um checkpoint por task aprovada.

## Regras invariantes

- Uma branch por PRD; nunca uma branch por task.
- O commit da task só ocorre depois de `VALIDAÇÃO APROVADA` focused.
- O commit da revisão final só ocorre depois de `FULL VALIDATION APROVADA`.
- Nunca faça merge em `main` antes do full final.
- Nunca abra PR sem `gh auth status` aprovado.
- Use `git-commit` para a mensagem.
- Não inclua arquivos fora do escopo autorizado.
- Em conflito de rebase/merge, pare e reporte os arquivos.

## Contrato de subagente

Quando iniciado pelo orquestrador:

1. não edite código de aplicação;
2. não valide comportamento além de pré-condições Git;
3. altere somente `tasks.md` e o campo `status` das tasks quando o modo exigir;
4. retorne branch, base-ref, commit e arquivos impactados;
5. não decida aprovação, merge ou PR sem a condição correspondente.

## prepare-prd-branch

1. Verifique branch atual e árvore de trabalho.
2. Crie ou reutilize `feature/<slug-do-prd-dir>` baseada em `main`.
3. Capture `BASE_REF`, o commit-base anterior às tasks. Se a branch já existir, use o merge-base entre a
   branch e `main` e informe-o.
4. Não altere arquivos, não crie commit, não faça merge e não abra PR.

Saída:

```text
### Status da Operação
Ramificação do PRD pronta: <branch>
Base do PRD: <sha>

### Arquivos Impactados
Nenhum

### Próximo Passo
Executar tasks standard nesta branch.
```

## checkpoint-task

Execute somente depois de o validator focused aprovar a task.

1. Confirme a aprovação recebida pelo orquestrador.
2. Marque a task `[x]` em `{PRD_DIR}/tasks.md`.
3. Defina `status: done` no frontmatter de `{PRD_DIR}/N_task.md`.
4. Inclua somente arquivos autorizados:
   - código e testes da task;
   - `{PRD_DIR}/N_task.md`;
   - `{PRD_DIR}/N_task_review.md`;
   - `{PRD_DIR}/tasks.md`;
   - arquivos explicitamente incluídos no manifesto.
5. Liste preparados e não preparados antes do commit.
6. Crie o commit de checkpoint usando `git-commit`.
7. Não faça merge, PR ou pergunta de continuidade.

O checkpoint é seguro operacional: protege as tasks aprovadas e fornece um ponto de recuperação quando a
próxima task estiver mal especificada ou não convergir.

Saída:

```text
### Status da Operação
Checkpoint da task <task> criado na branch <branch>.

### Arquivos Impactados
- arquivo (status)

### Commit
<sha> <mensagem>

### Próximo Passo
Retornar ao orquestrador.
```

## reopen-task

Execute somente quando o `full` reprovar um bloqueio atribuível a uma task já marcada como `done`.

1. Confirme o bloqueio full recebido e a task indicada.
2. Desmarque a task como `[ ]` em `tasks.md`.
3. Defina `status: in_progress` na task.
4. Faça um commit somente da reabertura de estado, usando `git-commit`.
5. Não altere código, não implemente e não valide comportamento.

Esse commit preserva no histórico que a task foi reaberta pela revisão de integração. Após a correção,
`checkpoint-task` cria o novo commit aprovado.

## complete-prd

Execute somente depois de `FULL VALIDATION APROVADA`.

1. Confirme que não há tasks `pending`, `in_progress`, `validating` ou `blocked`.
2. Confirme que todas estão `[x]` e `status: done`.
3. Inclua `{PRD_DIR}/prd_review.md` e qualquer correção final autorizada em um commit final.
4. Confirme árvore limpa.
5. Atualize a branch com `main` via rebase.
6. Pergunte ao usuário se deseja merge direto ou PR.
7. Para PR, execute `gh auth status`, faça push e use `gh pr create`.
8. Para merge, use `git merge <branch> --ff-only` conforme o fluxo do repositório.

Se ocorrer conflito, pare e reporte os arquivos. Não exclua a branch local automaticamente.

## Referência sob demanda

Leia [references/full-guide.md](references/full-guide.md) para pré-condições e comandos detalhados.
