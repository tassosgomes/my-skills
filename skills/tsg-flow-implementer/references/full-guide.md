# Diagnóstico e correção

## Planejamento versus decisão local

Retorne TASK BLOCKED quando faltar decisão material de negócio, contrato, dados ou arquitetura
e a leitura seletiva não resolver. Cite a task e a lacuna. Não crie código provisório para decidir
requisito. Convenções locais verificadas podem resolver nomes, organização e detalhes técnicos.

Uma referência longa não é, por si, defeito de planejamento. Leia o trecho necessário, informe
contexto excessivo e recomende melhorar a próxima geração de tasks sem bloquear trabalho executável.

## Fix

Leia bloqueios e diff novo. Corrija somente o necessário, incluindo regressões causadas pela correção.
Faça uma passagem e execute a evidência declarada. Não trate recomendações opcionais como escopo.

## Verificação

Behavioral exige seleção de pelo menos um teste; static exige enabling justificada, gate --static e
a evidência específica. Se a evidência for o próprio build/typecheck do gate, registre isso para
não executar o mesmo comando duas vezes dentro da chamada.
Ausência de ferramenta, serviço ou timeout deve ser reportada como infraestrutura.
Não execute --skip-tests para concluir uma task nem altere seu tipo apenas para contornar falha.

## Saída

Inclua resultado final, arquivos, comandos/resultados, referências adicionais e limitações.
TASK READY pode registrar preflight, mas o transporte exige IMPLEMENTATION COMPLETE e gate aprovado
para considerar a implementação concluída. Um erro após editar preserva as mudanças e retorna
gate_failed ou gate_error; não declare task_blocked com alegação falsa de nenhuma mudança.
