-- Recuperacao da pagina 132 apos falha no terceiro item do loop.
-- Dados recebidos de Consolida | Resultado Upload em 2026-11-09.
-- Executar uma vez no mesmo banco do PAI, sem execucao concorrente do fluxo.
-- A SP ativa valida PROCESSING e conflitos por migration antes do COMMIT.
-- Este script nao altera a migration 800 nem o checkpoint.

SELECT id, post_id, wp_media_id, status, sha256, storage_provider,
       storage_key, storage_url, storage_asset_id, wp_media_id_virtual,
       cloudinary_public_id, cloudinary_url, updated_at
  FROM WP_migracao_featured
 WHERE id IN (798, 799)
 ORDER BY id;

CALL SP_WP_registra_storage_lote('[
  {
    "migration_id": 798,
    "post_id": 11358,
    "wp_media_id": 11382,
    "sha256": "e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8",
    "storage_provider": "cloudinary",
    "storage_key": "pel/featured/e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8",
    "storage_url": "https://res.cloudinary.com/zdzn0kgm/image/upload/v1794231178/pel/featured/e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8.jpg",
    "storage_asset_id": "af2afbd86ed3c90c6f112e0ce7c10700"
  },
  {
    "migration_id": 799,
    "post_id": 11365,
    "wp_media_id": 11373,
    "sha256": "ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826",
    "storage_provider": "cloudflare_r2",
    "storage_key": "pel/featured/ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826",
    "storage_url": "https://pub-bcab0fcb78004202b92d225c4ee2e3d4.r2.dev/pel/featured/ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826.jpg",
    "storage_asset_id": "ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826"
  }
]');

SELECT id, post_id, wp_media_id, status, sha256, storage_provider,
       storage_key, storage_url, storage_asset_id, wp_media_id_virtual,
       cloudinary_public_id, cloudinary_url, updated_at
  FROM WP_migracao_featured
 WHERE id IN (798, 799, 800)
 ORDER BY id;
