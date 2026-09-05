# Transporte por Herdr

Use `scripts/tsg-delegate.sh` a partir do repositório alvo. Cada chamada cria pane e worker novos,
aguarda conclusão e valida um JSON em diretório exclusivo por run_id.

```text
<caminho-da-skill>/scripts/tsg-delegate.sh --role=validator --kind=codex \
  --prd-dir=tasks/prd-exemplo --task=1.0 --mode=focused --attempt=1/3
```

Para full, omita task e forneça --base-ref. Integrator aceita todos os modos do seu SKILL.md,
incluindo prepare-integration. Não há mais dependência de um veredito extraído do terminal.

## Resultado

- DELEGATE result=ok: o envelope é válido, não necessariamente a etapa aprovada.
- VERDICT: outcome do JSON. Resultado de negócio pertence ao orquestrador.
- RESULT: caminho do JSON, contendo identidade da chamada e resultado final.
- REPORT: review, para validator; inclui Run da chamada para impedir reutilização de relatório antigo.
- LOG: saída de inicialização/espera e trecho final de diagnóstico do terminal.

Exit 0 significa envelope válido; 2 é falha de transporte; 3 é erro de uso.
Outcome gate_error/validation_error é infraestrutura mesmo com exit 0 do transporte.
Timeout continua sendo falha mesmo se o worker escreveu um resultado parcial ou completo:
reconcilie seus efeitos antes de repetir. Nunca use TASK READY como implementação concluída.

## Ambiente e operação

Herdr e jq devem estar disponíveis. Configure o modo não interativo conforme o runtime e autoridade
já existente; não desligue controles de autorização por conveniência.
TSG_AGENT_EXTRA_ARGS aceita argumentos simples separados por espaço, sem interpretação de shell.
Use --model somente para escolhas já configuradas/autorizadas.

O script mantém os arquivos em .tsg-flow/delegate-logs/ por padrão; TSG_DELEGATE_LOG_DIR pode alterar
o local. Não inclua logs/resultados nos checkpoints por rotina. Sua retenção é independente das ADRs.
Não aumente --lines para transportar um relatório: leia REPORT/RESULT do disco.

## Limite de confiança

O envelope comprova identidade e conclusão do protocolo, não correção do código. O orquestrador
confere commits e estados; o validator faz a revisão independente. O schema é enviado no próprio
pedido ao worker, mantendo as skills de papel utilizáveis também por subagentes nativos.
