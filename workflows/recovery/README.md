# Recuperações históricas

Os arquivos `pagina75-*` preservam as entradas que foram usadas durante a retomada manual da página 75. Essa página já foi concluída e o ponteiro avançou para 76. **Não executar novamente os pins nem o script `pagina75-start-wp.js`.** Para uma nova página, usar o PAI e o storage canônico persistido no banco.

A página 76 também foi concluída e o ponteiro avançou para 77. Remover quaisquer pins usados na retomada das migrations 479–484 antes de iniciar o novo lote. Consulte [fechamento da página 76](../../docs/fechamento-pagina-76.md).

O arquivo `pagina74-471-start-wp.json` também é apenas histórico. Consulte [fechamento da página 75](../../docs/fechamento-pagina-75.md) para o resultado confirmado pelo operador.

`pagina79-recupera-lote-repositorio.js` é uma recuperação controlada para o conflito da migration 498: o banco já continha storage Cloudinary e a nova execução produziu outro objeto em R2 para o mesmo SHA. Usar somente após registrar 500–501 e conferir os três registros no banco; consulte [retomada do conflito 498](../../docs/retomada-storage-conflitante-498.md). Após concluir essa execução, restaurar o código normal do node.
