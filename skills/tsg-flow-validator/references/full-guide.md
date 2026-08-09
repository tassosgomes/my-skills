# Referência completa — Validador do TSG Flow

## Ordem obrigatória

### `focused`

1. Execute o gate da task antes de abrir material adicional:

   ```text
   scripts/ai-flow/gate.sh --filter="<expressão da task>"
   ```

2. Se reprovar, registre a saída no relatório, reprove e retorne imediatamente.
3. Leia `{PRD_DIR}/N_task.md`, diff desde o último checkpoint, arquivos não rastreados da task e skills
   nomeadas.
4. Leia PRD, TechSpec ou contrato de API somente se uma verificação específica não puder ser resolvida
   com a task e o diff.
5. Revise critérios de sucesso, comportamento, casos-limite, testes, segurança, performance aplicável,
   arquitetura e regressões prováveis.
6. Separe bloqueantes de recomendações. Somente bloqueantes reprovam.

### `revalidation`

1. Rode o gate novamente.
2. Verifique somente cada bloqueio do relatório anterior.
3. Verifique regressões nos arquivos alterados desde a validação anterior.
4. Acrescente `## Revalidação #N` a `{PRD_DIR}/N_task_review.md`.
5. Não rederive observações antigas nem faça uma revisão geral.

### `full`

O full acontece depois dos checkpoints de todas as tasks e antes do rebase/merge.

1. Confirme `--base-ref` e que a referência pertence à base da branch do PRD.
2. Execute o gate agregado:

   ```text
   scripts/ai-flow/gate.sh --base=<base-ref> --all-tests
   ```

   Se o gate da stack não suportar `--all-tests`, execute o conjunto completo de verificações definido pelo
   repositório e reporte a limitação. Não transforme um gate parcial em aprovação full.

3. Calcule o diff completo entre `base-ref` e `HEAD`, incluindo arquivos não rastreados quando existirem.
4. Leia `prd.md`, `techspec.md`, `tasks.md` e todos os `N_task.md` necessários para rastreabilidade.
5. Revise:

   - cobertura de requisitos e user stories;
   - contratos entre tasks e componentes compartilhados;
   - dependências, ordem e integração;
   - arquitetura e padrões existentes;
   - testes e regressões entre tasks;
   - segurança, performance e observabilidade aplicáveis;
   - documentação e configuração necessárias.

6. Leia `skills/design-patterns/SKILL.md` e opere em modo Review:

   - delimite arquivos, fluxos e objetivo;
   - identifique a pressão real de design;
   - compare manter o código, refatoração simples e padrões candidatos;
   - recomende aplicar agora, adiar ou não aplicar;
   - registre benefício, custo, risco, impacto nos testes e gatilho futuro.

7. Não refatore código no full. O validator apenas cria `{PRD_DIR}/prd_review.md`.
8. Classifique o resultado:

   - `APROVADA`: nenhum bloqueio;
   - `APROVADA COM RECOMENDAÇÕES`: nenhum bloqueio e uma ou mais melhorias opcionais;
   - `REPROVADA`: existe pelo menos um bloqueio.

## Bloqueios e tentativas

O validator não controla o loop. Ele devolve fatos ao orquestrador. O orquestrador conta tentativas e
interrompe ao atingir o limite configurado.

Um bloqueio de planejamento deve ser explícito:

```text
Categoria: planejamento
Motivo: ...
Evidência: ...
```

Não reprovar por preferência de estilo, possibilidade abstrata de aplicar um padrão ou dívida anterior
fora do diff.

## Arquivo de revisão da task

Crie ou estenda `{PRD_DIR}/N_task_review.md` com:

1. resultado do gate;
2. escopo e arquivos revisados;
3. revisão semântica;
4. **Bloqueantes**;
5. **Recomendações**;
6. veredito.

Mantenha o arquivo curto e não cole saídas completas de comandos fora do bloco do gate.

## Arquivo de revisão do PRD

Crie `{PRD_DIR}/prd_review.md` com:

1. base-ref e escopo do diff;
2. resultado do gate full;
3. rastreabilidade e integração entre tasks;
4. achados bloqueantes;
5. recomendações gerais;
6. seção `## Auditoria de Design Patterns` usando o formato da skill;
7. veredito `APROVADA`, `APROVADA COM RECOMENDAÇÕES` ou `REPROVADA`.

Uma recomendação de padrão não deve virar bloqueio apenas porque um padrão nomeado seria possível. Exija
pressão concreta de design.

## Saída mínima

Em task aprovada:

```text
VALIDAÇÃO APROVADA
Escopo: focused
Gate: APROVADO
Bloqueantes: 0
Recomendações: N
Relatório: {PRD_DIR}/N_task_review.md
```

Em task reprovada:

```text
VALIDAÇÃO REPROVADA
Escopo: focused
Etapa: gate|revisão
Retorno para o implementer: somente bloqueios
Relatório: {PRD_DIR}/N_task_review.md
```

Em full aprovado:

```text
FULL VALIDATION APROVADA
Recomendações: N
Relatório: {PRD_DIR}/prd_review.md
```

Em full reprovado:

```text
FULL VALIDATION REPROVADA
Retorno para o orquestrador: bloqueios de integração
Relatório: {PRD_DIR}/prd_review.md
```

Não registre aprovações limpas em arquivo de telemetria separado.
