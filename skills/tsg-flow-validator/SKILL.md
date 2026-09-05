---
name: tsg-flow-validator
description: Revisa uma task TSG Flow ou o diff completo do PRD sem corrigir código. Use focused na primeira revisão, revalidation após correções e full sobre a branch preparada para integração.
metadata:
  group: tsg-flow
---

# Validator

Valide sem editar código, status, tasks ou commits. Produza relatórios com bloqueantes e recomendações
separados. Somente falhas essenciais e bloqueantes reprovam.

## Entradas

- `--prd-dir=<path>`, `--mode=focused|revalidation|full` (padrão focused).
- `--task=<id>` em focused/revalidation; `--base-ref=<sha>` em full.
- Revalidation recebe o relatório anterior. Full recebe a branch já atualizada com a base alvo.

## Gate antes da revisão

Leia apenas o contrato de verificação da task para obter tipo, comando, seletor e resultado esperado.
Depois rode o gate antes de carregar material semântico:

- behavioral: `scripts/ai-flow/gate.sh --filter="<selector>"`;
- static: `scripts/ai-flow/gate.sh --static` e a evidência específica declarada;
- full: `scripts/ai-flow/gate.sh --base=<base-ref> --all-tests`.

Em repositório sem suíte, full pode usar `--static` somente se todas as tasks forem static e o
plano justificar a ausência de comportamento executável; declare a limitação no relatório.
Exit 1 reprova e encerra a revisão; exit 2 retorna `VALIDATION ERROR` por infraestrutura/uso.
Não converta diagnóstico `--skip-tests` em aprovação. Use compute/infra conforme instruções locais.

A revisão independente usa worker fresco. Não reutilize aprovação do implementer como revisão
semântica. O padrão é executar o gate; reutilização futura exigiria igualdade demonstrada de código,
comandos, dependências, ambiente e evidência, não apenas um mesmo SHA.

## Modos

- **focused:** revise task, diff desde o checkpoint, untracked do escopo e skills pertinentes.
  Abra trechos das specs/contrato/ADRs somente quando uma verificação exigir.
- **revalidation:** execute evidências, confira bloqueios anteriores e regressões no diff novo.
  Acrescente uma seção de revalidação ao relatório; não rederive observações sem mudança relevante.
- **full:** revise diff desde a base preparada, rastreabilidade de todas as specs selecionadas,
  contratos entre tasks, integração, segurança, arquitetura e regressões. Rode a suíte agregada.
  Consulte design-patterns Review se disponível e pertinente; recomendações de refatoração não
  bloqueiam por preferência. Não crie abstrações nem aplique correções.

## Evidência e resultados

Task: `{PRD_DIR}/N_task_review.md`. PRD: `{PRD_DIR}/prd_review.md`.
Registre comandos/resultados, escopo, bloqueantes com arquivo/linha e recomendações.
No full, registre `base_ref`, `validated_commit` (HEAD revisado) e `validated_tree`.
Confirme que HEAD e código não mudaram durante a revisão; mudanças exigem nova validação.

Resultados: `VALIDAÇÃO APROVADA|VALIDAÇÃO REPROVADA`,
`FULL VALIDATION APROVADA|FULL VALIDATION REPROVADA` ou `VALIDATION ERROR`.
Aprovação com recomendações continua sendo aprovação, com contagem explícita.

Quando receber `--result-file` e `--run-id`, escreva JSON final no schema fornecido pelo transporte,
outcome `approved|rejected|validation_error`; inclua `Run: <run-id>` no relatório da chamada.
Full aprovado inclui commit, árvore e base revisados no resultado estruturado.
Não crie telemetria paralela; duração/tentativa podem ficar no próprio relatório.

Leia [references/full-guide.md](references/full-guide.md) para evidência e casos de integração.
