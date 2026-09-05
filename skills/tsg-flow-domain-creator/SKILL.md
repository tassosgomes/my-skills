---
name: tsg-flow-domain-creator
description: Detalha um domínio selecionado no Domain Map, com fronteiras, entidades de negócio, regras e features priorizadas. Use antes dos PRDs desse domínio; para decompor o produto inteiro use domain-decomposer.
metadata:
  group: tsg-flow
---

# Domain Creator

Detalha um domínio específico do sistema com bounded context claro, entidades de negócio, features
priorizadas, regras de negócio e mapa de dependências. O documento gerado serve como entrada
para a skill `tsg-flow-prd-creator` ao criar PRDs das features deste domínio.

## Template

Antes de redigir, leia o template em `templates/domain-template.md`.

## Entradas e Saída

- **Entrada obrigatória:** `vision.md` (deve estar disponível no contexto ou fornecido pelo usuário)
- **Contexto de domínio:** `context/domain-map.md`, quando disponível; é a fonte das fronteiras
  e nomes dos bounded contexts. Se ainda não existe e as fronteiras estão indefinidas, use
  `tsg-flow-domain-decomposer` antes de detalhar.
- **Contexto adicional:** capacidade selecionada em `backlog/capabilities.md` e restrições de
  `context/architecture-baseline.md`, quando disponíveis. Preserve IDs, prioridades e dependências.
- **Documento de saída:** `domains/[nome-do-dominio]/domain.md`

## Pré-requisitos

Antes de começar, confirme:

1. **O `vision.md` foi fornecido?**
   - Se não: solicite ao usuário antes de continuar. Sem ele, não há como garantir coerência de escopo.
   - Se sim: extraia objetivo, escopo e restrições pertinentes antes de qualquer pergunta.

2. **O domínio a detalhar foi identificado?**
   - Se não: liste os domínios do Domain Map (ou candidatos da visão, se não houver mapa).
   - Se sim: use o nome canônico do mapa. Não peça nova confirmação de escolha já explícita.

## Fluxo de Trabalho

### 1. Analisar o Contexto Upstream

Antes de perguntar, extraia do Domain Map, visão e capacidade selecionada, conforme a fonte:

- Responsabilidade e fronteiras declaradas no Domain Map
- Dependências identificadas no mapa e no backlog de capacidades
- Fase do roadmap em que o domínio está inserido
- Perfis de usuário que interagem com este domínio
- Termos do glossário relevantes para este domínio

### 2. Esclarecer (Não pule esta etapa)

Faça perguntas apenas sobre lacunas materiais dos documentos herdados. Não repita decisões já dadas.

**Responsabilidade e fronteiras:**
- Qual é a responsabilidade exata em uma frase?
- O que parece pertencer a este domínio mas está explicitamente excluído?
- Onde termina este domínio e começa o próximo?

**Usuários e uso:**
- Quais perfis interagem com este domínio? Com que frequência?
- Qual é a ação mais crítica que cada perfil executa?

**Entidades e regras:**
- Quais são os objetos de negócio centrais? (não schemas — entidades de negócio)
- Existem regras de negócio importantes que governam este domínio?
- Há regras que variam por cliente, região ou configuração?

**Features:**
- Quais funcionalidades este domínio precisa entregar?
- Qual seria a feature mínima para o domínio ser utilizável?
- Alguma feature tem dependência direta de outro domínio?

**Integrações:**
- Há sistemas externos com os quais este domínio precisa se comunicar?
- Há eventos assíncronos entre este domínio e outros?

Se houver informações críticas ausentes, continue perguntando. Não gere o Domain Doc ainda.

### 3. Planejar

Apresente ao usuário antes de redigir:

- Bounded context proposto — responsabilidade em uma frase + fronteiras
- Lista de entidades principais com descrições curtas
- Lista de features com prioridade MoSCoW sugerida
- Mapa de dependências — upstream, downstream, externas
- Regras de negócio identificadas (numeradas RN-01, RN-02...)
- Eventos do domínio — produz e consome
- Ordem de implementação sugerida
- Riscos e questões em aberto

Grave um draft para revisão. Pergunte somente sobre decisões materiais ainda não aprovadas;
reutilize aprovação explícita já dada para o mesmo domínio e escopo.

### 4. Redigir o Domain Doc

Use o template `templates/domain-template.md`.

Diretrizes obrigatórias:

- **Linguagem de negócio, não técnica** — entidades são objetos de negócio, não tabelas de banco
- **Fronteiras explícitas** — a seção "Fora do Escopo" é obrigatória e deve ser específica
- **Features numeradas** — use F01, F02... para rastreabilidade nos PRDs
- **Regras de negócio numeradas** — use RN-01, RN-02... para referenciar nos critérios de aceitação dos PRDs
- **Eventos no formato `dominio.evento`** — ex: `pagamento.realizado`
- **Consistência upstream** — nomes e fronteiras vêm do Domain Map; escopo e perfis vêm da visão.
- **Manter entre ~600 e 1.200 palavras** no corpo principal (excluindo tabelas)

### 5. Validação Interna

Antes de finalizar, execute a autoavaliação:

- [ ] O bounded context está claramente definido sem sobreposição com outros domínios?
- [ ] As fronteiras (out of scope) estão explícitas e específicas?
- [ ] Todas as entidades têm descrição de negócio clara, sem jargão técnico?
- [ ] As features cobrem a responsabilidade do Domain Map e a capacidade selecionada?
- [ ] As dependências são consistentes com o mapa e o backlog?
- [ ] As regras de negócio estão numeradas e são testáveis?
- [ ] Os eventos seguem o padrão `dominio.evento`?
- [ ] A ordem de implementação respeita as dependências internas?
- [ ] Um agente de IA conseguiria criar PRDs a partir deste Domain Doc sem perguntas adicionais?

Se houver falhas, corrija antes de prosseguir.

### 6. Salvar e Confirmar

- Salvar como: `domains/[nome-do-dominio]/domain.md`
- Confirmar operação de escrita e caminho

### 7. Protocolo de Saída

A resposta final deve conter:

1. Resumo das decisões principais — bounded context definido, features priorizadas, dependências críticas
2. Link para o Domain Doc salvo, sem repetir o conteúdo completo
3. Caminho do arquivo salvo
4. Próximos passos — quais features estão prontas para ter PRD criado, em ordem sugerida
5. Questões em aberto que precisam de validação antes dos PRDs
6. Indicação de próximo passo: "Para criar PRDs das features deste domínio, use a skill `tsg-flow-prd-creator` fornecendo o `vision.md` e este `domain.md` como contexto"

## Como Usar nos PRDs

Ao iniciar uma sessão de PRD para uma feature deste domínio, forneça:

1. `vision.md` — contexto global do sistema
2. `domains/[nome]/domain.md` — contexto do domínio
3. ID da feature a detalhar (ex: "Vamos criar o PRD da feature F02 — Aprovação de Pagamentos")

O agente `tsg-flow-prd-creator` usará as entidades, regras de negócio (RN-XX) e perfis de usuário já definidos, evitando retrabalho de discovery.

## Princípios Fundamentais

- **Um domínio, uma responsabilidade** — se não cabe em uma frase, o domínio é grande demais
- **Fronteiras são contratos** — o que está fora do escopo é tão importante quanto o que está dentro
- **Entidades são vocabulário de negócio** — evite termos como "tabela", "registro", "endpoint"
- **Dependências são riscos** — minimize-as sempre que possível no design do domínio
- **Coerência upstream** — resolva conflitos no documento dono da decisão: visão para escopo global,
  Domain Map para fronteiras e backlog para prioridade. Não reescreva a visão por um detalhe local.
