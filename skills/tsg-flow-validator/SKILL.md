---
name: tsg-flow-validator
description: Revisa uma task TSG Flow ou o diff completo do PRD sem corrigir código. Use focused na primeira revisão, revalidation após correções e full sobre a branch preparada para integração.
metadata:
  group: tsg-flow
---

# Validator

Valide sem editar código, status, tasks ou commits. Produza relatórios com bloqueantes e recomendações
separados. Somente falhas essenciais e bloqueantes reprovam.

## Entradas

- `--prd-dir=<path>`, `--mode=focused|revalidation|full` (padrão focused).
- `--task=<id>` em focused/revalidation; `--base-ref=<sha>` em full.
- Revalidation recebe o relatório anterior. Full recebe a branch já atualizada com a base alvo.

## Gate antes da revisão

Em focused/revalidation, leia o frontmatter da task para obter `task_kind`, `gate` e
`gate_expect`, e a seção **Verificações do projeto** para os checks adicionais. Rode as
verificações antes de carregar material semântico:

- **task:** execute o `gate` declarado, sem alterá-lo, e compare a saída com `gate_expect`.
  Execute separadamente os checks obrigatórios de **Verificações do projeto** para os componentes
  tocados. Em task legada, descubra-os no CI ou nos scripts do projeto atual.
- **full:** identifique os componentes alterados e os jobs obrigatórios acionados no CI do projeto
  atual. Leia também os workflows reutilizáveis e parâmetros efetivos quando existirem. Execute
  localmente os passos reproduzíveis de build e teste, inclusive lint, format, cobertura e seus
  limites. Sem CI, use os comandos de verificação publicados pelo projeto e registre a ausência
  de esteira. Classifique os passos não reproduzíveis e os observacionais no relatório; não chame
  uma execução parcial de espelho completo do CI.

**O exit code é o veredito.** `0` aprova; qualquer outro reprova. Não interprete a saída para
contornar um exit code: um runner que sai `5`, `8` ou `9` por filtro vazio está reprovando a task,
não relatando um detalhe. Falha de ambiente, comando inexistente ou dependência indisponível é
`VALIDATION ERROR` — nem aprova nem reprova o código.

`gate_expect` não substitui o exit code: ele detecta o caso em que o comando sai `0` mas não
provou o que deveria (contagem de testes menor que a esperada, por exemplo). Divergência entre
saída e `gate_expect` reprova mesmo com exit `0`.

Comando de diagnóstico — pular testes, `--dry-run`, execução parcial no lugar de um check
obrigatório — nunca vira aprovação.
Em repositório sem suíte comportamental, declare a limitação explicitamente no relatório em vez
de aprovar por build. Task legada pode trazer `gate_command`/`gate_test_selector`: leia os campos
equivalentes. Use compute/infra conforme instruções locais.

A revisão independente usa worker fresco. Não reutilize aprovação do implementer como revisão
semântica. O padrão é executar o gate; reutilização futura exigiria igualdade demonstrada de código,
comandos, dependências, ambiente e evidência, não apenas um mesmo SHA.

Execute checks em primeiro plano. Se uma ferramenta retornar uma sessão ou processo assíncrono,
aguarde sua conclusão e registre o exit code antes do veredito. Falha de um check não dispensa os
demais checks independentes; dependência indisponível é `VALIDATION ERROR`.
Se instruções locais exigirem o wrapper `rtk`, use `rtk proxy` para preservar os argumentos
originais dos comandos de gate e check.

## Modos

- **focused:** revise task, diff desde o checkpoint, untracked do escopo e skills pertinentes.
  Se a task altera cliente de rede ou composição de dependências, confira evidência que exercita o
  adaptador real e a partida da aplicação. Abra trechos das specs/contrato/ADRs somente quando uma
  verificação exigir.
- **revalidation:** execute evidências, confira bloqueios anteriores e regressões no diff novo.
  Acrescente uma seção de revalidação ao relatório; não rederive observações sem mudança relevante.
- **full:** revise diff desde a base preparada, rastreabilidade de todas as specs selecionadas,
  contratos entre tasks, integração, segurança, arquitetura e regressões. Rode a suíte agregada.
  Registre uma matriz por componente com fonte de CI, passos obrigatórios, comandos, resultados,
  limites e commit/árvore validados. Aprovação exige cada passo obrigatório aplicável concluído.
  Execute o **sensor de discriminação** (abaixo). Consulte design-patterns Review se disponível e
  pertinente; recomendações de refatoração não bloqueiam por preferência. Não crie abstrações nem
  aplique correções.

Quebra de jornada exigida pelo PRD, contrato ou check obrigatório do CI é bloqueante, mesmo que
surja inicialmente como recomendação. Se o CI já falhava na base, registre a comparação; a full
continua reprovada enquanto um job obrigatório acionado reprovar.

## Sensor de discriminação (modo full)

A suíte passar prova que o código não quebrou os testes. Não prova que os testes testam algo.
O sensor fecha essa lacuna: injeta falhas de comportamento e confirma que a suíte as detecta.
Execute-o depois de os checks obrigatórios passarem; uma falha anterior já determina o veredito.

1. **Isole.** Trabalhe em `git worktree add` temporário ou em cópias dos arquivos.
   **Nunca use `git stash`** nem edite a árvore real — uma interrupção no meio deixaria o
   repositório do usuário alterado.
2. **Registre a linha de base.** Capture `git status --porcelain` e o HEAD antes de começar.
3. **Mute o comportamento, não a sintaxe.** Derive cada mutação de um critério de aceite da spec:
   inverta uma condição de guarda, troque o limite de uma fronteira, remova o efeito colateral
   (evento não gravado, campo não persistido), devolva o código de erro errado, ignore um filtro.
   Mutação que só quebra compilação não mede nada.
4. **Cubra o que a feature entrega.** Uma mutação por fatia vertical, priorizando regra de negócio
   e caso negativo. Não mute código de terceiros, gerado ou fora do diff.
5. **Rode a suíte focalizada** de cada fatia contra sua mutação. O teste **deve falhar**.
6. **Descarte e confirme.** Remova o worktree ou restaure as cópias e verifique que
   `git status --porcelain` e o HEAD voltaram exatamente à linha de base. Divergência é
   `VALIDATION ERROR`, não aprovação.

**Veredito.** Mutante que sobrevive é **bloqueante**: a fatia tem teste que não discrimina
comportamento. Registre no relatório o arquivo, a linha, a mutação aplicada, o critério de aceite
correspondente e o teste que deveria ter falhado. Cada sobrevivente vira task de correção —
corrigir o teste, nunca enfraquecê-lo ou removê-lo.

Sem ferramenta de execução ou sem suíte comportamental, declare a limitação explicitamente no
relatório. Não declare o sensor executado quando ele não rodou.

## Evidência e resultados

Task: `{PRD_DIR}/N_task_review.md`. PRD: `{PRD_DIR}/prd_review.md`.
Registre comandos/resultados, escopo, bloqueantes com arquivo/linha e recomendações.
No full, registre `base_ref`, `validated_commit` (HEAD revisado) e `validated_tree`.
Confirme que HEAD e código não mudaram durante a revisão; mudanças exigem nova validação.

Resultados: `VALIDAÇÃO APROVADA|VALIDAÇÃO REPROVADA`,
`FULL VALIDATION APROVADA|FULL VALIDATION REPROVADA` ou `VALIDATION ERROR`.
Aprovação com recomendações continua sendo aprovação, com contagem explícita.

Quando receber `--result-file` e `--run-id`, escreva JSON final no schema fornecido pelo transporte,
outcome `approved|rejected|validation_error`; inclua `Run: <run-id>` no relatório da chamada.
Full aprovado inclui commit, árvore e base revisados no resultado estruturado.
Não crie telemetria paralela; duração/tentativa podem ficar no próprio relatório.

Leia [references/full-guide.md](references/full-guide.md) para evidência e casos de integração.
