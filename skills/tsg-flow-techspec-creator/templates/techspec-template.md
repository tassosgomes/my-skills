# Template de Especificação Técnica

> **Modo de operação:** [Standalone | Pipeline | API-First]
> **PRD de origem:** `tasks/prd-[nome-funcionalidade]/prd.md`
> **API Contract:** `tasks/prd-[nome-funcionalidade]/api-contract.yaml` *(quando modo API-First)*
> **Data:** [YYYY-MM-DD]
> **Status:** [Rascunho | Em Revisão | Aprovado]

---

## Resumo Executivo

[Visão técnica em 1-2 parágrafos que cobre:]

- Decisões arquiteturais principais
- Estratégia de implementação
- **Trade-off primário da abordagem escolhida** (obrigatório — declarar explicitamente o que se ganha e o que se abre mão)

---

## Skills de Referência

[Skills consultadas na Phase 0 que embasaram as decisões desta TechSpec:]

| Skill | Caminho | Decisões Influenciadas |
|-------|---------|------------------------|
| `[stack]-architecture` | `[caminho]` | Estrutura de pastas, camadas, padrões |
| `[stack]-dependency-config` | `[caminho]` | Libs aprovadas, DI, configuração |
| `[stack]-code-quality` | `[caminho]` | Convenções de código, naming |
| `[stack]-testing` | `[caminho]` | Estratégia de testes, frameworks |
| `[stack]-observability` | `[caminho]` | Logging, métricas, tracing *(se aplicável)* |
| `[stack]-performance` | `[caminho]` | Otimização, caching *(se aplicável)* |
| `design-patterns` | `[caminho]` | Padrões aplicados *(se aplicável)* |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

[Descrição dos componentes principais e suas responsabilidades:]

- Nomes dos componentes e função primária
- Relacionamentos entre componentes
- Visão geral do fluxo de dados

### Diagrama de Componentes *(opcional)*

[Diagrama em mermaid/dot/ascii ilustrando relações entre componentes.]

---

## Design de Implementação

### Interfaces Principais

[Defina as interfaces de serviço principais. Limite cada exemplo a 20 linhas:]

```
// Exemplo de definição de interface (substituir pela linguagem do projeto)
interface NomeServico {
    nomeMetodo(entrada: TipoEntrada): TipoSaida;
}
```

### Modelos de Dados

[Defina estruturas de dados essenciais:]

- Entidades de domínio principais (mantenha nomes do Domain Doc quando aplicável)
- Tipos de requisição/resposta *(em modo API-First, derivam dos schemas do contrato)*
- Esquemas de banco de dados *(se aplicável)*

**[Modo Pipeline]** Mapeamento Entidade do Domínio → Modelo de Dados:

| Entidade do Domain Doc | Modelo Técnico | Local |
|------------------------|----------------|-------|
| [Entidade] | [Classe/Tipo] | [Caminho] |

### Endpoints de API

#### Modo Standalone / Pipeline

[Liste endpoints completos:]

- Método e caminho (ex: `POST /api/v1/recurso`)
- Breve descrição
- Referências de formato de requisição/resposta

#### Modo API-First

> Os endpoints, schemas, autenticação, paginação e formato de erros são definidos no
> [API Contract](api-contract.yaml). Esta TechSpec NÃO duplica essas definições.

**Mapeamento de implementação dos endpoints do contrato:**

| operationId | Caminho de Implementação |
|-------------|--------------------------|
| `[operationIdDoContrato]` | `Controller.[método]` → `[UseCase]` → `[DomainService]` → `[Repository]` |

**Validações adicionais** (além das declaradas no contrato):

| Endpoint | Validação | Local na Implementação |
|----------|-----------|------------------------|
| `[operationId]` | [regra de negócio] | [camada — domain/application] |

**Mapeamento de Exceções → ErrorResponse do Contrato:**

| Exceção de Domínio | HTTP | code (do contrato) |
|--------------------|------|--------------------|
| `[ExceptionDoDomínio]` | 422 | `BUSINESS_RULE_VIOLATION` |

---

## Inventário de Artefatos

[Lista TODOS os arquivos envolvidos. Esta seção alimenta diretamente o `tsg-flow-task-creator`.]

### Arquivos a Criar

| Caminho | Tipo | Skills Aplicáveis | Descrição |
|---------|------|-------------------|-----------|
| `[caminho/arquivo]` | [Controller/UseCase/Entity/Repository/DTO/Mapper/Migration/Test/Config] | `[skill-1]`, `[skill-2]` | [Descrição em 1 linha] |

### Arquivos a Modificar

| Caminho | Skills Aplicáveis | Alteração |
|---------|-------------------|-----------|
| `[caminho/arquivo]` | `[skill]` | [Descrição da alteração] |

### Arquivos de Referência (não alterar)

| Caminho | Motivo da Consulta |
|---------|-------------------|
| `[caminho/arquivo]` | [Por que o agente precisa consultar este arquivo] |

---

## Pontos de Integração

> *Inclua esta seção apenas se a feature integra com sistemas externos ao codebase.*

[Para cada integração externa:]

- Serviço/API integrado e propósito
- Mecanismo de autenticação/autorização
- Estratégia de tratamento de erros e retry
- Timeouts e idempotência
- **[Modo Pipeline]** Já mapeado no Domain Doc? Citar referência

---

## Análise de Impacto

[Componentes afetados pela implementação:]

| Componente Afetado | Tipo de Impacto | Descrição & Risco | Ação Requerida |
|--------------------|-----------------|-------------------|----------------|
| [componente] | [novo/modificado/depreciado] | [o que muda + nível de risco] | [ação necessária] |

[Categorias a considerar:]

- **Dependências Diretas:** módulos que chamarão ou serão chamados
- **Recursos Compartilhados:** tabelas de BD, caches, filas
- **Mudanças de API:** modificações em endpoints/contratos existentes
  - **[Modo API-First]** Mudanças no API Contract devem ser explícitas
- **Performance:** componentes que podem sofrer mudança de carga
- **[Modo Pipeline]** Outros domínios do roadmap (Vision Doc) potencialmente afetados

---

## Abordagem de Testes

### Testes Unitários

- Estratégia e componentes principais a testar
- Requisitos de mock (apenas serviços externos — não mockar classes do próprio domínio)
- Cenários críticos e casos de borda
- **[Modo Pipeline]** Cada RN-XX do Domain Doc deve ter caso de teste correspondente

### Testes de Integração

- Componentes a testar juntos
- Requisitos de dados de teste
- Dependências de ambiente (Testcontainers, banco em memória, etc.)

### Testes de Contrato *(modo API-First)*

- Validação da implementação contra o `api-contract.yaml`
- Ferramenta sugerida (Dredd, Pact, etc.)
- Cenários cobertos

---

## Sequenciamento de Desenvolvimento

### Build Order

[Sequência ordenada respeitando dependências. Cada passo após o primeiro DEVE declarar suas dependências:]

1. [Primeiro componente] — sem dependências
2. [Segundo componente] — depende de 1
3. [Terceiro componente] — depende de 1 e 2
4. [Continuar a cadeia de dependências]

### Dependências Técnicas Bloqueantes

[Dependências externas que devem ser resolvidas antes da implementação:]

- Requisitos de infraestrutura
- Disponibilidade de serviços externos
- Entregas de outras equipes ou componentes compartilhados

---

## Monitoramento e Observabilidade

> *Recomendado para features de produção.*

[Visibilidade operacional para a implementação:]

- Métricas a expor (formato Prometheus/OpenTelemetry)
- Eventos de log e campos estruturados
- Limiares de alerta e escalonamento
- Spans de tracing customizados em operações críticas
- Correlation IDs propagados

---

## Considerações Técnicas

### Decisões Principais

[Escolhas técnicas significativas com racional:]

- **Decisão:** [o que foi escolhido]
- **Racional:** [por que esta opção]
- **Trade-offs:** [o que se abriu mão]
- **Alternativas rejeitadas:** [o que mais foi considerado e por que não]

### Riscos Conhecidos

[Desafios técnicos e estratégias de mitigação:]

- Descrição do risco e probabilidade
- Abordagem de mitigação
- Áreas que precisam de pesquisa ou prototipagem adicional

### Requisitos Especiais

[Apenas se aplicável:]

- Performance (métricas específicas)
- Segurança (além de auth padrão)
- Conformidade (LGPD, PCI-DSS, etc.)

### Conformidade com Skills

[Confirmar aderência às SKILL.md identificadas:]

- Segue convenções de `[skill-architecture]`
- Aplica `[skill-code-quality]`
- Usa libs aprovadas em `[skill-dependency-config]`
- Implementa testes conforme `[skill-testing]`

**Desvios identificados** *(se houver)*:

| Desvio | Skill | Justificativa |
|--------|-------|---------------|
| [descrição] | [skill] | [motivo] |

---

## Questões em Aberto

[Pontos pendentes de validação antes ou durante a implementação:]

- [ ] [Questão 1]
- [ ] [Questão 2]
- [ ] **[Modo API-First]** Conflito identificado com o API Contract? Listar aqui.

---

## Architecture Decision Records

[ADRs criadas durante o processo de design (incluindo herdadas do PRD):]

- [ADR-001: Título](adrs/adr-001.md) — Resumo da decisão em 1 linha
- [ADR-002: Título](adrs/adr-002.md) — Resumo da decisão em 1 linha
- [ADR-NNN: Título](adrs/adr-NNN.md) — Resumo da decisão em 1 linha

---

## Próximos Passos

1. **Implementação:** Use a skill `tsg-flow-task-creator` referenciando esta TechSpec para gerar as tarefas
2. **Frontend** *(se aplicável):* Use a skill `tsg-flow-frontend-techspec-creator` referenciando o
   `api-contract.yaml` e o PRD
3. **Validação:** Itens da seção "Questões em Aberto" devem ser resolvidos antes ou durante a
   implementação
