-- Somente leitura no banco WordPress confirmado: u164126954_bNEJI.
-- Tabelas confirmadas: wp_posts e wp_postmeta (minúsculas).
-- Não consulta nem altera o banco separado WP_migracao_featured.
SELECT
    p.ID AS attachment_id,
    p.post_status,
    p.post_parent,
    s.meta_value AS sha256,
    provider.meta_value AS storage_provider,
    COALESCE(NULLIF(storage_url.meta_value, ''), legacy_url.meta_value) AS storage_url,
    COALESCE(NULLIF(storage_asset.meta_value, ''), legacy_asset.meta_value) AS asset_id,
    COALESCE(NULLIF(storage_key.meta_value, ''), legacy_key.meta_value) AS public_id,
    p.guid
FROM u164126954_bNEJI.wp_postmeta AS s
JOIN u164126954_bNEJI.wp_posts AS p
  ON p.ID = s.post_id AND p.post_type = 'attachment'
LEFT JOIN u164126954_bNEJI.wp_postmeta AS provider
  ON provider.post_id = p.ID AND provider.meta_key = '_m360_external_storage_provider'
LEFT JOIN u164126954_bNEJI.wp_postmeta AS storage_url
  ON storage_url.post_id = p.ID AND storage_url.meta_key = '_m360_external_storage_url'
LEFT JOIN u164126954_bNEJI.wp_postmeta AS storage_asset
  ON storage_asset.post_id = p.ID AND storage_asset.meta_key = '_m360_external_storage_asset_id'
LEFT JOIN u164126954_bNEJI.wp_postmeta AS storage_key
  ON storage_key.post_id = p.ID AND storage_key.meta_key = '_m360_external_storage_public_id'
LEFT JOIN u164126954_bNEJI.wp_postmeta AS legacy_url
  ON legacy_url.post_id = p.ID AND legacy_url.meta_key = '_m360_external_cloudinary_secure_url'
LEFT JOIN u164126954_bNEJI.wp_postmeta AS legacy_asset
  ON legacy_asset.post_id = p.ID AND legacy_asset.meta_key = '_m360_external_cloudinary_asset_id'
LEFT JOIN u164126954_bNEJI.wp_postmeta AS legacy_key
  ON legacy_key.post_id = p.ID AND legacy_key.meta_key = '_m360_external_cloudinary_public_id'
WHERE s.meta_key = '_m360_external_media_sha256'
  AND s.meta_value IN (
    '05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4',
    'bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080'
  )
ORDER BY s.meta_value, p.ID;
