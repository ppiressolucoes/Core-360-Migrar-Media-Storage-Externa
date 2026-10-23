# Artefatos MySQL

## Procedures canônicas

`procedures/` contém os contratos SQL mantidos pelo Core. Os contratos de
associação e conclusão usam `storage_provider` e `storage_url`, permitindo
Cloudinary, Cloudflare R2 e Backblaze B2.

`SP_WP_registra_storage_lote` preserva o storage já persistido: uma reexecução
idempotente com o mesmo contrato é aceita; qualquer troca de provider, key, URL,
asset ou SHA-256 gera `Storage conflitante na migration`.

As versões genéricas de `SP_WP_registra_storage_lote`,
`SP_WP_registra_associacao_lote` e `SP_WP_conclui_migracao_featured_lote`
refletem o contrato validado pela sprint. Antes de uma nova implantação, compare
estes arquivos com `SHOW CREATE PROCEDURE` do ambiente ativo. O repositório não
executa nem substitui procedures automaticamente.

## Procedures legadas

`legacy/` mantém a antiga `SP_WP_registra_cloudinary_lote`. Ela não deve ser
usada por novos lotes porque não implementa o contrato genérico de storage.

## Recuperação pontual

`recovery/pagina87-contexto-pendente.sql` contém consultas somente leitura
para conferir o checkpoint e as migrations 547–549 antes da retomada da
página 87. A consulta não libera o Sub 02 nem conclui migrations sozinha;
consulte também `docs/runbooks/pagina-87-sem-reserva.md`.

`recovery/pagina87-liberacao-excepcional.sql` implementa a exceção autorizada
para a página 87: marca somente 547–549 como `SKIPPED` após verificar o estado
exato dos seis registros e do checkpoint. Não apaga mídia original nem avança
o checkpoint. O operador executou o `CALL` no banco ativo em 2026-10-23; a
captura recebida mostrou as três migrations em `SKIPPED`. Uma nova execução do
PAI e a confirmação do checkpoint ainda estão pendentes. A captura não confirma
se o `DROP PROCEDURE` foi executado.

## Implantação

Revise o `DEFINER` conforme o ambiente antes de aplicar. A implantação deve ser
feita com `DROP PROCEDURE IF EXISTS` seguido do conteúdo do arquivo escolhido,
em uma janela controlada. Os arquivos não executam alterações automaticamente.
