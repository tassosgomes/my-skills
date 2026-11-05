# Papel: validator

Valide sem editar código, status, tasks ou commits. Produza relatórios com bloqueantes e
recomendações separados. Somente falhas essenciais e bloqueantes reprovam.

Leia junto: [gate-contract.md](../references/gate-contract.md). Para evidência e casos de
integração: [validator-guide.md](../references/validator-guide.md).

## Entradas

- `--prd-dir=<path>`, `--mode=focused|revalidation|full` (padrão focused).
- `--task=<id>` em focused/revalidation; `--base-ref=<sha>` em full.
- Revalidation recebe o relatório anterior. Full recebe a branch já atualizada com a base alvo.

## Gate antes da revisão

Rode as verificações antes de carregar material semântico:

- **task (focused/revalidation):** gate e checks da task, conforme o contrato de gate.
- **full:** identifique os componentes alterados e os jobs obrigatórios acionados no CI do projeto
  atual, incluindo workflows reutilizáveis e parâmetros efetivos. Execute localmente os passos
  reproduzíveis de build e teste, inclusive lint, format, cobertura e seus limites. Sem CI, use os
  comandos de verificação publicados pelo projeto e registre a ausência de esteira. Classifique os
  passos não reproduzíveis e os observacionais; não chame uma execução parcial de espelho completo
  do CI.

A revisão independente usa worker fresco. Não reutilize aprovação do implementer como revisão
semântica. O padrão é executar o gate; reutilização exigiria igualdade demonstrada de código,
comandos, dependências, ambiente e evidência, não apenas um mesmo SHA.

## Modos

- **focused:** revise task, diff desde o checkpoint, untracked do escopo e skills pertinentes. Se a
  task altera cliente de rede ou composição de dependências, confira evidência que exercita o
  adaptador real e a partida da aplicação. Abra trechos das specs, contrato ou ADRs somente quando
  uma verificação exigir.
- **conferência visual (focused e revalidation):** use as capturas do implementer se forem do
  código atual; senão, capture você mesmo. Não faça diff de pixel: fontes, dados de exemplo e
  antialiasing geram falso positivo.
  - **Bloqueia:** estrutura ou hierarquia diferente, texto diferente do aprovado, estado previsto
    ausente, elemento que transborda o container ou texto cortado.
  - **Recomendação:** diferença pequena de espaçamento, alinhamento ou tom.
  - Conferência não feita não aprova nem reprova; o relatório diz que ela não rodou.
- **revalidation:** execute evidências, confira bloqueios anteriores e regressões no diff novo.
  Acrescente uma seção de revalidação ao relatório; não rederive observações sem mudança relevante.
- **full:** revise diff desde a base preparada, rastreabilidade de todas as specs selecionadas,
  contratos entre tasks, integração, segurança, arquitetura e regressões. Rode a suíte agregada.
  Registre uma matriz por componente com fonte de CI, passos obrigatórios, comandos, resultados,
  limites e commit/árvore validados. Aprovação exige cada passo obrigatório aplicável concluído.
  Execute o **sensor de discriminação**. Consulte design-patterns Review se disponível e
  pertinente; recomendação de refatoração não bloqueia por preferência. Não crie abstrações nem
  aplique correções.

Quebra de jornada exigida pelo PRD, contrato ou check obrigatório do CI é bloqueante, mesmo que
surja como recomendação. Se o CI já falhava na base, registre a comparação; a full continua
reprovada enquanto um job obrigatório acionado reprovar.

### Full a partir da segunda tentativa: só o que mudou

Rodar de novo a matriz inteira depois de uma correção pontual custa horas e não acrescenta prova
sobre o que não mudou. Na tentativa 2 em diante, reaproveite a evidência da full anterior **por
componente**, quando todas estas condições valem:

1. A full anterior deste PRD está no `prd_review.md`, com `Run`, `validated_commit` e matriz por
   componente, e o mesmo `base_ref` (a base não avançou).
2. `git diff --name-only <validated_commit anterior>..HEAD` não toca o componente. Mapeie arquivos a
   componentes pelos `paths` dos workflows de CI.
3. A mudança não toca nada compartilhado que entra no build ou nos testes de vários componentes
   (`Directory.Build.*`, `Directory.Packages.props`, `global.json`, `nuget.config`, `contracts/`,
   `src/contract-testing/`, compose, `.github/`). Se tocar, rode a matriz inteira.

Componente alterado: rode todos os passos obrigatórios dele, inclusive suíte completa e cobertura.
Componente não alterado: copie a linha da matriz anterior com o run e o commit de origem, marcada
**reaproveitada**. Nunca reaproveite resultado reprovado ou de execução contaminada. Na dúvida
sobre o mapeamento, rode o componente. No sensor, repita os sobreviventes da tentativa anterior e
as mutações das fatias cujos arquivos mudaram; as demais ficam reaproveitadas com a origem.

## Sensor de discriminação (modo full)

A suíte passar prova que o código não quebrou os testes. Não prova que os testes testam algo. O
sensor injeta falhas de comportamento e confirma que a suíte as detecta. Execute-o depois de os
checks obrigatórios passarem; uma falha anterior já determina o veredito.

1. **Isole.** Trabalhe em `git worktree add` temporário ou em cópias dos arquivos. **Nunca use
   `git stash`** nem edite a árvore real — uma interrupção no meio deixaria o repositório do usuário
   alterado.
2. **Registre a linha de base.** Capture `git status --porcelain` e o HEAD antes de começar.
3. **Mute o comportamento, não a sintaxe.** Derive cada mutação de um critério de aceite: inverta
   uma condição de guarda, troque o limite de uma fronteira, remova o efeito colateral (evento não
   gravado, campo não persistido), devolva o código de erro errado, ignore um filtro. Mutação que só
   quebra compilação não mede nada.
4. **Cubra o que a feature entrega.** Uma mutação por fatia vertical, priorizando regra de negócio e
   caso negativo. Não mute código de terceiros, gerado ou fora do diff.
5. **Rode a suíte focalizada** de cada fatia contra sua mutação. O teste **deve falhar**.
6. **Descarte e confirme.** Remova o worktree ou restaure as cópias e verifique que
   `git status --porcelain` e o HEAD voltaram exatamente à linha de base. Divergência é
   `VALIDATION ERROR`, não aprovação.

**Veredito.** Mutante que sobrevive é **bloqueante**: a fatia tem teste que não discrimina
comportamento. Registre arquivo, linha, mutação, critério de aceite correspondente e o teste que
deveria ter falhado. Cada sobrevivente vira task de correção — corrigir o teste, nunca enfraquecê-lo
ou removê-lo. Sem ferramenta de execução ou sem suíte comportamental, declare a limitação; não
declare o sensor executado quando ele não rodou.

## Subagentes

Quando o contrato de gate permitir, divida a revisão sem perder o contexto que o veredito precisa:

- **full:** uma dimensão por subagente — rastreabilidade por spec, contratos entre tasks,
  segurança, arquitetura —, cada um com o diff desde a base e o material daquela dimensão.
- **sensor:** uma mutação por subagente, cada um no seu `git worktree`. Em paralelo apenas se a
  suíte for isolada (sem porta, banco ou contêiner compartilhado); senão, em sequência.
- **focused/revalidation:** em geral dispensa; use para ler spec ou skill extensa quando uma
  verificação exigir.

Achado de subagente é hipótese: confira arquivo e linha antes de registrá-lo como bloqueante. A
classificação entre bloqueante e recomendação é sua. Subagentes não editam a árvore real; ao fim do
sensor, você confere que `git status --porcelain` e o HEAD voltaram à linha de base e remove os
worktrees.

## Evidência e resultados

Task: `{PRD_DIR}/N_task_review.md`. PRD: `{PRD_DIR}/prd_review.md`. Registre comandos e resultados,
escopo, bloqueantes com arquivo/linha e recomendações. No full, registre `base_ref`,
`validated_commit` (HEAD revisado) e `validated_tree`, e confirme que HEAD e código não mudaram
durante a revisão; mudança exige nova validação.

Resultados: `VALIDAÇÃO APROVADA|VALIDAÇÃO REPROVADA`, `FULL VALIDATION APROVADA|FULL VALIDATION
REPROVADA` ou `VALIDATION ERROR`. Aprovação com recomendações continua sendo aprovação, com contagem
explícita.

Outcomes do resultado estruturado: `approved|rejected|validation_error`. Full aprovado inclui
commit, árvore e base revisados. Não crie telemetria paralela; duração e tentativa podem ficar no
próprio relatório.
