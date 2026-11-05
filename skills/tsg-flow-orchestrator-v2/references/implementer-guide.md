# Diagnóstico e correção

## Planejamento versus decisão local

Retorne TASK BLOCKED quando faltar decisão material de negócio, contrato, dados ou arquitetura
e a leitura seletiva não resolver. Cite a task e a lacuna. Não crie código provisório para decidir
requisito. Convenções locais verificadas podem resolver nomes, organização e detalhes técnicos.

Uma referência longa não é, por si, defeito de planejamento. Leia o trecho necessário, informe
contexto excessivo e recomende melhorar a próxima geração de tasks sem bloquear trabalho executável.

## Fix

Leia bloqueios e diff novo. Corrija somente o necessário, incluindo regressões causadas pela correção.
Repita a evidência afetada dentro do limite de ciclos da chamada. Não trate recomendações opcionais
como escopo.

## Verificação

Task vertical exige seleção de pelo menos um teste; enabling exige justificativa, gate estático e
a evidência específica. Se a evidência for o próprio build/typecheck do gate, registre isso para
não executar o mesmo comando duas vezes dentro da chamada. Execute os checks obrigatórios da
task em comandos separados; uma falha não dispensa registrar o resultado dos demais, salvo quando
uma dependência necessária impediu a execução.
Ausência de ferramenta, serviço ou timeout deve ser reportada como infraestrutura.
Não use comando de diagnóstico para concluir uma task nem altere seu `task_kind` para contornar falha.

## Saída

Inclua resultado final, arquivos, comandos/resultados de cada check, referências adicionais e
limitações.
TASK READY pode registrar preflight, mas o transporte exige IMPLEMENTATION COMPLETE e gate aprovado
para considerar a implementação concluída. Um erro após editar preserva as mudanças e retorna
gate_failed ou gate_error; não declare task_blocked com alegação falsa de nenhuma mudança.
