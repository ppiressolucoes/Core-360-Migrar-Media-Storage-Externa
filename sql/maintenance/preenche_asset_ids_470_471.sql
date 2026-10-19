-- Banco da migração, não o banco WordPress. Execute comandos separadamente.
-- SP_WP_registra_storage_lote já foi instalada e registrou estas URLs.
-- O CALL repete exatamente SHA/provider/chave/URL e apenas completa asset IDs
-- nulos. A procedure rejeita estado, identidade ou URL conflitante.

SELECT id, post_id, wp_media_id, status, sha256, storage_provider,
       storage_key, storage_url, storage_asset_id, wp_media_id_virtual
FROM WP_migracao_featured
WHERE id IN (470, 471)
ORDER BY id;

CALL SP_WP_registra_storage_lote('[
  {
    "migration_id": 470,
    "post_id": 6633,
    "wp_media_id": 6639,
    "sha256": "05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4",
    "storage_provider": "cloudinary",
    "storage_key": "pel/featured/05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4",
    "storage_url": "https://res.cloudinary.com/gbjn0cjg/image/upload/v1792420826/pel/featured/05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4.jpg",
    "storage_asset_id": "daef082f0bf1b010c1c33232fb80d46c"
  },
  {
    "migration_id": 471,
    "post_id": 6642,
    "wp_media_id": 6643,
    "sha256": "bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080",
    "storage_provider": "cloudinary",
    "storage_key": "pel/featured/bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080",
    "storage_url": "https://res.cloudinary.com/nksstmuv/image/upload/v1792420837/pel/featured/bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080.jpg",
    "storage_asset_id": "b9901c588f1116b241f964a77319eba9"
  }
]');

SELECT id, status, storage_provider, storage_asset_id, wp_media_id_virtual
FROM WP_migracao_featured
WHERE id IN (470, 471)
ORDER BY id;
