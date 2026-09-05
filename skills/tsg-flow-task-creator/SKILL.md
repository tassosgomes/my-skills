---
name: tsg-flow-task-creator
description: Converte PRD e TechSpecs aprovadas em tasks verticais, com dependências e gates executáveis. Use para gerar o plano TSG Flow persistido; não para discovery de produto nem implementação.
metadata:
  group: tsg-flow
  pipeline_stage: tasks
  requires:
    - "tasks/prd-[slug]/prd.md"
    - "techspec.md e/ou frontend-techspec.md aprovadas"
  produces:
    - "tasks/prd-[slug]/tasks.md"
    - "tasks/prd-[slug]/<num>_task.md"
---

# Task Creator

Crie o menor conjunto de tasks que preserve comportamento coeso, contexto suficiente e feedback
executável. Não implemente código nesta skill.

## Entradas e seleção

- PRD e pelo menos uma especificação aprovada no diretório da feature.
- Backend/sem UI: `techspec.md`; frontend isolado: `frontend-techspec.md`;
  full-stack: ambas. Não exija documento backend para frontend isolado.
- Registre em `tasks.md` quais specs foram consumidas e sua revisão. Se o PRD exige ambos os lados
  e falta uma spec, não entregue plano parcial como completo.
- Não consuma drafts nem specs `Em Revisão`. Uma aprovação explícita pode ser registrada antes
  do handoff; existência de arquivo sozinha não comprova aprovação.
- Herde baseline, contrato e ADRs pertinentes em `docs/adr/` por referência.

## Preparação

1. Leia as specs selecionadas e o PRD. Extraia requisitos, fatias, artefatos e decisões.
2. Confirme a stack em evidências do repositório. Use a lista de skills da TechSpec como orientação;
   consulte somente módulos necessários para resolver lacunas de planejamento, testes ou qualidade.
3. Leia [references/vertical-slicing.md](references/vertical-slicing.md) para dividir comportamentos.
4. Ao gerar, use [templates/tasks-template.md](templates/tasks-template.md) e
   [templates/task-template.md](templates/task-template.md).

## Contrato da task

Cada task começa com `status: pending` e declara `slice_type`, `verification_type`,
`blocked_by`, `parallelizable`, `gate_command`, `gate_test_selector` e `gate_expected_result`.

| Tipo | Evidência | Comando de gate |
|---|---|---|
| `vertical` + `behavioral` | Teste focalizado do comportamento; zero testes reprova | `scripts/ai-flow/gate.sh --filter="<selector>"` |
| `enabling` + `static` | Build/lint/typecheck ou verificação estática específica | `scripts/ai-flow/gate.sh --static` mais a evidência específica declarada |
| `enabling` + `behavioral` | Teste do habilitador quando aplicável | Gate com filtro |

O selector é `N/A` somente em verificação estática justificada. `--skip-tests` é diagnóstico,
não evidência de conclusão. Todo tipo de task recebe validator focused no perfil standard.

Inclua caminhos para criar/modificar/referenciar, skills estritamente pertinentes, contexto necessário,
decisões fechadas, limites de decisão e critérios verificáveis. Referencie ADRs duráveis; não copie
seu conteúdo integral. Ambiguidades materiais devem ser resolvidas antes do estado pending.

## Coesão e dependências

- Uma task vertical entrega um comportamento com código, testes, erros e observabilidade pertinente.
- Todo arquivo, teste, fixture ou comando usado para compilar/validar deve preexistir ou ser produzido
  pela própria task ou dependência anterior declarada. Proíba dependências futuras e ciclos.
- Um teste preexistente só serve se houver seleção isolável e referência explícita.
- Build/lint não substituem teste de comportamento. Habilitadores precisam justificar por que não
  cabem na fatia e indicar qual comportamento desbloqueiam.
- `--target-model-tier=budget|frontier` é opcional, padrão budget. Como orientação, budget cria
  4–8 arquivos/modifica 1–4 com até 6 subtarefas; frontier cria 6–12/modifica 1–6 com até 8.
  Preserve coesão e compilação acima dessas heurísticas; não fragmente para cumprir contagem.
- `low`: configuração simples; `medium`: fatia coesa; `high`: acoplamento irredutível.
  High exige revisão do plano; reutilize revisão explícita já realizada para a mesma task.
- Se habilitadores ou high dominarem o plano, revise a decomposição.
- Registre oportunidades paralelas como informação de planejamento. O executor standard é sequencial.

## Validação e persistência

1. Cruze RF/user stories → tasks e inventários de todas as specs → tasks.
2. Verifique categorias aplicáveis: setup, dados, negócio, interfaces, integrações, erros, testes,
   observabilidade, documentação e segurança. N/A exige justificativa, não uma task artificial.
3. Verifique `artefato → primeira produtora → consumidoras`, dependências, coesão e gate executável.
   Não confunda um comando planejado com teste já executado.
4. Grave `tasks.md` e `<num>_task.md` para cada task. Releia, remova placeholders e confira
   consistência entre frontmatter, critérios e resumo.
5. Explique o plano com links, cobertura, ordem e pendências. Não repita os arquivos completos.
6. Se execução já foi autorizada, encaminhe ao orquestrador; caso contrário, encerre com o plano
   disponível para revisão. Não peça novamente aprovação já concedida.
