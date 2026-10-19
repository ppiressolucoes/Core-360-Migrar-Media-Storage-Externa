-- Executar uma vez antes de publicar o PAI multi-storage.
ALTER TABLE WP_migracao_featured
  ADD COLUMN storage_provider VARCHAR(100) NULL,
  ADD COLUMN storage_key VARCHAR(255) NULL,
  ADD COLUMN storage_url TEXT NULL,
  ADD COLUMN storage_asset_id VARCHAR(255) NULL;

-- Backfill somente de migrations concluídas e identificadas como Cloudinary.
-- Linhas PROCESSING/ERROR exigem reconciliação antes de definir o provider.
UPDATE WP_migracao_featured
SET storage_provider = 'cloudinary',
    storage_key = cloudinary_public_id,
    storage_url = cloudinary_url
WHERE status = 'MIGRATED'
  AND cloudinary_public_id IS NOT NULL
  AND cloudinary_url LIKE 'https://res.cloudinary.com/%'
  AND storage_provider IS NULL;
