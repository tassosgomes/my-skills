---
name: tsg-flow-gate-creator
description: >
  Gera o gate deterministico do TSG Flow (`scripts/ai-flow/gate.sh`) adaptado a stack do
  repositorio. Use esta skill uma vez por repositorio, antes de rodar o fluxo de
  desenvolvimento autonomo, ou quando a stack mudar. Dispare quando o usuario disser
  "criar o gate", "preparar o repo para o TSG Flow", "o gate nao funciona nessa linguagem",
  "adaptar o gate para Java/Node/Python", "setup do fluxo autonomo", ou quando
  `tsg-flow-validator` reportar que `scripts/ai-flow/gate.sh` nao existe ou saiu com
  codigo 2. Esta skill e de PREPARACAO: nao implementa tasks nem valida codigo.
metadata:
  group: tsg-flow
---

# TSG Flow Gate Creator

Gera o gate determinístico que `tsg-flow-validator` e `tsg-flow-implementer` executam
antes de qualquer leitura de LLM.

## Por que esta skill existe

O gate move trabalho caro (rodar build/lint/testes e interpretar a saída) de tokens
de LLM para um script burro e rápido. Isso só funciona se o script for **gerado uma
vez, com inteligência, e executado muitas vezes, sem inteligência**. Detectar a stack
em tempo de execução, a cada validação, desfaz o ganho e introduz fragilidade.

O que varia por linguagem é a **implementação**. O **contrato** é fixo — é o que
mantém as skills de fluxo idênticas em qualquer repositório.

## Arquivos desta skill

- `templates/gate.contract.md` — o contrato. Copie para `scripts/ai-flow/` do repo alvo.
- `templates/gate.skeleton.sh` — esqueleto com os blocos `[[STACK: ...]]` a preencher.
- `reference/gate.dotnet.sh` — implementação .NET completa e validada. Use como
  exemplo de referência do nível de detalhe esperado.

## Processo

### 1. Detectar a stack

Procure, na raiz e até 2 níveis de profundidade:

| Marcador | Stack |
|---|---|
| `*.sln`, `*.csproj`, `Directory.Build.props` | .NET |
| `pom.xml` | Java/Maven |
| `build.gradle`, `build.gradle.kts` | Java/Gradle |
| `package.json` | Node/TypeScript |
| `pyproject.toml`, `setup.cfg`, `requirements.txt` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |

**Monorepo poliglota:** se houver mais de uma stack, não gere gates separados. Gere
um `gate.sh` que **escopa por stack a partir do diff**: se os arquivos alterados só
tocam `.tsx`, não rode o build do backend. Cada stack vira um bloco condicional
disparado pela presença de arquivos daquela extensão em `CHANGED`.

### 2. Descobrir os comandos reais do repositório

Nunca assuma os comandos padrão. Leia:

- `package.json` → seção `scripts` (o projeto pode usar `pnpm`, `bun`, `turbo`)
- `Makefile`, `justfile`, `Taskfile.yml`
- `.github/workflows/*.yml` — **a melhor fonte**: o CI já roda o gate certo
- `pom.xml` / `build.gradle` → plugins de format (Spotless, Checkstyle)
- `.editorconfig`, `.eslintrc*`, `ruff.toml`, `.golangci.yml`
- Arquivos de config de test runner

Prefira sempre o comando que o CI usa. Se o CI e o gate divergirem, o fluxo aprova
código que a esteira reprova.

### 3. Traduzir os invariantes para a stack

Os quatro invariantes estão em `templates/gate.contract.md`. Os dois primeiros são
os que exigem tradução cuidadosa.

#### Invariante 1 — format/lint escopado no diff

| Stack | Comando escopado |
|---|---|
| .NET | `dotnet format <sln> --verify-no-changes --no-restore --include <files>` |
| Java/Maven | `mvn spotless:check -DspotlessFiles=<regex dos arquivos>` |
| Java/Gradle | `gradle spotlessCheck` com `ratchetFrom 'HEAD'` no build script |
| Node/TS | `npx eslint <files>` + `npx prettier --check <files>` (já naturalmente escopados) |
| Python | `ruff check <files>` + `ruff format --check <files>` (ou `black --check <files>`) |
| Go | `gofmt -l <files>` (saída não-vazia = falha) |
| Rust | `rustfmt --check --edition 2021 <files>` |

Se a ferramenta não aceitar lista de arquivos (caso comum em Gradle), use o
mecanismo de *ratchet* do plugin contra `HEAD`. Se nem isso existir, é preferível
**pular o format** a rodá-lo sobre o projeto inteiro — o gate reprovaria a task por
débito alheio, que foi exatamente o falso positivo que motivou este invariante.

#### Invariante 2 — detecção de filtro vazio

Este é o item mais dependente de runner e o de maior retorno: ele pega
deterministicamente a task que promete uma suíte de testes e não a entrega.

| Runner | Comportamento com filtro sem match | Como detectar |
|---|---|---|
| `dotnet test --filter` | Sai **0** silenciosamente | Somar `Passed:\s+N` do output; `0` = falha |
| Jest | Falha por padrão | **Nunca** passe `--passWithNoTests`; se o projeto o define em config, sobrescreva |
| Vitest | Falha por padrão | Idem Jest; garanta `--passWithNoTests=false` |
| pytest `-k` | Sai com código **5** | `exit 5` = nenhum teste coletado = falha |
| Maven Surefire `-Dtest=` | Falha se `failIfNoSpecifiedTests=true` (padrão) | Garanta que não esteja desligado |
| Gradle `--tests` | Falha com "No tests found for given includes" | Código de saída já é não-zero |
| `go test -run` | Sai **0** com "no tests to run" | Grep por `no tests to run` / `\[no tests to run\]` |
| `cargo test <filtro>` | Sai **0** com `0 passed` | Parse de `test result: ok. 0 passed` |

Runners que saem `0` silenciosamente (.NET, Go, Cargo) **exigem parse do output**.
Runners com código dedicado (pytest) devem usar o código. Nunca confie apenas no
exit code em .NET, Go ou Rust.

#### Invariantes 3 e 4

Truncar em ~40 linhas e garantir zero interatividade. Desligue watch mode, pagers e
cores ANSI (`--no-color`, `CI=true`, `TERM=dumb`) — códigos de escape poluem o
contexto do LLM sem informação.

### 4. Gerar o script

Preencha `templates/gate.skeleton.sh`. **Não altere a estrutura, a ordem das etapas,
o formato de saída nem os códigos de retorno** — o contrato depende deles.

Ordem obrigatória: format (escopado) → build → testes (com filtros) → higiene do diff.
Format vem primeiro porque é o mais barato; build antes de testes porque testes
dependem do build.

O gate gerado deve aceitar:

- `--base=<ref>` para delimitar o diff completo desde a base do PRD;
- `--all-tests` para executar a suíte completa somente no `full` final;
- `--filter=<expr>` para o focused de uma task.

Não execute `--all-tests` durante o ciclo normal de tasks e não o torne o padrão do script.

Escreva em `scripts/ai-flow/gate.sh` do repo alvo, com `chmod +x`.
Copie `templates/gate.contract.md` para `scripts/ai-flow/gate.contract.md`.

### 5. Verificar executando (Obrigatório — Não pule)

Um gate gerado que não roda é pior do que gate nenhum: ele reprova toda task e o
fluxo trava na primeira iteração.

Execute os três caminhos e mostre a saída real ao usuário:

1. **Aprovação em árvore limpa:**
   `scripts/ai-flow/gate.sh --skip-tests` → deve imprimir `GATE: APROVADO`, exit 0.
2. **Aprovação com filtro real:** escolha uma suíte existente no repositório e rode
   `scripts/ai-flow/gate.sh --filter="<expr>"` → `GATE: APROVADO` com contagem > 0.
3. **Reprovação por filtro vazio:** use um filtro inexistente →
   `GATE: REPROVADO`, etapa `testes`, exit 1.

Verifique também o caminho de format quando for barato fazê-lo sem sujar o repo:
introduza uma violação de formatação em um arquivo, rode o gate, e **restaure o
arquivo** (`git checkout -- <file>`). Confirme que a reprovação cita apenas o arquivo
alterado, não débito pré-existente.

Se qualquer verificação falhar, corrija o script e repita. Só termine com os três
caminhos comprovados.

### 6. Reportar

Informe ao usuário:

- stack(s) detectada(s) e de onde os comandos vieram (CI, `package.json`, Makefile)
- o conteúdo do gate gerado, em resumo
- a saída real das três verificações
- qualquer invariante que não pôde ser garantido e por quê (ex.: format não escopável
  na stack) — isso é informação de risco, não detalhe

## Regras

1. O gate vive **no repositório alvo**, versionado, em `scripts/ai-flow/`. Qualquer
   agente precisa executá-lo sem carregar skill alguma.
2. Nunca gere um gate que rode a suíte de testes inteira por padrão. Use somente os filtros
  declarados pela task; `--all-tests` é reservado ao `full` final do TSG Flow.
3. Testes que exigem Docker/Testcontainers devem falhar com mensagem clara quando o
   daemon não estiver disponível, nunca pendurar.
4. Mantenha o suporte a `--base` e `--all-tests` alinhado ao contrato antes de executar o TSG Flow.
5. Esta skill não implementa tasks, não valida código e não commita.
