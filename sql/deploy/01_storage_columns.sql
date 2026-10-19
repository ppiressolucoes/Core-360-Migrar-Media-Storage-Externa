-- Executar uma vez antes de publicar o PAI multi-storage.
ALTER TABLE WP_migracao_featured
  ADD COLUMN storage_provider VARCHAR(32) NULL,
  ADD COLUMN storage_key VARCHAR(255) NULL,
  ADD COLUMN storage_url TEXT NULL,
  ADD COLUMN storage_asset_id VARCHAR(255) NULL;

-- Compatibilidade com migrations Cloudinary já concluídas.
UPDATE WP_migracao_featured
SET storage_provider = 'cloudinary',
    storage_key = cloudinary_public_id,
    storage_url = cloudinary_url
WHERE cloudinary_url IS NOT NULL
  AND storage_provider IS NULL;
