# Resumo de Tarefas de Implementacao de [Funcionalidade]

> **TechSpec de origem:** `tasks/prd-[nome-funcionalidade]/techspec.md`
> **Status do plano:** [Em revisao | Confirmado para implementacao]
> **Regra de entrega:** cada task de comportamento e uma fatia vertical validavel isoladamente

## Visao Geral

[Breve descricao da funcionalidade e objetivo do conjunto de tarefas]

## Skills de Stack Consultadas

| Skill | Caminho | Influencia |
|-------|---------|------------|
| [stack]-architecture | `[caminho]` | Estrutura de pastas, camadas |
| [stack]-testing | `[caminho]` | Padroes de teste, frameworks |
| [stack]-code-quality | `[caminho]` | Convencoes nos criterios de sucesso |
| ... | ... | ... |

## Fases de Implementacao

As fases agrupam uma sequencia de comportamento e feedback, nao uma camada arquitetural.

### Fase 1 - [Nome da fatia ou grupo de fatias]
[Qual comportamento sera demonstrado e qual checkpoint sera executado]

### Fase 2 - [Nome da fatia ou grupo de fatias]
[Qual comportamento sera demonstrado e qual checkpoint sera executado]

## Mapa de Entrega e Feedback

| Slice | Task | Comportamento observavel | Checkpoint executavel | Bloqueado por |
|-------|------|--------------------------|-----------------------|---------------|
| V-01 | 1.0 | [resultado ponta a ponta] | [comando/cenario + saida esperada] | [Nenhum/IDs] |

### Habilitadores inevitaveis

| Enabler | Task | Justificativa de horizontalidade | Menor validacao | Desbloqueia |
|---------|------|----------------------------------|------------------|-------------|
| EN-01 | [X.0] | [por que nao pode estar em uma fatia] | [evidencia] | [V-XX] |

## Tarefas

- [ ] 1.0 Titulo da Tarefa Principal
- [ ] 2.0 Titulo da Tarefa Principal
- [ ] 3.0 Titulo da Tarefa Principal

## Rastreabilidade US -> Tasks

| User Story | Tasks Relacionadas | Tipo de Cobertura |
|------------|--------------------|-------------------|
| US-01 | 1.0, 2.0 | Direta|Suporte |

## Validacao de Cobertura

### Requisitos Funcionais

| Requisito | Task(s) | Status |
|-----------|---------|--------|
| RF-01     | X.0     | ✅ Coberto |
| RF-02     | Y.0     | ✅ Coberto |

### Artefatos da TechSpec

| Artefato | Task | Status |
|----------|------|--------|
| `src/services/example.service.ts` | X.0 | ✅ |
| `src/middleware/example.middleware.ts` | Y.0 | ✅ |

### Categorias Obrigatorias

| # | Categoria | Task(s) / N/A | Skill Relacionada | Status |
|---|-----------|---------------|-------------------|--------|
| 1 | Setup / Configuracao | X.0 | [stack]-dependency-config | ✅ |
| 2 | Modelos de Dados | Y.0 | [stack]-architecture | ✅ |
| 3 | Logica de Negocio | X.0, Z.0 | [stack]-architecture | ✅ |
| 4 | Endpoints / Interfaces | W.0 | common/restful-api | ✅ |
| 5 | Integracoes Externas | N/A — sem integracoes | [stack]-dependency-config | ✅ |
| 6 | Validacoes e Erros | X.0 (subtarefa X.3) | [stack]-code-quality | ✅ |
| 7 | Testes | subtarefas em cada task | [stack]-testing | ✅ |
| 8 | Observabilidade | W.0 | [stack]-observability | ✅ |
| 9 | Documentacao | V.0 | — | ✅ |
| 10 | Seguranca | U.0 | [stack]-production-readiness | ✅ |

### Conformidade com o Orcamento de Fragmentacao

| Task | slice_type | Criar | Modificar | Subtarefas | Fatias | complexity | Status |
|------|------------|-------|-----------|------------|--------|------------|--------|
| 1.0 | vertical | 0 | 0 | 0 | 1 | medium | ✅ |

Tasks `vertical` devem ter exatamente uma fatia. Tasks `enabling` exigem justificativa na seção
"Habilitadores inevitaveis" e não podem virar agrupamentos horizontais por conveniência.

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|------|---------|-----------|
| Lane A | X.0, Y.0 | [Descricao] |
| Lane B | W.0, Z.0 | [Descricao] |

### Caminho Critico

[Sequencia de fatias e habilitadores que determina o tempo minimo de conclusao. Cada fatia deve
liberar feedback antes da proxima etapa; nao aguarde todas as camadas.]

### Diagrama de Dependencias

```
[Representacao visual das dependencias]
```
