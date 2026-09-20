---
name: tsg-flow-domain-creator
description: Detalha um domínio do Domain Map com fronteiras, entidades, juntas e regras de negócio reaproveitáveis. Use quando o domínio for render dois ou mais PRDs; para decompor o produto inteiro use domain-decomposer.
metadata:
  group: tsg-flow
---

# Domain Creator

Detalha **um** domínio do Domain Map: bounded context, entidades de negócio, juntas com os vizinhos
e regras de negócio numeradas. O documento gerado é contexto compartilhado pelos PRDs das
capacidades que tocam este domínio.

Não decide prioridade, fase, ordem nem escopo de entrega. Essas decisões pertencem ao backlog de
capacidades e ao PRD — um domínio isolado não enxerga dependência cruzada e qualquer ordem que ele
proponha contradiz a do backlog na primeira fatia que atravessar dois domínios.

## Quando escrever — e quando não

O que só existe aqui são as **regras de negócio numeradas (RN-XX)**, reaproveitadas entre PRDs do
mesmo domínio. Fronteira, entidades e linguagem ubíqua já vêm do Domain Map; contrato de evento e
de API materializam no pacote de contratos e na TechSpec.

**Escreva o domain doc quando o domínio for render dois ou mais PRDs no horizonte visível** — a
rodada atual e a seguinte. É quando as RN têm com quem ser compartilhadas.

**Com um PRD só, não escreva.** As regras vão no próprio PRD e este documento seria intermediário.
Quando o domínio ganhar a segunda capacidade, o domain doc nasce e absorve as RN daquele PRD — uma
vez, já com implementação rodando para informar, em vez de especulação.

Escreva just-in-time: os domain docs dos domínios que a rodada atual toca, **na mesma passada**,
porque é entre eles que as juntas aparecem. Nunca todos os domínios do mapa de uma vez.

## Template

Antes de redigir, leia o template em `templates/domain-template.md`.

## Entradas e Saída

- **Entrada obrigatória:** `vision.md` (deve estar disponível no contexto ou fornecido pelo usuário)
- **Contexto de domínio:** `context/domain-map.md`, quando disponível; é a fonte das fronteiras,
  dos nomes dos bounded contexts e das juntas. Se ainda não existe e as fronteiras estão
  indefinidas, use `tsg-flow-domain-decomposer` antes de detalhar.
- **Contexto adicional:** as capacidades deste domínio em `backlog/capabilities.md` e as restrições
  de `context/architecture-baseline.md`, quando disponíveis. Preserve os IDs; não copie prioridade,
  fase nem ordem.
- **Documento de saída:** `domains/[nome-do-dominio]/domain.md`, com o frontmatter do template
  preenchido e as origens declaradas com versão.
- **Estado:** registre o artefato em `flow-state.json` ao concluir.

## Pré-requisitos

Antes de começar, confirme:

1. **O `vision.md` foi fornecido?**
   - Se não: solicite ao usuário antes de continuar. Sem ele, não há como garantir coerência de escopo.
   - Se sim: extraia objetivo, escopo e restrições pertinentes antes de qualquer pergunta.

2. **O domínio a detalhar foi identificado?**
   - Se não: liste os domínios do Domain Map (ou candidatos da visão, se não houver mapa).
   - Se sim: use o nome canônico do mapa. Não peça nova confirmação de escolha já explícita.

3. **O critério de "Quando escrever" se aplica?**
   - Se o domínio tem uma única capacidade no horizonte visível, diga isso ao usuário e proponha
     levar as regras direto para o PRD. Só siga se ele mantiver o pedido.

## Fluxo de Trabalho

### 1. Analisar o Contexto Upstream

Antes de perguntar, extraia do Domain Map, visão e capacidades, conforme a fonte:

- Responsabilidade e fronteiras declaradas no Domain Map, incluindo o campo "O que não faz"
- Juntas declaradas na tabela de interações do mapa, com o dono do dado
- Capacidades do backlog que este domínio atende, pelos IDs
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

**Juntas:**
- Quando uma capacidade atravessa este domínio e o vizinho, onde está a divisão de responsabilidade?
- Quem é dono do dado em cada troca — quem origina o conteúdo e quem executa?
- O Domain Map já declara esta junta? Se sim, herde; se não, é lacuna do mapa e deve subir para lá,
  não ser decidida aqui.

**Integrações:**
- Há sistemas externos com os quais este domínio precisa se comunicar?
- Há eventos assíncronos entre este domínio e outros?

Se houver informações críticas ausentes, continue perguntando. Não gere o Domain Doc ainda.

### 3. Planejar

Apresente ao usuário antes de redigir:

- Bounded context proposto — responsabilidade em uma frase + fronteiras
- Lista de entidades principais com descrições curtas
- Capacidades atendidas, pelos IDs do backlog, sem prioridade e sem ordem
- Juntas — upstream, downstream, externas, com o dono do dado em cada troca
- Regras de negócio identificadas (numeradas RN-01, RN-02...)
- Eventos do domínio — produz e consome
- Riscos de fronteira e questões em aberto

Grave um draft para revisão. Pergunte somente sobre decisões materiais ainda não aprovadas;
reutilize aprovação explícita já dada para o mesmo domínio e escopo.

### 4. Redigir o Domain Doc

Use o template `templates/domain-template.md`.

Diretrizes obrigatórias:

- **Linguagem de negócio, não técnica** — entidades são objetos de negócio, não tabelas de banco
- **Fronteiras explícitas** — a seção "Fora do Escopo" é obrigatória e deve ser específica
- **Capacidades por ID** — use os `CAP-XXX` do backlog. Não crie numeração própria de feature:
  ela duplicaria o backlog e divergiria dele na primeira revisita
- **Regras de negócio numeradas** — use RN-01, RN-02... para referenciar nos critérios de aceitação dos PRDs
- **Juntas herdadas** — copie do Domain Map; junta que não existe lá é lacuna do mapa, não invenção daqui
- **Eventos no formato `dominio.evento`** — ex: `pagamento.realizado`
- **Consistência upstream** — nomes e fronteiras vêm do Domain Map; escopo e perfis vêm da visão
- **Sem limite de extensão** — regra de negócio e fronteira recebem o espaço necessário para
  ficar inequívocas; corte seção supérflua, nunca detalhe que remove ambiguidade

### 5. Validação Interna

Antes de finalizar, execute a autoavaliação:

- [ ] O bounded context está claramente definido sem sobreposição com outros domínios?
- [ ] As fronteiras (out of scope) estão explícitas e específicas?
- [ ] Todas as entidades têm descrição de negócio clara, sem jargão técnico?
- [ ] As capacidades atendidas estão referenciadas por ID, sem prioridade, fase ou ordem copiadas?
- [ ] Cada junta declara o dono do dado e é rastreável ao Domain Map?
- [ ] As regras de negócio estão numeradas e são testáveis?
- [ ] Os eventos seguem o padrão `dominio.evento`?
- [ ] Os riscos são de fronteira, não de entrega?
- [ ] O frontmatter está preenchido, com as origens declaradas na versão atual de cada uma?
- [ ] Um agente de IA conseguiria criar PRDs a partir deste Domain Doc sem perguntas adicionais?

Se houver falhas, corrija antes de prosseguir.

### 6. Salvar e Confirmar

- Salvar como: `domains/[nome-do-dominio]/domain.md`
- Preencher o frontmatter: `tsg_artifact: domain`, produto, versão, status e `sources` com a versão
  corrente de cada origem
- Registrar o artefato em `flow-state.json`
- Confirmar operação de escrita e caminho

### 7. Protocolo de Saída

A resposta final deve conter:

1. Resumo das decisões principais — bounded context definido, juntas com os vizinhos, regras de
   negócio numeradas
2. Link para o Domain Doc salvo, sem repetir o conteúdo completo
3. Caminho do arquivo salvo
4. Capacidades que este domínio atende, pelos IDs — **sem propor ordem**; o sequenciamento é do
   backlog
5. Questões em aberto que precisam de validação antes dos PRDs
6. Indicação de próximo passo: "Para criar o PRD de `CAP-XXX`, use a skill `tsg-flow-prd-creator`
   fornecendo o `vision.md`, este domain doc, os demais domain docs que a capacidade atravessa e o
   ID da capacidade"

## Como Usar nos PRDs

Ao iniciar um PRD, forneça:

1. `vision.md` — contexto global do sistema
2. **Todos** os domain docs que a capacidade atravessa — uma fatia vertical cruza domínios com
   frequência (ex.: criar conta exige identidade **e** notificação), e a junta entre eles é a parte
   que mais custa quando fica implícita
3. O **ID da capacidade** a detalhar (ex: "Vamos criar o PRD de CAP-026, na fatia mínima")

O `tsg-flow-prd-creator` usará as entidades, as regras de negócio (RN-XX) e os perfis já definidos,
evitando retrabalho de discovery.

## Princípios Fundamentais

- **Um domínio, uma responsabilidade** — se não cabe em uma frase, o domínio é grande demais
- **Fronteiras são contratos** — o que está fora do escopo é tão importante quanto o que está dentro
- **Junta declarada antes de construir** — fatias verticais só encaixam porque a interface foi
  decidida antes de qualquer uma existir; a junta vem do Domain Map, nunca do que a fatia anterior
  acabou implementando
- **Entidades são vocabulário de negócio** — evite termos como "tabela", "registro", "endpoint"
- **Dependências são riscos** — minimize-as sempre que possível no design do domínio
- **Coerência upstream** — resolva conflitos no documento dono da decisão: visão para escopo global,
  Domain Map para fronteiras e backlog para prioridade. Não reescreva a visão por um detalhe local.
