---
# status alimenta o painel Kanban. Valores canônicos:
#   pending -> 📋 A Fazer | in_progress -> ⚙️ Em Progresso | validating -> 🔍 Em Validação
#   blocked -> ⛔ Bloqueado | done -> ✅ Concluído
# Tasks nascem sempre como pending.
status: pending

# vertical  -> entrega comportamento observável; gate obrigatoriamente com --filter
# enabling  -> exceção justificada, sem comportamento observável; gate estático (build/lint)
task_kind: vertical

blocked_by: []

# Comando real do projeto — o mesmo que o CI roda. O exit code é o veredito.
# vertical: comando de teste com seletor, e gate_expect quantificado (número de testes).
# enabling: build/lint/typecheck, com a evidência descrita em gate_expect.
gate: "[comando]"
gate_expect: "[resultado determinístico esperado]"
---

# [N].0 [Título da task]

**Fatia:** [V-XX] · **Cobre:** [RF-XX, RN-YY, US-ZZ] · **Spec:** `techspec.md#v-xx`
· **ADR:** [ADR-NNN ou —]

## Comportamento

O que passa a funcionar quando esta task termina. Descreva entrada, regra aplicada e resultado
observável com a extensão necessária para não restar ambiguidade — inclusive o caso negativo
relevante. Não há limite de tamanho aqui: é a seção mais importante do arquivo.

[Ex: POST /servicos com payload válido → 201 com Location e slug no corpo, e ServicoCriado
gravado no outbox na mesma transação. Categoria inexistente → 422 com code
RELATED_AGGREGATE_NOT_FOUND.]

## Fora do escopo desta task

O que esta fatia deliberadamente **não** prova, para o validator não cobrar. [Ex: publicação no
broker fica em V-05; autorização por perfil fica em V-07.]

## Decisões fechadas

Decisões de negócio, contrato ou arquitetura que o implementador **não deve reabrir nem inventar**.
Referencie a ADR quando houver; não copie o conteúdo dela.

## Modificar / Referenciar

Arquivos a criar não são listados — a estrutura vem da skill de arquitetura da stack.

- **modificar:** `[caminho]` ([o que muda])
- **ref:** `[caminho]` ([interface, invariante ou padrão a respeitar])

## Pronto quando

Critérios do **comportamento**, não do processo. Invariantes de planejamento (selector válido,
ausência de dependência futura, artefato do gate existente) são verificados por
`scripts/validate_plan.py` e não entram aqui.

- [ ] Gate passa (exit 0): `[comando]`
- [ ] [Verificação funcional do caminho feliz]
- [ ] [Verificação do caso negativo]
