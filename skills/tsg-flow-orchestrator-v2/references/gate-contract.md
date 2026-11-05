# Contrato de gate

Regras comuns ao implementer e ao validator. Cada papel acrescenta só o que é dele; nenhum dos dois
reescreve estas regras.

## Tipos de task

- `task_kind: vertical` — teste focalizado do incremento; o gate é um comando de teste com seletor e
  `gate_expect` quantifica os testes.
- `task_kind: enabling` — build, lint ou typecheck, com a evidência declarada em `gate_expect`. A
  aprovação registra `testes: não aplicável (enabling)`, nunca testes executados.
- Task legada com `slice_type`/`verification_type`/`gate_command`/`gate_test_selector` continua
  válida: leia os campos equivalentes. Sem tipo declarado, reconcilie com o planejamento antes de
  executar. Não altere o `task_kind` para contornar falha.

## Executar

1. Leia `gate` e `gate_expect` no frontmatter da task e os checks obrigatórios na seção
   **Verificações do projeto**. Em task legada, descubra os checks aplicáveis no CI ou nos scripts
   do projeto atual.
2. Execute o `gate` declarado **sem alterar o comando** e compare a saída com `gate_expect`.
3. Execute cada check obrigatório em comando separado e registre o exit code de cada um, inclusive
   depois de uma falha anterior. Uma falha não dispensa os checks independentes.
4. Use compute para builds e testes pesados e infra para serviços compartilhados quando o projeto
   tiver essas instruções. Preserve cwd, revisão e ambiente.

## Veredito

- **O exit code é o veredito.** `0` aprova; qualquer outro reprova — inclusive os códigos que o
  runner reserva para filtro sem match (`5`, `8`, `9`). Não interprete a saída para contornar um
  exit code.
- `gate_expect` detecta o comando que sai `0` sem provar o que deveria (contagem de testes menor
  que a esperada, por exemplo). Divergência entre saída e `gate_expect` reprova mesmo com exit `0`.
- Comando de diagnóstico — pular testes, `--dry-run`, execução parcial no lugar de um check
  obrigatório — nunca vira aprovação.
- Gate que não roda por ambiente, comando inexistente ou dependência indisponível é **erro de
  verificação** (o implementer devolve `GATE ERROR`; o validator, `VALIDATION ERROR`): não aprova
  nem reprova o código e não consome tentativa. Nunca adapte o comando para fazê-lo rodar.
- Sem suíte comportamental no repositório, declare a limitação no relatório em vez de aprovar por
  build.

## Primeiro plano e paralelismo

- Rode gate e checks em primeiro plano. Se uma ferramenta devolver sessão ou processo assíncrono,
  aguarde e registre o exit code antes de concluir.
- **Nunca encerre o turno com processo, shell ou monitor ainda rodando em segundo plano.** O
  transporte trata fim de turno sem resultado como falha, e a espera fica sem dono.
- Suítes de componentes diferentes podem rodar em paralelo, no máximo duas, cada uma com seus
  próprios contêineres. Nunca duas execuções da mesma suíte, nem duas suítes que compartilhem
  contêiner, banco ou porta. Falha que só aparece sob concorrência é confirmada numa execução
  isolada antes de virar bloqueante ou ser descartada.

## Conferência visual

Somente se a task tem a seção **Referência visual** (Figma ou mockup); sem ela, não se aplica.

- Cada cenário da tabela é aberto no navegador (Playwright), na largura indicada; a captura vai
  para `{PRD_DIR}/evidence/<task>/<tela-estado>.png`.
- Na mesma página, verifique que nenhum elemento transborda o container (`scrollWidth >
  clientWidth` em cards, células, botões e links) nem tem texto cortado.
- A referência é o PNG em `{PRD_DIR}/design/` quando existir; senão, o frame no Figma, quando houver
  acesso.
- Sem navegador ou sem acesso à referência, registre a limitação. Conferência não feita não é
  declarada feita.

O que fazer com a divergência é do papel: o implementer corrige; o validator classifica.

## Subagentes

Somente quando o pedido de transporte declarar sessão principal (Herdr) e o runtime oferecer
subagentes. Como subagente nativo (transporte padrão), não delegue.

- O gate e os checks obrigatórios são executados por você, na versão final do código. Resumo de
  subagente não é evidência de aprovação.
- Dê a cada subagente a task, os caminhos e uma pergunta delimitada, sem a conversa inteira.
- Relatório, resultado e `--result-file` ficam com você.

Os usos que valem a delegação estão em cada papel.

## Resultado estruturado

Com `--result-file` e `--run-id`, grave o JSON final no schema enviado no pedido de transporte,
somente depois de terminar e de salvar o relatório, com a linha `Run: <run-id>`. Ausência de schema
não autoriza inventar sucesso. Relatório antigo não é evidência da tentativa atual.
