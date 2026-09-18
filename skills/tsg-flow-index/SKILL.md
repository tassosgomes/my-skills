---
name: tsg-flow-index
description: "Router do TSG Flow: dimensiona a profundidade do fluxo pelo tamanho da mudança e roteia para a skill certa. Use ao iniciar uma feature, ao decidir quais artefatos são necessários ou ao revisar o roteamento; tarefas já dimensionadas devem acionar a skill direto."
metadata:
  group: tsg-flow
---

# Router do TSG Flow

**A complexidade determina a profundidade — não existe pipeline fixo.** Antes de iniciar
qualquer feature, dimensione o escopo e aplique somente os artefatos que ele exige.

## Dimensionamento

| Escopo | O que é | PRD | TechSpec | Tasks | Execução |
|---|---|---|---|---|---|
| **Pequeno** | ≤3 arquivos, uma frase descreve | Parágrafo no chat ou `_idea.md` | Pular | Pular | Implementar + gate |
| **Médio** | Feature clara, <10 tasks | PRD enxuto | **Inline** — decidir ao implementar, sem `techspec.md` | **Implícitas** | Implementar + gate por comportamento |
| **Grande** | Multi-componente, fronteiras novas | PRD completo | `techspec.md` | `tasks.md` + arquivos | Orquestrador com checkpoint por task |
| **Complexo** | Ambiguidade real, domínio novo, contrato externo | PRD + discovery | `techspec.md` + contrato | Tasks + fases | Orquestrador + validação full |

**Regras:**

1. **PRD e verificação existem sempre.** É preciso saber o que construir e provar que foi
   construído. O que varia é a forma, não a existência.
2. **TechSpec é pulada** quando não há decisão arquitetural nova, contrato novo nem padrão novo —
   o desenho acontece durante a implementação.
3. **Tasks são puladas** quando há ≤3 passos óbvios.
4. **Contrato de API** entra sempre que a feature cria ou altera API consumida por outro time ou
   pelo frontend — independente do tamanho.
5. **Orquestrador** entra a partir de Grande. Abaixo disso, o fluxo direto do projeto basta.

## Válvula de segurança

Mesmo quando as tasks foram puladas, a execução **começa listando os passos atômicos**.
Se a lista passar de 5 passos ou revelar dependências não triviais, **pare e crie `tasks.md`** —
o dimensionamento errou. Subir de nível é barato; descobrir no meio da implementação que o plano
não existia, não.

O inverso também vale: se um plano Grande gerar tasks que são todas `enabling`, ou quase todas
`high`, a decomposição está errada — revise antes de executar.

## Roteamento

| Etapa | Skill | Quando |
|---|---|---|
| Visão do produto | `tsg-flow-vision-creator` | Produto novo ou redirecionamento |
| Decomposição em domínios | `tsg-flow-domain-decomposer` | Após a visão, antes do baseline |
| Baseline arquitetural | `tsg-flow-architecture-baseline` | Após o Domain Map, antes das features |
| Backlog de capacidades | `tsg-flow-capability-backlog` | Definir MVP e sequenciar fases |
| Detalhar um domínio | `tsg-flow-domain-creator` | Antes dos PRDs daquele domínio |
| PRD da feature | `tsg-flow-prd-creator` | Sempre — a forma varia com o escopo |
| Contrato de API | `tsg-flow-contract-creator` | API consumida por outro time ou pelo frontend |
| Especificação técnica | `tsg-flow-techspec-creator` | Grande/Complexo — um documento, escopo backend, frontend ou full-stack |
| Plano de tasks | `tsg-flow-task-creator` | Grande/Complexo |
| Execução coordenada | `tsg-flow-orchestrator` | Grande/Complexo, com tasks prontas |
| Implementação de uma task | `tsg-flow-implementer` | Worker do orquestrador |
| Revisão independente | `tsg-flow-validator` | Focused por task; full antes da entrega |
| Git, checkpoint e entrega | `tsg-flow-integrator` | Operações de branch, commit e integração |

## Princípios do fluxo

Valem para todo artefato do TSG Flow:

1. **Um fato, um lar.** Cada informação vive em um documento. Downstream referencia por ID ou
   âncora — nunca copia. Cópia desatualiza e cria duas verdades.
2. **O documento carrega o que o modelo não deriva:** comportamento, regra de negócio, fronteira,
   decisão fechada, evidência. Estrutura de pastas, nomes, assinaturas e convenções vêm das skills
   de stack no momento da implementação.
3. **Seção sem conteúdo material é omitida**, não preenchida com "N/A" nem justificada.
4. **Sem limite de extensão.** O documento encolhe cortando seção supérflua, nunca detalhe que
   remove ambiguidade. O "o quê" recebe o espaço que precisar.
5. **Regra estrutural vira verificação executável**, não checkbox: `validate_plan.py` para o
   plano, o comando de teste do próprio projeto para a implementação, testes de arquitetura para
   as fronteiras. Prefira a garantia nativa da ferramenta a um wrapper que a reimplemente.
6. **Fatia vertical é a unidade.** Uma fatia atravessa as camadas necessárias, inclusive UI e API
   na mesma linha. Trabalho sem comportamento observável é habilitador e exige justificativa.
7. **Verificação é independente.** Quem implementa não aprova. Evidência com `arquivo:linha` ou
   não conta.
