---
name: tsg-flow-validator
description: "Use para validar uma task TSG Flow com revisão focused ou revisar o PRD completo no encerramento: executar gate determinístico, verificar aderência sem editar código e, no modo full, auditar integração e design."
metadata:
  group: tsg-flow
---

# Validador do TSG Flow

Valide sem corrigir código. Use `focused` depois de cada implementação e `full` somente depois que todas
as tasks do PRD tiverem sido implementadas e commitadas.

## Entradas

- `--prd-dir=<path>` é obrigatório.
- `--mode=focused|full|revalidation` é obrigatório e assume `focused` quando omitido.
- `--task=<id>` é obrigatório em `focused` e `revalidation`; não use em `full`.
- `--base-ref=<sha|ref>` é obrigatório em `full`.

Use somente o perfil standard; o custo é controlado pelo modo e pelo momento do fluxo.

## Contrato

- Nunca edite código de aplicação.
- Nunca altere status, tasks ou commits.
- Nunca faça merge ou abra PR.
- Rode o gate antes da revisão semântica.
- Reprove qualquer comando ou critério essencial que falhar.
- Somente bloqueantes reprovam; recomendações não bloqueantes não geram nova tentativa.
- Use worker/sessão fresca quando chamado como validator independente.

## Modos

### `focused`

Valide uma única task contra seu diff, critérios, referências, skills nomeadas e dependências visíveis.
Use o gate focado e não faça uma revisão geral do PRD.

### `full`

Valide o PRD inteiro contra `--base-ref`. Execute gate agregado com todos os testes declarados e a suíte
completa quando o gate do repositório oferecer esse caminho. Revise rastreabilidade, contratos entre tasks,
integração, arquitetura, segurança, performance, regressões e cobertura.

Carregue `design-patterns` em modo Review. Não aplique padrões automaticamente; produza recomendações
com evidências e trade-offs.

### `revalidation`

Use somente para revalidar bloqueios de uma task após correção. Não refaça uma revisão completa nem derive
novamente observações antigas.

## Saída

Para task:

```text
VALIDAÇÃO APROVADA
Escopo: focused
Gate: APROVADO
Bloqueantes: 0
Relatório: {PRD_DIR}/N_task_review.md
```

ou:

```text
VALIDAÇÃO REPROVADA
Escopo: focused
Etapa: gate|revisão
Bloqueios: ...
Retorno para o implementer: ...
Relatório: {PRD_DIR}/N_task_review.md
```

Para o PRD:

```text
FULL VALIDATION APROVADA
Recomendações: N
Relatório: {PRD_DIR}/prd_review.md
```

ou:

```text
FULL VALIDATION REPROVADA
Bloqueios: ...
Relatório: {PRD_DIR}/prd_review.md
```

Não gere telemetria paralela à revisão. Os relatórios focused e full são a evidência operacional.

## Referência sob demanda

Leia [references/full-guide.md](references/full-guide.md) para ordem de execução, revisão full, auditoria
de design e formato dos relatórios.
