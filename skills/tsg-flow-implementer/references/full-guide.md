# Referência completa — Implementador do TSG Flow

## Entradas

- `--prd-dir=<path>`;
- `--task=<id>`;
- `--mode=implement|fix`, padrão `implement`;
- `--attempt=<n>/<max>`.

O fluxo usa somente `standard`.

## Contrato de contexto

O orquestrador não injeta PRD e TechSpec inteiros. Ele fornece `{PRD_DIR}` e o ID da task. O implementer
deve ler:

1. `{PRD_DIR}/N_task.md`;
2. referências e arquivos listados na task;
3. skills nomeadas em `Skills para consultar durante implementação`;
4. trechos relevantes de `{PRD_DIR}/prd.md`, `{PRD_DIR}/techspec.md` ou contrato de API somente para
   resolver lacuna concreta.

Uma task bem gerada é autossuficiente para implementar. Ler PRD/TechSpec é uma exceção, não o caminho
normal. Se a exceção for ampla, sinalize task mal fragmentada ou bloqueada.

## Preflight de prontidão

Faça o preflight antes de qualquer edição. Verifique:

1. **Resultado:** existe um comportamento observável que a task entrega?
2. **Escopo:** arquivos e símbolos a criar/modificar estão identificados?
3. **Contrato:** entradas, saídas, erros, estados e regras de negócio necessários estão definidos?
4. **Dependências:** tasks bloqueadoras e componentes externos estão disponíveis?
5. **Evidência:** há comandos, testes ou verificações que provam cada critério?
6. **Decisões:** decisões arquiteturais relevantes estão fechadas ou há uma orientação clara?
7. **Fragmentação:** a task é uma fatia vertical dentro do orçamento?

Se uma resposta for `não` e a dúvida não puder ser resolvida por convenção existente, retorne:

```text
TASK BLOCKED
Categoria: planejamento
Motivo: <lacuna ou contradição>
Evidência: <task e seção de suporte consultada>
Mudanças realizadas: nenhuma
Ação necessária: <revisar task, PRD ou TechSpec>
```

Não conte esse resultado em `max-attempts`. Não tente escrever uma solução provisória para descobrir o
requisito durante a implementação.

## Modo implement

1. Confirmar branch preparada pelo integrator.
2. Ler a task e executar o preflight.
3. Resumir internamente objetivo, arquivos, dependências, critérios e riscos.
4. Carregar somente skills específicas da task.
5. Implementar a menor mudança que satisfaça a fatia vertical.
6. Adicionar ou ajustar testes focados.
7. Executar o gate uma vez.
8. Devolver resultado ao orquestrador.

Não faça revisão semântica independente nem commit.

## Modo fix

Use quando o validator devolver bloqueios:

1. ler somente os bloqueios, arquivos citados e requisitos apontados;
2. não reler ou refatorar escopo não relacionado;
3. não corrigir observações não bloqueantes;
4. fazer uma única passagem de correção;
5. executar o gate uma vez;
6. devolver aprovação do gate ou falha ao orquestrador.

Se o bloqueio indicar que a task, PRD ou TechSpec está incompleta, retorne `TASK BLOCKED` em vez de
adivinhar a intenção.

## Seleção de skills

Leia as skills nomeadas na task. Se a task não nomear skills para uma área que exige padrão, trate como
defeito de planejamento e informe o orquestrador. Use somente os módulos necessários:

- Java: arquitetura, qualidade, dependências, observabilidade, performance, testes ou produção conforme
  o escopo;
- .NET: `dotnet-index` e módulos específicos;
- React/TypeScript: arquitetura, qualidade, observabilidade, runtime, testes ou produção conforme escopo;
- transversal: `restful-api` para HTTP e `roles-naming` para autorização.

Use `design-patterns` em Check de implementação somente quando houver pressão concreta; não crie
abstrações preventivas.

## Gate

Execute:

```text
scripts/ai-flow/gate.sh --filter="<expressão da task>"
```

O gate reprovado é retorno operacional ao orquestrador e conta como tentativa. O implementer não deve
continuar corrigindo até passar dentro da mesma chamada.

## Saída mínima

Retorne somente:

- `TASK READY` ou `TASK BLOCKED`;
- arquivos alterados;
- resultado do gate;
- suporte adicional aberto e motivo;
- limitações.

Não crie relatório de qualidade, commit, merge ou PR.
