---
name: flow-qa
description: Planeja e executa uma rodada independente de QA a partir de requisitos, aplicação em execução e ambiente autorizado; cobre UI, API e persistência, produz evidências e relatório, e pode materializar casos UI em Playwright temporário ou persistente. Use para validar PRD, TechSpec, user stories, features ou releases por comportamento observável.
metadata:
  group: flow-qa
---

# Flow QA

Conduza a rodada por fases. Derive o comportamento esperado dos requisitos e decisões aprovadas,
nunca da implementação atual nem dos testes do implementer. Não altere código de produção, não
enfraqueça assertions e não adapte o teste ao comportamento observado.

## Entradas

Resolva antes da execução:

- requisitos selecionados e exclusões de escopo;
- ambiente, URL e estado da aplicação;
- autenticação, perfis e nomes das variáveis que fornecem credenciais;
- necessidade de validação por API ou persistência;
- formato do relatório;
- `automation: none|ephemeral|persist` (padrão `ephemeral` para UI).

Infira o que já estiver disponível em PRD, TechSpec, configuração ou ambiente. Pergunte somente
informações materiais ausentes. Nunca grave segredos nos artefatos.

## Fases

### 1. Discover

Leia os requisitos selecionados e identifique comportamentos, regras críticas, perfis, integrações,
pré-condições e dependências. Registre ambiguidades que impedem determinar o resultado esperado;
não use a aplicação para resolvê-las silenciosamente.

### 2. Plan

Crie casos independentes da implementação. Cubra o fluxo principal e os casos negativos, limites
ou riscos que sejam materiais para a entrega. Cada caso deve conter:

```yaml
id: CT-01
requirement: US-03.AC-01
type: ui | api | persistence
priority: critical | high | normal
preconditions: []
expected: comportamento observável
automation: none | ephemeral | persist
```

Use o mesmo `case_id` no plano, automação, evidências e relatório. Agrupe casos em unidades de
execução coesas e declare dependências; unidades independentes podem ser executadas em paralelo.

Apresente `qa_test_plan.md` para aprovação quando o plano definir ou alterar o escopo. Não execute
antes da autorização explícita do usuário, salvo quando a chamada já autorizar execução não
interativa ou houver convenção local equivalente.

### 3. Prepare

Crie `qa-evidence/qa_session.json`, `qa-evidence/qa_test_plan.md` e um diretório por unidade de
execução. Registre referências a variáveis de ambiente, nunca seus valores.

Para UI, use a capacidade de browser/Playwright disponível:

- `none`: execute interativamente sem criar spec persistente;
- `ephemeral`: materialize casos adequados em Playwright dentro de `qa-evidence/`; a automação
  pertence somente à rodada;
- `persist`: escreva testes na suíte estabelecida do projeto, seguindo suas convenções.

Persistir exige valor claro de regressão, como regra crítica, fronteira de autorização ou regressão
já observada. Não promova automaticamente toda automação da rodada. Se não houver uma suíte
estabelecida, não invente uma apenas para usar `persist`; proponha o caso como candidato.

### 4. Execute

Use a ferramenta apropriada disponível para UI, API e banco. Não ensine nem prescreva sintaxe de
ferramentas quando as convenções do projeto já resolverem a execução.

Para cada caso registre:

```yaml
case_id: CT-01
status: PASS | FAIL | BLOCKED | NOT_EXECUTED
expected: comportamento esperado
actual: comportamento observado
evidence: []
```

Evidência deve ser suficiente para reproduzir ou verificar o resultado e proporcional ao risco.
Remova tokens, senhas, cookies e dados pessoais desnecessários. Não altere dados fora do arranjo
autorizado para testes.

Falha funcional não autoriza repetição em busca de PASS. Retry é permitido somente após classificar
a falha como transitória de infraestrutura e deve ficar registrado. Uma falha bloqueia apenas casos
dependentes; continue unidades independentes quando isso não corromper o estado da rodada.

### 5. Evaluate

- `PASS`: o resultado esperado foi observado com evidência adequada.
- `FAIL`: houve divergência funcional verificável.
- `BLOCKED`: uma pré-condição ou dependência impediu a execução.
- `NOT_EXECUTED`: estava no plano, mas não foi executado; registre o motivo.

Nunca converta `FAIL` ou `BLOCKED` em `PASS`. Não omita falhas e não sugira correções de código.
Quando houver automação persistente nova, execute também os gates estabelecidos da suíte.

### 6. Report

Gere `qa-evidence/qa_report.md` com:

- total por status e resultado geral;
- resultado por requisito/unidade, com casos executados e caminho das evidências;
- para cada falha: caso, expected, actual, passo da divergência e evidências;
- itens bloqueados/não executados e motivo;
- escopo excluído e motivo;
- candidatos à automação persistente ainda não promovidos.

O resultado geral é aprovado somente com zero `FAIL` e zero `BLOCKED`. Mantenha PASS conciso;
detalhe somente falhas, bloqueios e limitações materiais. Gere PDF apenas quando solicitado e quando
a capacidade correspondente estiver disponível.

## Invariantes

- Não derive expectativas do código ou dos testes existentes.
- Não modifique a aplicação para fazê-la passar.
- Não silencie exceções, ignore assertions ou reduza o escopo após observar uma falha.
- Não faça análise de causa raiz além do necessário para classificar e evidenciar o resultado.
- Não trate indisponibilidade de ferramenta ou ambiente como defeito funcional.
- Não declare como executado um caso sem evidência da tentativa atual.
