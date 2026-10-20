SELECT
  id AS migration_id,
  post_id,
  wp_media_id AS wp_media_id_original,
  status,
  sha256,
  storage_provider,
  storage_key,
  storage_url,
  storage_asset_id,
  wp_media_id_virtual
FROM WP_migracao_featured
WHERE id IN (498, 500, 501)
ORDER BY id;

-- Consulta exclusiva para a retomada da página 79.
-- O preflight definitivo deve receber a lista dinâmica do lote.
