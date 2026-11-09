-- Pagina 132: a media 11400 (migration 800) veio com URL de origem malformada:
-- https://energialimpa.live/wp-content/uploads/https://agenciabrasil.ebc.com.br/ebc.png?id=1607604&o=node
-- O download retornou text/html e o upload nao foi confirmado.
-- Executar somente com o PAI e subfluxos parados, apos conferir os SELECTs.
-- Este UPDATE afeta apenas a migration 800 e nao avanca o checkpoint.

SELECT processo, pagina_atual, per_page, limite_execucao, ultimo_post_id,
       updated_at
  FROM WP_migracao_checkpoint
 WHERE processo = 'FEATURED';

SELECT id, post_id, wp_media_id, wp_media_id_virtual, status, sha256,
       storage_provider, storage_key, storage_url, storage_asset_id,
       cloudinary_public_id, cloudinary_url, error_message, updated_at
  FROM WP_migracao_featured
 WHERE id = 800;

UPDATE WP_migracao_featured AS m
JOIN WP_migracao_checkpoint AS c
  ON c.processo = 'FEATURED'
 AND c.pagina_atual = 132
 AND c.per_page = 6
 AND c.limite_execucao = 3
 AND c.ultimo_post_id = 11331
   SET m.status = 'SKIPPED',
       m.error_message = CONCAT(
         'EXCECAO_P132_URL_ORIGEM_INVALIDA; ',
         'URL externa embutida em /wp-content/uploads/; ',
         'download retornou text/html; auditoria posterior pendente;'
       ),
       m.updated_at = CURRENT_TIMESTAMP
 WHERE m.id = 800
   AND m.post_id = 11380
   AND m.wp_media_id = 11400
   AND m.status = 'PROCESSING'
   AND m.wp_media_id_virtual IS NULL
   AND m.sha256 IS NULL
   AND m.storage_provider IS NULL
   AND m.storage_key IS NULL
   AND m.storage_url IS NULL
   AND m.storage_asset_id IS NULL
   AND m.cloudinary_public_id IS NULL
   AND m.cloudinary_url IS NULL
   AND m.error_message IS NULL;

SELECT ROW_COUNT() AS linhas_alteradas_esperadas_1;

SELECT id, post_id, wp_media_id, wp_media_id_virtual, status, sha256,
       storage_provider, storage_key, storage_url, storage_asset_id,
       cloudinary_public_id, cloudinary_url, error_message, updated_at
  FROM WP_migracao_featured
 WHERE id = 800;
