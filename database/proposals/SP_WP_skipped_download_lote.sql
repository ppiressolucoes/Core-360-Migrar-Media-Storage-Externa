-- PROPOSTA: homologar com o schema e as procedures ativas antes de criar.
DELIMITER $$
CREATE PROCEDURE `SP_WP_skipped_download_lote`(IN p_pagina INT, IN p_candidatos JSON, IN p_itens JSON)
BEGIN
  DECLARE n INT DEFAULT 0;
  DECLARE i INT DEFAULT 0;
  DECLARE mid BIGINT;
  DECLARE pid BIGINT;
  DECLARE wid BIGINT;
  DECLARE snap VARCHAR(32);
  DECLARE http INT;
  DECLARE origem_http INT;
  DECLARE motivo VARCHAR(80);
  DECLARE url TEXT;
  DECLARE auditoria TEXT;
  DECLARE pagina INT DEFAULT NULL;
  DECLARE achou INT DEFAULT 0;
  DECLARE atual_status VARCHAR(30);
  DECLARE atual_msg TEXT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF p_pagina IS NULL OR p_pagina <= 0 OR p_candidatos IS NULL
     OR JSON_TYPE(p_candidatos) <> 'ARRAY' OR JSON_LENGTH(p_candidatos) = 0 OR p_itens IS NULL
     OR JSON_TYPE(p_itens) <> 'ARRAY' OR JSON_LENGTH(p_itens) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Lote invalido';
  END IF;
  SET n = JSON_LENGTH(p_itens);
  IF n <> (SELECT COUNT(DISTINCT j.id) FROM JSON_TABLE(p_itens, '$[*]'
       COLUMNS (id BIGINT PATH '$.migration_id')) j) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'IDs invalidos ou duplicados';
  END IF;
  START TRANSACTION;
  SELECT pagina_atual INTO pagina FROM WP_migracao_checkpoint
   WHERE processo = 'FEATURED' FOR UPDATE;
  IF pagina IS NULL OR pagina <> p_pagina THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Checkpoint divergente';
  END IF;
  WHILE i < n DO
    SET mid = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].migration_id')));
    SET pid = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].post_id')));
    SET wid = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].wp_media_id')));
    SET snap = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].updated_at')));
    SET http = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].http_status')));
    SET origem_http = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].origem_http_status')));
    SET motivo = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].motivo')));
    SET url = JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].original_url')));
    IF mid IS NULL OR mid <= 0 OR pid IS NULL OR pid <= 0 OR wid IS NULL OR wid <= 0
       OR snap IS NULL OR snap NOT REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'
       OR http IS NULL OR http < 200 OR http >= 300
       OR origem_http IS NULL OR origem_http < 200 OR origem_http >= 300
       OR COALESCE(JSON_UNQUOTE(JSON_EXTRACT(p_itens, CONCAT('$[',i,'].origem_rejeicao_confirmada'))), '') <> 'true'
       OR motivo IS NULL OR motivo NOT REGEXP '^[A-Z0-9_]{1,80}$'
       OR url IS NULL OR url NOT REGEXP '^https?://' OR CHAR_LENGTH(url) > 2048 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Item ou HTTP invalido';
    END IF;
    IF (SELECT COUNT(*) FROM JSON_TABLE(p_candidatos, '$[*]' COLUMNS (
         post_id BIGINT PATH '$.post_id', wp_media_id BIGINT PATH '$.wp_media_id'
       )) AS c WHERE c.post_id=pid AND c.wp_media_id=wid) <> 1 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Item nao pertence aos candidatos';
    END IF;
    SET auditoria = CAST(JSON_OBJECT('tipo','DOWNLOAD_REJEITADO', 'motivo',motivo,
                         'url',url, 'http_status',http, 'origem_http_status',origem_http,
                         'pagina',p_pagina) AS CHAR);
    SELECT COUNT(*) INTO achou FROM WP_migracao_featured
     WHERE id=mid AND post_id=pid AND wp_media_id=wid;
    IF achou <> 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Identidade divergente'; END IF;
    SELECT status, error_message INTO atual_status, atual_msg FROM WP_migracao_featured
     WHERE id=mid AND post_id=pid AND wp_media_id=wid FOR UPDATE;
    IF atual_status = 'SKIPPED' AND BINARY atual_msg = BINARY auditoria THEN
      SET i = i + 1;
    ELSE
      UPDATE WP_migracao_featured SET status='SKIPPED', error_message=auditoria,
             updated_at=CURRENT_TIMESTAMP
       WHERE id=mid AND post_id=pid AND wp_media_id=wid AND status='PROCESSING'
         AND DATE_FORMAT(updated_at,'%Y-%m-%d %H:%i:%s')=snap AND error_message IS NULL
         AND wp_media_id_virtual IS NULL AND sha256 IS NULL AND storage_provider IS NULL
         AND storage_key IS NULL AND storage_url IS NULL AND storage_asset_id IS NULL
         AND cloudinary_public_id IS NULL AND cloudinary_url IS NULL
         AND cloudinary_asset_id IS NULL;
      IF ROW_COUNT() <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Estado ou storage divergente';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM WP_migracao_featured WHERE id=mid AND BINARY error_message = BINARY auditoria) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Auditoria truncada';
      END IF;
      SET i = i + 1;
    END IF;
  END WHILE;
  COMMIT;
  SELECT 'SKIPPED_REGISTRADO' AS resultado, n AS total;
END$$
DELIMITER ;
