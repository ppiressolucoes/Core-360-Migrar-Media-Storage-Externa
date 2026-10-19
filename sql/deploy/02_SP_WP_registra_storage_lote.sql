DELIMITER $$
DROP PROCEDURE IF EXISTS SP_WP_registra_storage_lote$$
CREATE PROCEDURE SP_WP_registra_storage_lote(IN p_uploads LONGTEXT)
BEGIN
  DECLARE v_i INT DEFAULT 0;
  DECLARE v_total INT;
  DECLARE v_id BIGINT UNSIGNED;
  DECLARE v_sha CHAR(64);
  DECLARE v_provider VARCHAR(32);
  DECLARE v_key VARCHAR(255);
  DECLARE v_url TEXT;
  DECLARE v_asset VARCHAR(255);
  DECLARE v_post BIGINT UNSIGNED;
  DECLARE v_media BIGINT UNSIGNED;
  DECLARE v_count INT;
  DECLARE v_old_status VARCHAR(20);
  DECLARE v_old_provider VARCHAR(32);
  DECLARE v_old_key VARCHAR(255);
  DECLARE v_old_url TEXT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  IF p_uploads IS NULL OR JSON_VALID(p_uploads) = 0 OR JSON_TYPE(p_uploads) <> 'ARRAY'
     OR JSON_LENGTH(p_uploads) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lote de storage inválido';
  END IF;
  SET v_total = JSON_LENGTH(p_uploads);
  START TRANSACTION;
  WHILE v_i < v_total DO
    SET v_id = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].migration_id'))) AS UNSIGNED);
    SET v_post = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].post_id'))) AS UNSIGNED);
    SET v_media = CAST(JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].wp_media_id'))) AS UNSIGNED);
    SET v_sha = JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].sha256')));
    SET v_provider = JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].storage_provider')));
    SET v_key = JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].storage_key')));
    SET v_url = JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].storage_url')));
    SET v_asset = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(p_uploads, CONCAT('$[',v_i,'].storage_asset_id'))),'null');
    IF v_id IS NULL OR v_post IS NULL OR v_media IS NULL OR v_sha IS NULL
       OR v_provider IS NULL OR v_key IS NULL OR v_url IS NULL
       OR v_sha NOT REGEXP '^[a-f0-9]{64}$'
       OR v_provider NOT IN ('cloudinary','cloudflare_r2','backblaze_b2')
       OR v_key NOT LIKE CONCAT('%/',v_sha)
       OR v_url NOT LIKE 'https://%'
       OR LOCATE(CONCAT('/',v_key,'.'),v_url) = 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Upload possui contrato de storage inválido';
    END IF;
    SELECT COUNT(*) INTO v_count
      FROM WP_migracao_featured
      WHERE id = v_id AND post_id = v_post AND wp_media_id = v_media
        AND status = 'PROCESSING';
    IF v_count <> 1 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Migration ausente ou fora de PROCESSING';
    END IF;
    SELECT status, storage_provider, storage_key, storage_url
      INTO v_old_status, v_old_provider, v_old_key, v_old_url
      FROM WP_migracao_featured WHERE id = v_id FOR UPDATE;
    IF v_old_status <> 'PROCESSING' OR (v_old_provider IS NOT NULL AND
        (v_old_provider <> v_provider OR v_old_key IS NULL OR v_old_url IS NULL
         OR BINARY v_old_key <> BINARY v_key OR BINARY v_old_url <> BINARY v_url)) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Storage conflitante na migration';
    END IF;
    UPDATE WP_migracao_featured
       SET sha256 = v_sha,
           storage_provider = v_provider, storage_key = v_key,
           storage_url = v_url, storage_asset_id = v_asset,
           cloudinary_public_id = IF(v_provider = 'cloudinary',v_key,NULL),
           cloudinary_url = IF(v_provider = 'cloudinary',v_url,NULL),
           updated_at = NOW()
     WHERE id = v_id;
    SET v_i = v_i + 1;
  END WHILE;
  COMMIT;
  SELECT v_total AS total_recebidos, v_total AS total_atualizados, 'STORAGE_REGISTRADO' AS etapa;
END$$
DELIMITER ;
