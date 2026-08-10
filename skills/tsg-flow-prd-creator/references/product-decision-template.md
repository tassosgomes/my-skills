# Template de Product Decision Record

Use este template para registrar decisões de produto reutilizáveis por múltiplos PRDs.
Não crie um PD para cada resposta do discovery: use-o apenas quando a decisão tiver alcance
global ou de domínio, definir uma política/vocabulário reutilizável, estabelecer um limite
importante de escopo ou envolver trade-offs que provavelmente serão rediscutidos.

## Localização e convenções

- Local padrão: `docs/product-decisions/`.
- Índice: `docs/product-decisions/index.md`.
- Arquivos: `PD-[NNN]-[slug].md`.
- IDs são permanentes; uma decisão substituída mantém seu ID e aponta para a sucessora.
- Status: `Proposed`, `Accepted`, `Superseded` ou `Withdrawn`.
- Durante o discovery, o PD pode ser `Proposed`. Só marque como `Accepted` após a aprovação
  final do PRD.
- Vision/Domain Docs continuam sendo a fonte da definição atual. O PD registra contexto,
  rationale, alternativas e histórico; não deve duplicar silenciosamente esses documentos.

## Registro

```markdown
# PD-[NNN]: [Título da decisão]

- **Status**: [Proposed | Accepted | Superseded | Withdrawn]
- **Escopo**: [Global | Domínio: nome | Feature: slug]
- **Data**: [AAAA-MM-DD]
- **Responsável pela decisão**: [Pessoa ou papel]
- **Origem**: [Sessão de discovery, PRD, Vision Doc ou Domain Doc]
- **Tags**: [termo-1, domínio-1]
- **Substitui**: [PD-XXX ou Não aplicável]
- **Substituído por**: [PD-XXX ou Não aplicável]

## Contexto

[Problema, necessidade ou conflito que exigiu uma decisão.]

## Decisão

[Decisão confirmada em linguagem de negócio. Não incluir detalhes de implementação.]

## Alternativas consideradas

- **[Alternativa A]** — [trade-offs e motivo da rejeição]
- **[Alternativa B]** — [trade-offs e motivo da rejeição]

## Consequências

- **Positivas**: [impactos esperados]
- **Negativas ou riscos**: [custos, limites ou riscos aceitos]
- **Impacto em futuros PRDs**: [o que deve ser herdado ou respeitado]

## Termos e documentos afetados

- **Termos canônicos**: [termos definidos ou esclarecidos]
- **Vision/Domain Docs**: [links e alterações necessárias]
- **PRDs relacionados**: [links]

## Histórico

- [AAAA-MM-DD] — [alteração de status ou revisão relevante]
```

## Índice

Quando o primeiro PD for criado, criar ou atualizar `docs/product-decisions/index.md`:

```markdown
# Índice de Decisões de Produto

| ID | Título | Status | Escopo | Tags | Arquivo | Relacionamentos |
|---|---|---|---|---|---|---|
| PD-001 | [Título] | Accepted | [Global/Domínio/Feature] | [tags] | [link] | [PDs relacionados] |
```
