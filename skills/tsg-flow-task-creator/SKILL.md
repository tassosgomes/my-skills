---
name: tsg-flow-task-creator
description: "Converte PRD e TechSpec aprovados em tasks verticais com dependências e gates executáveis. Use para gerar o plano TSG Flow persistido; não para discovery de produto nem implementação."
metadata:
  group: tsg-flow
  pipeline_stage: tasks
  requires:
    - "tasks/prd-[slug]/prd.md"
    - "tasks/prd-[slug]/techspec.md aprovada"
  produces:
    - "tasks/prd-[slug]/tasks.md"
    - "tasks/prd-[slug]/<num>_task.md"
---

# Task Creator

Crie o menor conjunto de tasks que preserve comportamento coeso e feedback executável.
Não implemente código nesta skill.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Conteúdo da task | Comportamento, fronteira, decisão fechada, gate e checks do projeto — nada de "como implementar" | A skill de stack entrega convenção e estrutura na hora da implementação |
| Gate | Comando real de teste da fatia, com seletor, declarado na task | Evidência de comportamento continua focalizada e verificável |
| Checks do projeto | Comandos aplicáveis ao componente alterado, separados do gate | Lint, format, cobertura e build não ficam ocultos por um `&&` que para no primeiro erro |
| Veredito | O exit code de cada comando | Contrato estável da ferramenta, imune a mudança de formato de saída |
| Metadado | Só o que alguma skill lê: `status`, `task_kind`, `blocked_by`, `gate`, `gate_expect` | Campo que ninguém consome é custo sem retorno |
| Invariante de plano | Verificado por `scripts/validate_plan.py`, não por checkbox na task | Regra em script não degrada quando o modelo esquece |
| Tamanho | Sem limite na seção **Comportamento** | É o "o quê" — a parte que não pode ficar ambígua |
| Fatia full-stack | Uma task cruza UI e API | Dividir por camada contradiz o fatiamento vertical |

## Entradas

- PRD e `techspec.md` aprovada no diretório da feature. A TechSpec é única e declara seu escopo
  (Backend, Frontend ou Full-stack); não exija documento separado por camada.
- Planos legados podem trazer `frontend-techspec.md`: consuma-a junto da `techspec.md` e registre
  que o plano veio do formato antigo.
- Não consuma drafts nem specs `Em Revisão`. Existência de arquivo não comprova aprovação.
- Herde baseline, contrato e ADRs em `docs/adr/` por referência, sem copiar conteúdo.

## Processo

1. Leia PRD e TechSpec. Extraia requisitos, fatias, decisões e arquivos a modificar.
2. Confirme a stack por evidências do repositório. Leia o CI **do projeto atual**, incluindo
   workflows reutilizáveis e parâmetros do chamador quando acessíveis. Identifique os checks
   obrigatórios para cada componente que as tasks alterarão (por exemplo, lint, format, testes,
   cobertura e build) e seus limites. Use scripts de build e convenções do projeto quando não
   houver CI; não invente um limite de cobertura.
   Use a evidência disponível para o estado da base; marque `não medido` quando não houver.
   Se houver falha herdada comprovada em um check exigido, planeje como resolver o bloqueio
   antes da integração. Não atribua automaticamente toda a dívida à primeira fatia que toca o
   componente.
3. Leia [references/vertical-slicing.md](references/vertical-slicing.md) para dividir comportamentos.
4. Gere `tasks.md` com [templates/tasks-template.md](templates/tasks-template.md) e um
   `<num>_task.md` por task com [templates/task-template.md](templates/task-template.md).
5. Rode o gate estrutural antes de apresentar o plano:

   ```
   python3 <skill-dir>/scripts/validate_plan.py tasks/prd-<slug>/
   ```

   `<skill-dir>` é o diretório desta skill. Não invoque `python3 scripts/...` a partir da raiz do
   projeto — lá não existe este script. Exit diferente de zero significa **pare e corrija**.
   Sem ferramenta de execução, faça as mesmas checagens lendo os arquivos.
6. Explique o plano com links, cobertura e ordem. Não repita os arquivos no chat.
7. Se a execução já foi autorizada, encaminhe ao orquestrador. Não repita aprovação já concedida.

## Contrato da task

Frontmatter mínimo, e nada além dele:

```yaml
status: pending            # pending | in_progress | validating | blocked | done
task_kind: vertical        # vertical | enabling
blocked_by: []
gate: "<comando real do projeto>"
gate_expect: "<resultado determinístico>"
```

`gate` usa o runner e a configuração de teste do projeto, com um seletor da fatia. Pode diferir
do comando agregado do CI apenas pelo escopo selecionado. Não existe script intermediário para
interpretar seu resultado: o exit code do comando é o veredito. `0` aprova, qualquer outro reprova.

| `task_kind` | Gate | `gate_expect` |
|---|---|---|
| `vertical` | Comando de teste **com seletor** da fatia | Quantifica: `"3 testes passam"` — número obrigatório |
| `enabling` | Build, lint, typecheck ou verificação estática | Descreve a evidência: `"build sem erros, 0 warnings"` |

**O seletor precisa provar que selecionou algo.** Use a garantia nativa do runner em vez de
inspecionar a saída:

| Runner | Como garantir que o filtro pegou testes |
|---|---|
| Microsoft.Testing.Platform | `--minimum-expected-tests N` → exit 9 se rodar menos; exit 8 se rodar zero |
| pytest | `-k <expr>` → exit 5 quando nada é coletado |
| Jest / Vitest | falham por padrão; **não** passe `--passWithNoTests` |
| Maven Surefire | `-Dtest=` com `failIfNoSpecifiedTests=true` (padrão) |
| Gradle | `--tests` já falha com "No tests found" |
| `go test -run` | sai `0` mesmo sem match — use `-run` com `go test ./... -count=1` e verifique a contagem em `gate_expect` |

Descubra o comando lendo a configuração de CI da plataforma usada pelo projeto, `Makefile`,
`package.json` ou o build script. Não pare na configuração que chama um workflow reutilizável:
consulte também os passos e parâmetros efetivos desse workflow. Quando ele não estiver acessível,
registre a lacuna e não declare paridade com o CI.

Em **Verificações do projeto** de cada task, liste separadamente os checks aplicáveis ao
incremento nos componentes alterados, com comando executável, resultado esperado e origem.
Inclua checks estáticos exigidos pelo CI do componente; cobertura e demais checks agregados ficam
no mapa do plano para a full e entram na task quando seu escopo os exigir. Execute os checks da
task e registre cada exit code; não os una com `&&`. Uma task sem CI declara a fonte alternativa
usada ou a ausência de check automatizado. O gate focalizado continua obrigatório para `vertical`.

Comando que só diagnostica (pular testes, `--dry-run`) nunca é evidência de conclusão.
Toda task recebe validator focused no perfil standard.

## Regras não negociáveis

1. Uma task vertical entrega um comportamento observável com seu teste no mesmo incremento.
   Numa feature full-stack, ela atravessa UI e API.
2. Habilitador exige justificativa de por que não cabe numa fatia e qual fatia desbloqueia.
   Build e lint não substituem teste de comportamento.
3. Todo arquivo, teste ou fixture usado para compilar ou validar preexiste ou é produzido pela
   própria task ou por dependência anterior declarada. Sem dependência futura, sem ciclo.
4. Não copie convenção de stack, estrutura de pastas ou assinatura para dentro da task.
   Referencie a skill quando precisar nomear a fonte.
5. Não liste arquivos a criar — a estrutura é determinística pela skill de arquitetura.
   Liste os a **modificar** e os a **referenciar**.
6. Não copie trechos da TechSpec para a task. Referencie por âncora (`techspec.md#v-02`) e ADR.
7. `Pronto quando` contém critérios de comportamento. Invariante de plano é do `validate_plan.py`.
8. Ambiguidade material é resolvida antes de a task nascer `pending`.
9. Não fragmente para cumprir contagem. Coesão e estado compilável vêm antes de qualquer heurística
   de tamanho.
10. A seção **Comportamento** não tem limite de extensão. Corte campo supérfluo, nunca a descrição
    que remove ambiguidade.
11. Quando uma fatia cria ou altera um cliente de rede, exija evidência do adaptador real com a
    fronteira externa controlada no teste. Quando altera composição de dependências, exija evidência
    de que a aplicação inicia com os registros reais no ambiente de teste. Dublês de serviços externos
    não substituem essas duas evidências.
12. Se o PRD exige smoke e o ambiente ainda não o permite, planeje o menor habilitador necessário
    para configuração, dados/migrations e isolamento de recursos aplicáveis. O critério da fatia
    deve comprovar a jornada observável, incluindo o destino de links públicos quando existirem.

## Cobertura

Cruze PRD → tasks antes do handoff: todo RF, RN e user story aparece em ao menos uma task, e todo
arquivo a modificar da TechSpec tem uma task produtora. Categoria sem task (observabilidade,
segurança, migração de dados) exige justificativa — não invente task artificial para preencher.

`validate_plan.py` verifica a paridade `tasks.md` ↔ arquivos e a tabela de cobertura; o julgamento
de que a fatia é a certa continua sendo seu. Quando o plano traz **Verificação herdada**, o script
também exige **Verificações do projeto** em cada task.

## Checklist antes do handoff

- [ ] `validate_plan.py` sai com exit 0.
- [ ] Toda task vertical tem gate de teste com seletor real e `gate_expect` quantificado.
- [ ] Gate focalizado e checks dos componentes alterados refletem os comandos e limites do
      projeto atual, ou a ausência de CI está registrada.
- [ ] Falhas herdadas da base com impacto na integração têm plano de resolução.
- [ ] Integrações e composição da aplicação alteradas têm evidência direta; smoke exigido tem
      pré-requisitos reproduzíveis.
- [ ] Todo habilitador justifica a horizontalidade e aponta a fatia desbloqueada.
- [ ] Nenhuma task copia convenção de stack ou trecho da TechSpec.
- [ ] Nenhuma task lista arquivos a criar.
- [ ] Todo RF, RN e US do PRD está na tabela de cobertura.
- [ ] Nenhuma fatia full-stack foi dividida por camada.
