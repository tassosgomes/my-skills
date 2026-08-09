# Resumo de Tarefas de Implementacao de [Funcionalidade]

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

### Fase 1 - [Nome da Fase]
[Descricao da fase]

### Fase 2 - [Nome da Fase]
[Descricao da fase]

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

## Analise de Paralelizacao

### Lanes de Execucao Paralela

| Lane | Tarefas | Descricao |
|------|---------|-----------|
| Lane A | X.0, Y.0 | [Descricao] |
| Lane B | W.0, Z.0 | [Descricao] |

### Caminho Critico

[Sequencia de tarefas que determina o tempo minimo de conclusao]

### Diagrama de Dependencias

```
[Representacao visual das dependencias]
```