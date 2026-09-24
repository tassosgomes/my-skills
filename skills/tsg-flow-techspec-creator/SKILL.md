---
name: tsg-flow-techspec-creator
description: "Cria ou atualiza a especificação técnica de uma feature a partir do PRD — backend, frontend ou full-stack em um único documento. Define fatias verticais, contratos, fronteiras e decisões duráveis. Não use para discovery de produto nem para implementar código."
metadata:
  group: tsg-flow
  pipeline_stage: techspec
  requires:
    - "tasks/prd-[slug]/prd.md"
  produces:
    - "tasks/prd-[slug]/techspec.md"
    - "docs/adr/adr-NNN.md (quando houver decisão nova)"
---

# TechSpec Creator

Traduza o PRD em um contrato de implementação verificável, respeitando a arquitetura existente.
Um documento por feature, cobrindo backend, frontend ou ambos.

## Decisões

| Tema | Decisão | Motivo |
|---|---|---|
| Documento | Uma `techspec.md` por feature, com blocos condicionais por escopo | Uma fatia vertical full-stack cruza UI e API; separar por camada contradiz o fatiamento |
| Conteúdo | Só o que o implementador **não deriva**: comportamento, fronteira, decisão fechada, evidência | Estrutura, assinatura e convenção vêm da skill de stack na hora da implementação |
| Tamanho | Sem limite de extensão por seção | Comportamento ambíguo custa mais que documento longo |
| Seção vazia | Omitida | Justificativa de não-aplicabilidade é ruído |
| Arquivos a criar | Não são listados | Determinístico pelas skills de arquitetura da stack |
| Coordenação de integrações | `contracts.md` e contratos OpenAPI/AsyncAPI/ODCS do PRD | Acordos coordenam provedores e consumidores daquela implementação |
| Decisão de projeto | Vive na skill de arquitetura da stack ou no baseline, não na spec | Biblioteca, estrutura e convenção não se decidem por feature |
| Fatia sem comportamento | Habilitador, com justificativa e fatia desbloqueada | Impede "infra primeiro" disfarçada de planejamento |

## Entradas

- `tasks/prd-<slug>/prd.md` aprovado, ou aprovação equivalente registrada pelo usuário.
- Quando a feature consome ou altera HTTP, mensagens ou dados compartilhados: `contracts.md`
  e contratos aplicáveis aprovados para a implementação do PRD. Aceite `api-contract.yaml`
  diretamente em PRDs existentes sem índice. Sem integração, registre a não aplicabilidade.
- Contratos registram o acordo daquele PRD e podem ser evoluídos por outros. Não atribua à
  TechSpec catalogação, armazenamento definitivo ou atualização do acervo; isso cabe à plataforma.
- Quando disponíveis: `vision.md`, `context/domain-map.md`, `context/architecture-baseline.md`,
  `domains/<dominio>/domain.md`, capacidade em `backlog/capabilities.md`, designs e ADRs.
- Saída: `tasks/prd-<slug>/techspec.md`. Respeite caminhos já definidos pelo projeto.

## Escopo do documento

Determine o escopo pelo PRD e declare no cabeçalho:

| Escopo | Blocos presentes |
|---|---|
| **Backend** | Arquitetura/backend, mapeamento de contrato, entidades do domínio |
| **Frontend** | Arquitetura/frontend, mapeamento de jornada, integração com contrato |
| **Full-stack** | Ambos, com **um mapa de fatias único** onde cada fatia cruza as duas pontas |

Uma feature exclusivamente frontend não exige bloco backend, e vice-versa. Não produza dois
documentos para uma feature full-stack.

## Processo

1. **Stack.** Identifique-a por instruções do projeto, manifests, CI, configuração e código.
   Skills instaladas orientam; sua presença não comprova a stack.
2. **Contexto.** Leia o PRD e explore arquivos, símbolos, chamadores, testes e configuração
   afetados. Verifique os caminhos públicos de navegação e os ambientes necessários às evidências
   exigidas. Em projeto novo, registre a ausência de código e use as restrições explícitas.
3. **Herança.** Absorva baseline, contratos e ADRs antes de propor arquitetura. Referencie
   `operationId`s HTTP, operações/mensagens AsyncAPI e modelos/compromissos ODCS sem duplicar
   schemas. Mapeie os contratos do PRD à implementação, às diferenças para as versões de entrada
   e aos cenários de verificação; não presuma que um contrato histórico representa produção.
4. **Decisões ativas.** Leia `docs/adr/index.md` e as ADRs pertinentes. Uma decisão `Accepted`
   conflitante tem exatamente duas saídas, e ambas são explícitas:
   **conformar** com a restrição, ou **substituir** criando nova ADR e marcando a anterior
   `Superseded by ADR-NNN`. Ignorar em silêncio não é opção — cria inconsistência invisível.
5. **Lacunas.** Pergunte somente o que muda comportamento, contrato, dados ou arquitetura.
   Resolva escolhas locais pelas convenções existentes. Sem quota de perguntas.
6. **Conflitos.** Se contrato, baseline e PRD divergirem, apresente o conflito e resolva antes do
   handoff. Cruze também requisitos de segurança com o fluxo de dados e seus locais de
   persistência, como filas, outbox, cache, logs e backups. Não invente alternativas nem ADRs
   para preencher cota.
7. **Redação.** Leia [templates/techspec-template.md](templates/techspec-template.md) e
   [references/delivery-contract.md](references/delivery-contract.md).

## Cadeia de verificação de conhecimento

Ao pesquisar ou decidir, siga nesta ordem e não pule etapas:

```
1. Código existente  →  2. Docs do projeto (README, docs/, baseline, ADRs)
→  3. Context7 MCP  →  4. Busca web  →  5. Sinalizar como incerto
```

O passo 5 é **sempre** apresentado como incerteza, nunca como fato. **Nunca presuma nem invente.**
Se não encontrar, escreva "não sei" ou "não encontrei documentação para isto". API, padrão ou
comportamento inventado propaga em cascata para tasks e implementação — incerteza é sempre
preferível a fabricação.

## Regras não negociáveis

1. Toda fatia entrega comportamento observável de ponta a ponta e declara entrada, processamento,
   saída, evidência e bloqueio. Numa feature full-stack, uma fatia cruza UI e API: é uma linha só.
2. Trabalho sem comportamento observável é habilitador, com justificativa, menor escopo e a
   primeira fatia que desbloqueia.
3. Não liste arquivos a criar. Liste os a **modificar** e os a **referenciar**.
4. Não copie convenção, estrutura de pastas, assinatura interna ou estratégia de teste das skills
   de stack. Referencie a skill quando precisar nomear a fonte.
5. Não registre escolha de biblioteca, estrutura de pastas ou convenção como decisão de feature —
   são decisões de projeto e vivem na skill de arquitetura da stack ou no baseline.
   Aqui entra só o desvio justificado do padrão.
6. Preencha **Riscos e Preocupações** enquanto lê o código, com `arquivo:linha` e mitigação.
   `Nenhuma encontrada` é válido; preocupação sem mitigação não é.
7. Interface só entra no documento quando é contrato entre fatias, times ou repositórios.
8. Apresente 2–3 abordagens com trade-offs **apenas** quando houver escolha arquitetural material
   ainda não decidida. Lidere pela recomendação. Direção já aprovada não se reabre.
9. Ambiguidade que bloqueia implementação é resolvida antes do status `Aprovado`.
   Pendência não bloqueante fica explícita com responsável.
10. Sem limite de extensão. Corte seção supérflua, nunca detalhe que remove ambiguidade.
11. Quando a feature cria links de navegação, declare a URL pública completa, incluindo base path,
    origem e rota, e a evidência de que o link abre o destino esperado.
12. Quando dados sensíveis ou credenciais transitórias atravessam componentes, declare onde são
    criados, copiados, persistidos, lidos e descartados. A proteção escolhida deve ser compatível
    com o fluxo de entrega e repetição; não presuma um mecanismo único para todos os projetos.
13. Smoke que depende de infraestrutura local exige pré-requisitos reproduzíveis no plano:
    configuração, dados/migrations e isolamento de recursos compartilhados quando aplicável.

## Persistência e ADRs

- Grave `techspec.draft.md` com status `Em Revisão`; releia e apresente resumo e link.
- Reutilize autorização já concedida para o mesmo escopo. Havendo decisão nova material, obtenha
  aprovação sobre o draft antes de promover para `techspec.md` com status `Aprovado`.
- Preserve a especificação canônica durante updates; altere apenas o escopo solicitado.
- Crie ADR apenas para decisão arquitetural nova ou mudança significativa de decisão existente.
  Use [templates/adr-template.md](templates/adr-template.md); numeração global compartilhada entre
  features e entre frontend/backend. O ciclo completo está no
  [contrato de entrega](references/delivery-contract.md).

## Checklist antes do handoff

- [ ] Escopo declarado no cabeçalho e blocos não aplicáveis **omitidos**, não preenchidos com N/A.
- [ ] Toda fatia tem comportamento observável, evidência e bloqueio declarados.
- [ ] Numa feature full-stack, nenhuma fatia foi dividida por camada.
- [ ] Todo habilitador justifica por que não cabe numa fatia e aponta a fatia desbloqueada.
- [ ] Todo RF e RN do PRD aparece em ao menos uma fatia.
- [ ] Nenhuma convenção de stack foi copiada das skills para o documento.
- [ ] Nenhum arquivo "a criar" foi listado.
- [ ] Riscos trazem `arquivo:linha` e mitigação, ou a seção declara `Nenhuma encontrada`.
- [ ] ADR ativa conflitante foi conformada ou substituída — nunca ignorada.
- [ ] Nada foi inventado: o que não foi encontrado está marcado como incerto.
- [ ] Links públicos e dados sensíveis, quando presentes, foram seguidos até o destino e pelos
      locais de persistência relevantes.
- [ ] Evidências de integração têm ambiente e pré-requisitos executáveis identificados.

## Entrega

Informe caminhos, escopo, decisões novas e herdadas, ADRs afetadas, mapa de fatias e pendências.
Não repita o documento no chat. O `tsg-flow-task-creator` consome esta TechSpec para gerar um
plano único da feature.
