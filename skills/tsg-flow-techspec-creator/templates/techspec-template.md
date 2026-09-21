# Template de Especificação Técnica

> **Escopo:** [Backend | Frontend | Full-stack]
> **Modo:** [Standalone | Pipeline | API-First]
> **PRD de origem:** `tasks/prd-[slug]/prd.md`
> **Contratos de integração:** `contracts.md` e documentos aplicáveis (OpenAPI/AsyncAPI/ODCS); aceite `api-contract.yaml` em PRDs existentes | `N/A — [motivo]`
> **Data:** [YYYY-MM-DD]
> **Status:** [Rascunho | Em Revisão | Aprovado]
> **Handoff:** [draft — não gerar Tasks | approved — pode alimentar o Task Creator]

Este documento é um **contrato**, não um blueprint para transcrever. Registre o que o
implementador não consegue derivar: comportamento, fronteira, decisão fechada e evidência.
Estrutura de pastas, nomes de arquivo, assinaturas e convenções vêm das skills de stack no
momento da implementação — não as copie para cá.

**Seção sem conteúdo material é omitida**, não preenchida com "N/A" ou justificativa.
Não há limite de tamanho: descreva o comportamento com a extensão necessária para que fique
inequívoco. O que se corta é seção supérflua, não detalhe útil.

---

## Resumo Executivo

Visão técnica da solução:

- Decisões arquiteturais principais
- Estratégia de implementação
- **Trade-off primário da abordagem escolhida** (obrigatório — o que se ganha e o que se abre mão)

---

## Arquitetura da Solução

Componentes principais, responsabilidades e fluxo de dados. Inclua apenas o que esta feature
cria ou altera; arquitetura herdada entra por referência ao baseline ou à ADR.

### Diagrama *(opcional)*

Diagrama mermaid/ascii quando as relações não couberem bem em texto.

### Bloco Backend *(omitir em feature exclusivamente frontend)*

- Agregados, casos de uso e portas afetadas
- Onde a regra de negócio vive
- Transação, consistência e eventos

### Bloco Frontend *(omitir em feature exclusivamente backend)*

- Jornadas e telas envolvidas
- Onde mora o estado de cada jornada (servidor vs. cliente)
- Pontos de integração com a API

> Biblioteca de fetching, gerenciamento de estado, validação de formulário, estrutura de pastas
> e geração de tipos são **decisões de projeto**, não de feature: vivem na skill de arquitetura da
> stack ou no baseline arquitetural. Registre aqui apenas o desvio justificado do padrão.

---

## Mapa de Fatias Verticais

Cada fatia entrega um comportamento observável de ponta a ponta, atravessando somente as
camadas necessárias. Numa feature full-stack, uma fatia cruza UI e API — é uma linha só, não
duas. A coluna `Bloqueado por` é a ordem de construção; não existe seção de build order
separada.

Descreva o fluxo com a extensão que o comportamento exigir.

### V-01: [comportamento observável]

- **Cobre:** [RF-XX, RN-YY, US-ZZ]
- **Entrada / gatilho:** [request, evento, ação de UI]
- **Processamento:** [regra aplicada, decisão, efeito colateral — quantas linhas forem necessárias]
- **Saída observável:** [resposta, estado, evento, tela]
- **Evidência / checkpoint:** [comando ou cenário + resultado esperado]
- **Bloqueado por:** [IDs de fatias ou "Nenhum"]

### V-02: [comportamento observável]

[Repetir a estrutura.]

### Habilitadores inevitáveis

Trabalho que não produz comportamento observável. É exceção e exige justificativa.

| Habilitador | Por que não cabe numa fatia | Menor escopo | Primeira fatia desbloqueada |
|---|---|---|---|
| EN-01 | [justificativa concreta] | [arquivos] | [V-XX] |

---

## Contratos e Fronteiras

O que o implementador não deriva sozinho. Omita as subseções que não se aplicam.

Referencie o conjunto decidido para este PRD. Outros PRDs podem evoluí-lo; esta spec não
define catálogo, armazenamento definitivo ou mecanismo de atualização do acervo da plataforma.

### Mapeamento de mensagens e dados *(quando aplicável)*

| Contrato e identificador | Aplicação/produtor e consumidores | Comportamento a implementar | Evidência |
|---|---|---|---|
| [AsyncAPI: operação/mensagem] | [participantes; perspectiva send/receive] | [envio/recebimento, duplicidade e falhas acordadas] | [cenário] |
| [ODCS: modelo/regra/SLA] | [participantes] | [fornecimento dos dados e compromisso mensurável] | [cenário] |

Referencie schemas e garantias nos documentos técnicos sem copiá-los. Registre diferenças para
o acordo anterior e transição necessária à implementação, quando houver.

### Mapeamento do contrato de API *(modo API-First)*

Endpoints, schemas, autenticação, paginação e formato de erro vivem no `api-contract.yaml`.
Esta spec **não duplica** essas definições.

| operationId | Caminho de implementação |
|---|---|
| `[operationId]` | `[Agregado]Endpoints.[handler]` → `[CasoDeUso]` → `[Repository]` |

**Validações além do contrato:**

| operationId | Regra | Camada |
|---|---|---|
| `[operationId]` | [regra de negócio] | [domain/application] |

**Exceção → resposta HTTP:**

| Exceção | HTTP | code do contrato |
|---|---|---|
| `[ExceçãoDoDomínio]` | 422 | `BUSINESS_RULE_VIOLATION` |

### Mapeamento de jornada *(escopo frontend)*

| User Story | Tela / componente | operationId ou ação local | Evidência |
|---|---|---|---|
| US-01 | [tela] | `[operationId]` ou `[ação local]` | [teste ou cenário] |

### Entidades do domínio *(modo Pipeline)*

| Entidade do Domain Doc | Representação técnica | Local |
|---|---|---|
| [Entidade] | [tipo/tabela] | [caminho] |

### Interfaces entre fatias ou times

Apenas assinaturas que funcionam como **contrato entre fatias, times ou repositórios**.
Assinatura interna derivável da skill de arquitetura não entra aqui.

---

## Arquivos a Modificar e a Referenciar

Arquivos **a criar** não são listados: a estrutura é determinística pelas skills de arquitetura
da stack. Liste o que o implementador não descobre sozinho.

### A modificar

| Caminho | Fatia | Alteração |
|---|---|---|
| `[caminho]` | [V-XX] | [o que muda] |

### A referenciar (não alterar)

| Caminho | Por que consultar |
|---|---|
| `[caminho]` | [interface, invariante ou padrão a respeitar] |

---

## Análise de Impacto

O que esta feature afeta fora da sua própria fronteira.

| Componente | Tipo | Impacto e risco | Ação requerida |
|---|---|---|---|
| [componente] | [novo/modificado/depreciado] | [o que muda + risco] | [ação] |

Considere: dependências diretas, recursos compartilhados (tabelas, filas, caches), mudanças em
contrato existente, carga/performance e — em Pipeline — outros domínios do Domain Map.

---

## Riscos e Preocupações

Preencha **enquanto explora o código**, não depois. Toda preocupação encontrada nas áreas que a
feature toca entra aqui com localização e mitigação. `Nenhuma encontrada` é entrada válida.

Categorias: código frágil (acoplamento, estado implícito), dívida técnica, risco de segurança,
gargalo de performance, lacuna de cobertura de teste no caminho de que a feature depende.

| Preocupação | Local (`arquivo:linha`) | Impacto | Mitigação |
|---|---|---|---|
| [o que está frágil] | `src/caminho/arquivo.cs:42` | [o que quebra ou degrada] | [como o desenho ou uma task trata] |

---

## Decisões Técnicas

Somente decisões não óbvias. Aplicar arquitetura existente não é decisão.

- **Decisão:** [o que foi escolhido]
- **Racional:** [por quê]
- **Trade-offs:** [o que se abriu mão]
- **Alternativas rejeitadas:** [o que mais foi considerado e por que não]

> Decisão que estabelece convenção ou restrição para features futuras vira ADR em `docs/adr/`.
> Decisão local desta feature fica só aqui.

---

## Verificação

Só o que **foge do padrão** das skills de teste e observabilidade do projeto. A estratégia geral
de testes já está nelas — não a repita.

- **Cenários críticos não óbvios:** [casos de borda, concorrência, falha parcial que exigem teste dedicado]
- **Dados ou ambiente especiais:** [Testcontainers, fixture, seed, mock de terceiro]
- **Observabilidade além do padrão:** [métrica, span ou log que não sai do padrão da stack]
- **Verificação dos contratos** *(quando aplicável)*: [cenários contra os documentos do PRD:
  HTTP; envio/recebimento e falhas de mensagens; estrutura, qualidade e serviço dos dados.
  Validação de YAML é distinta da conformidade da implementação.]

---

## Questões em Aberto

Pendências que não bloqueiam o handoff, com responsável e impacto se não resolvidas.

- [ ] [Questão] — [quem responde] — [impacto se ficar aberta]

Ambiguidade que **bloqueia** a implementação é resolvida antes do status `Aprovado`; não entra
nesta lista.

---

## Architecture Decision Records

ADRs herdadas e novas. Nenhuma ADR nova é necessária quando o desenho apenas aplica decisões
existentes.

> ADRs vivem em `docs/adr/`, com status `Proposed` durante revisão e `Accepted` após aprovação.
> Links partem de `tasks/prd-<slug>/`; recalcule se o diretório for outro.

- [ADR-NNN: Título](../../docs/adr/adr-NNN.md) — [decisão e por que importa para esta feature]
