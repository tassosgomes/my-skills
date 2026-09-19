# Avaliações de uso do TSG Flow

Estes cenários verificam decisões do agente, além dos testes determinísticos de transporte/gate.
Execute em projeto descartável, com as skills revisadas instaladas e somente os artefatos indicados.
Não há execução de modelos externos embutida nos testes deste repositório.

| Cenário/pedido | Contexto fornecido | Resultado esperado |
|---|---|---|
| “Corrija o texto deste botão” | Repo existente e mudança localizada | Não acionar discovery completo nem gerar PRD por rotina |
| “Gere o PRD da CAP-002” | Visão, Domain Map, domínio e backlog aprovados | Preservar IDs, fronteiras e prioridades; perguntar somente lacunas materiais |
| “Especifique o frontend desta calculadora local” | PRD de UI sem rede | techspec.md escopo Frontend, API N/A; dispensar contrato e blocos backend |
| “Gere as tasks desta tela” | PRD e techspec.md escopo Frontend aprovada | Aceitar frontend isolado, com jornada/teste na mesma task |
| “Gere o plano full-stack” | PRD e techspec.md escopo Full-stack aprovada | Plano único; cada fatia cruza UI e API numa task só |
| “Configure o typecheck” | Task enabling justificada | Gate de typecheck com evidência em gate_expect; validator focused; nenhum teste fictício |
| “Aplique o padrão existente” | Baseline e ADR Accepted pertinentes | Reutilizar decisão; não criar ADR por quota nem inferir stack pelas skills instaladas |
| “Mude a estratégia de cache” | ADR-001 Accepted e decisão nova aprovada | Nova ADR global em docs/adr/, índice atualizado, anterior Superseded |
| “Retome a entrega” | flow-state e checkpoint já criado, retorno perdido | Reconciliar Git/estado e não duplicar implementação ou commit |
| “Finalize a entrega” | Full aprovado; main avançou depois | Preparar integração/revalidar antes de publicar |
| “Arquive o PRD concluído” | ADRs e contrato ainda referenciados | Preservar decisões/contrato e referências ativas; não apagar docs/adr/ |

Para cada execução, registre o prompt, revisão das skills, modelo/runtime, artefatos gerados,
decisões incorretas, perguntas desnecessárias, tentativas e duração. Use tokens reportados pelo runtime
quando disponíveis; compare por entrega aprovada e considere erros/retrabalho, não só tamanho do prompt.

No transporte Herdr, kind, modelo, esforço, tentativa, outcome, gate e duração de cada delegação
já ficam em `.tsg-flow/delegate-logs/runs.jsonl`. Use esse ledger como fonte ao comparar provedores, em vez de
anotar à mão; o [guia de transporte](../skills/tsg-flow-orchestrator/references/transport.md#ledger)
traz as consultas. O que o ledger não cobre — qualidade do plano, perguntas desnecessárias,
retrabalho detectado só na revisão full — continua sendo registro manual por execução.

## Testes determinísticos locais

```bash
rtk proxy node --test tests/tsg-flow.test.mjs
```

As fixtures usam Git temporário e um substituto de Herdr, sem modelos ou serviços reais.
Cobrem resultados finais, identidade de chamada, rejeição, erro de infraestrutura, relatório antigo,
timeout com arquivo presente, todos os modos Git, caminho com espaços, roteamento por papel/modo/
`task_kind` da task, escada de escalonamento com clamp, anti-afinidade entre implementer e validator,
grafia das flags de modelo e esforço por kind, esforço composto dentro do nome do modelo,
esforço descartado por kind que não o expõe,
política inválida e linha de ledger por chamada.

Esses testes validam os contratos executáveis; não comprovam aderência semântica de um modelo ao fluxo.
Builds/testes pesados de projetos consumidores devem usar compute, e serviços compartilhados infra,
conforme as instruções do ambiente.
