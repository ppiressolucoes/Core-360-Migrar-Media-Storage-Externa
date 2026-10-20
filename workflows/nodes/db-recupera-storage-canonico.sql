-- Node MySQL após SP | Registra Lote.
-- Query Parameters: ={{ [JSON.stringify($('Monta | Lote Uploads').first().json.uploads.map(x => Number(x.migration_id)))] }}
SELECT m.id AS migration_id,
       m.post_id,
       m.wp_media_id AS wp_media_id_original,
       m.status,
       m.sha256,
       m.storage_provider,
       m.storage_key,
       m.storage_url,
       m.storage_asset_id,
       m.wp_media_id_virtual
FROM WP_migracao_featured AS m
JOIN JSON_TABLE($1, '$[*]' COLUMNS (migration_id BIGINT PATH '$')) AS lote
  ON lote.migration_id = m.id
ORDER BY m.id;
