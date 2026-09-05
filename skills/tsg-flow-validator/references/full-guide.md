# Evidência de revisão

## Focused e revalidation

Leia o contrato de gate da task antes de material adicional. Registre gate, evidência específica,
arquivos revisados, bloqueantes, recomendações e veredito em N_task_review.md.
Em revalidation, acrescente a tentativa, confira bloqueios anteriores e regressões no diff novo.
Não considere dívida anterior fora do escopo como bloqueio sem impacto concreto da entrega.

## Full

A branch já deve estar preparada para integração. Registre base_ref, target_ref, validated_commit e
validated_tree; confirme estabilidade de HEAD/código durante a revisão.

Leia PRD, tasks e todas as specs selecionadas (incluindo frontend quando aplicável). Cruze requisitos,
artefatos, testes e contratos entre tasks. Consulte somente baseline/ADRs pertinentes.
Verifique suíte completa, integrações, regressões, segurança e arquitetura proporcionais à mudança.

Não faça revisão de padrões como lista genérica: quando houver pressão concreta, compare manter a
solução, uma refatoração simples e padrões candidatos. Registre benefício, custo e gatilho futuro.
Recomendação de design não bloqueia sem defeito ou descumprimento de requisito.

Aprovação full permite mudanças posteriores apenas nos relatórios e estado operacional do fluxo,
verificadas pelo integrator. Qualquer mudança em implementação, dependências, configuração ou decisão
arquitetural invalida a evidência. Se a base alvo avançar, a integração deve ser preparada novamente.

## Relatórios

Mantenha os relatórios curtos. Saídas de falha têm até 40 linhas; guarde o restante no log da ferramenta.
Não duplique especificações ou ADRs. No transporte por arquivo, inclua uma linha Run com o run_id
da chamada e escreva o resultado JSON somente depois de salvar o relatório.
Um relatório antigo existente não é evidência da tentativa atual.

## Erros

VALIDATION ERROR/exit 2: verificação indisponível; não aprova nem consome tentativa de código.
Rejeição: critério essencial falhou ou bloqueante concreto encontrado. Preserve a evidência
para o implementer; não reescreva um bloqueio como mera sugestão.
