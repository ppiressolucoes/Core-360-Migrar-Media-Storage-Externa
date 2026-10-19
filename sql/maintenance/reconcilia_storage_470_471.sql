-- Página 74, 19/10/2026: executar somente após conferir o SELECT.
-- Requer as colunas do deploy/01 e SP_WP_registra_storage_lote do deploy/02.
-- Não faz upload, registro WP, associação ou exclusão.
-- A procedure abre sua própria transação e rejeita qualquer SHA, chave, URL,
-- post, mídia original ou status PROCESSING que não corresponda ao banco.

SELECT id, post_id, wp_media_id, status, sha256,
       cloudinary_public_id, cloudinary_url, wp_media_id_virtual,
       storage_provider, storage_key, storage_url, storage_asset_id
FROM WP_migracao_featured
WHERE id IN (470, 471)
ORDER BY id;

-- Executar o CALL separadamente no MySQL Workbench, depois de conferir o SELECT.
-- Os asset IDs desta execução não foram preservados; NULL é aceito pela SP.
CALL SP_WP_registra_storage_lote('[
  {
    "migration_id": 470,
    "post_id": 6633,
    "wp_media_id": 6639,
    "sha256": "05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4",
    "storage_provider": "cloudinary",
    "storage_key": "pel/featured/05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4",
    "storage_url": "https://res.cloudinary.com/gbjn0cjg/image/upload/v1792420826/pel/featured/05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4.jpg",
    "storage_asset_id": null
  },
  {
    "migration_id": 471,
    "post_id": 6642,
    "wp_media_id": 6643,
    "sha256": "bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080",
    "storage_provider": "cloudinary",
    "storage_key": "pel/featured/bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080",
    "storage_url": "https://res.cloudinary.com/nksstmuv/image/upload/v1792420837/pel/featured/bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080.jpg",
    "storage_asset_id": null
  }
]');

SELECT id, status, storage_provider, storage_key, storage_url,
       storage_asset_id, wp_media_id_virtual
FROM WP_migracao_featured
WHERE id IN (470, 471)
ORDER BY id;
