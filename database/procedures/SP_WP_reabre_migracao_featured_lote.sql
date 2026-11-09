DELIMITER $$

CREATE PROCEDURE `SP_WP_reabre_migracao_featured_lote`(
    IN p_pagina INT UNSIGNED,
    IN p_ultimo_post_checkpoint BIGINT UNSIGNED,
    IN p_checkpoint_updated_at DATETIME,
    IN p_candidatos JSON,
    IN p_alvos JSON,
    IN p_motivo VARCHAR(255)
)
BEGIN
    DECLARE v_pagina INT UNSIGNED DEFAULT NULL;
    DECLARE v_ultimo_post BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_checkpoint_updated_at DATETIME DEFAULT NULL;
    DECLARE v_per_page INT UNSIGNED DEFAULT NULL;
    DECLARE v_limite INT UNSIGNED DEFAULT NULL;
    DECLARE v_candidatos INT DEFAULT 0;
    DECLARE v_posts_distintos INT DEFAULT 0;
    DECLARE v_alvos INT DEFAULT 0;
    DECLARE v_ids_distintos INT DEFAULT 0;
    DECLARE v_alvos_posts_distintos INT DEFAULT 0;
    DECLARE v_invalidos INT DEFAULT 0;
    DECLARE v_validos INT DEFAULT 0;
    DECLARE v_ja_reabertos INT DEFAULT 0;
    DECLARE v_alterados INT DEFAULT 0;
    DECLARE v_resultado VARCHAR(20) DEFAULT NULL;
    DECLARE v_marcador TEXT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_pagina IS NULL OR p_pagina = 0
       OR p_ultimo_post_checkpoint IS NULL
       OR p_checkpoint_updated_at IS NULL
       OR p_motivo IS NULL OR TRIM(p_motivo) = ''
       OR p_candidatos IS NULL OR JSON_TYPE(p_candidatos) <> 'ARRAY'
       OR p_alvos IS NULL OR JSON_TYPE(p_alvos) <> 'ARRAY' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Parametros de reabertura invalidos';
    END IF;

    SET v_marcador = CONCAT(
        'REABERTURA_PAI_SEM_STORAGE; pagina=', p_pagina,
        '; motivo=', TRIM(p_motivo)
    );

    SELECT COUNT(*), COUNT(DISTINCT c.post_id),
           COALESCE(SUM(c.post_id IS NULL OR c.post_id <= 0
                        OR c.wp_media_id IS NULL OR c.wp_media_id <= 0), 0)
      INTO v_candidatos, v_posts_distintos, v_invalidos
      FROM JSON_TABLE(p_candidatos, '$[*]' COLUMNS (
          post_id BIGINT PATH '$.post_id',
          wp_media_id BIGINT PATH '$.wp_media_id'
      )) AS c;

    IF v_candidatos = 0 OR v_candidatos <> JSON_LENGTH(p_candidatos)
       OR v_posts_distintos <> v_candidatos OR v_invalidos <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Candidatos ausentes, duplicados ou invalidos';
    END IF;

    SELECT COUNT(*), COUNT(DISTINCT a.migration_id),
           COUNT(DISTINCT a.post_id),
           COALESCE(SUM(a.migration_id IS NULL OR a.migration_id <= 0
                        OR a.post_id IS NULL OR a.post_id <= 0
                        OR a.wp_media_id IS NULL OR a.wp_media_id <= 0
                        OR a.updated_at IS NULL
                        OR a.updated_at NOT REGEXP
                           '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}$'), 0)
      INTO v_alvos, v_ids_distintos, v_alvos_posts_distintos, v_invalidos
      FROM JSON_TABLE(p_alvos, '$[*]' COLUMNS (
          migration_id BIGINT PATH '$.migration_id',
          post_id BIGINT PATH '$.post_id',
          wp_media_id BIGINT PATH '$.wp_media_id',
          updated_at VARCHAR(64) PATH '$.updated_at'
      )) AS a;

    IF v_alvos = 0 OR v_alvos <> JSON_LENGTH(p_alvos)
       OR v_ids_distintos <> v_alvos
       OR v_alvos_posts_distintos <> v_alvos
       OR v_invalidos <> 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Alvos ausentes, duplicados ou invalidos';
    END IF;

    START TRANSACTION;

    SELECT pagina_atual, ultimo_post_id, updated_at, per_page, limite_execucao
      INTO v_pagina, v_ultimo_post, v_checkpoint_updated_at,
           v_per_page, v_limite
      FROM WP_migracao_checkpoint
     WHERE processo = 'FEATURED'
     FOR UPDATE;

    IF v_pagina IS NULL OR v_pagina <> p_pagina
       OR v_ultimo_post IS NULL
       OR v_ultimo_post <> p_ultimo_post_checkpoint
       OR v_checkpoint_updated_at IS NULL
       OR v_checkpoint_updated_at <> p_checkpoint_updated_at
       OR v_per_page IS NULL OR v_limite IS NULL
       OR v_candidatos > v_per_page OR v_alvos > v_limite THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Checkpoint ou tamanho do lote divergente';
    END IF;

    SELECT COUNT(*) INTO v_validos
      FROM JSON_TABLE(p_alvos, '$[*]' COLUMNS (
          migration_id BIGINT PATH '$.migration_id',
          post_id BIGINT PATH '$.post_id',
          wp_media_id BIGINT PATH '$.wp_media_id',
          updated_at VARCHAR(64) PATH '$.updated_at'
      )) AS a
      JOIN JSON_TABLE(p_candidatos, '$[*]' COLUMNS (
          post_id BIGINT PATH '$.post_id',
          wp_media_id BIGINT PATH '$.wp_media_id'
      )) AS c
        ON c.post_id = a.post_id AND c.wp_media_id = a.wp_media_id
      JOIN WP_migracao_featured AS m
        ON m.id = a.migration_id
       AND m.post_id = a.post_id
       AND m.wp_media_id = a.wp_media_id
     WHERE m.status = 'PROCESSING'
       AND DATE_FORMAT(m.updated_at, '%Y-%m-%d %H:%i:%s') = a.updated_at
       AND m.wp_media_id_virtual IS NULL
       AND m.sha256 IS NULL
       AND m.storage_provider IS NULL
       AND m.storage_key IS NULL
       AND m.storage_url IS NULL
       AND m.storage_asset_id IS NULL
       AND m.cloudinary_public_id IS NULL
       AND m.cloudinary_url IS NULL
       AND m.error_message IS NULL
       AND NOT EXISTS (
           SELECT 1 FROM WP_migracao_featured AS mv
            WHERE mv.post_id = a.post_id
              AND mv.wp_media_id_virtual = a.wp_media_id
       );

    IF v_validos = v_alvos THEN
        UPDATE WP_migracao_featured AS m
        JOIN JSON_TABLE(p_alvos, '$[*]' COLUMNS (
            migration_id BIGINT PATH '$.migration_id',
            post_id BIGINT PATH '$.post_id',
            wp_media_id BIGINT PATH '$.wp_media_id',
            updated_at VARCHAR(64) PATH '$.updated_at'
        )) AS a
          ON m.id = a.migration_id
         AND m.post_id = a.post_id
         AND m.wp_media_id = a.wp_media_id
           SET m.status = 'ERROR',
               m.error_message = v_marcador,
               m.updated_at = CURRENT_TIMESTAMP
         WHERE m.status = 'PROCESSING'
           AND DATE_FORMAT(m.updated_at, '%Y-%m-%d %H:%i:%s') = a.updated_at
           AND m.wp_media_id_virtual IS NULL
           AND m.sha256 IS NULL
           AND m.storage_provider IS NULL
           AND m.storage_key IS NULL
           AND m.storage_url IS NULL
           AND m.storage_asset_id IS NULL
           AND m.cloudinary_public_id IS NULL
           AND m.cloudinary_url IS NULL
           AND m.error_message IS NULL;

        SET v_alterados = ROW_COUNT();
        IF v_alterados <> v_alvos THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Lote mudou durante a reabertura; revertido';
        END IF;
        SET v_resultado = 'REABERTO';
    ELSE
        SELECT COUNT(*) INTO v_ja_reabertos
          FROM JSON_TABLE(p_alvos, '$[*]' COLUMNS (
              migration_id BIGINT PATH '$.migration_id',
              post_id BIGINT PATH '$.post_id',
              wp_media_id BIGINT PATH '$.wp_media_id'
          )) AS a
          JOIN JSON_TABLE(p_candidatos, '$[*]' COLUMNS (
              post_id BIGINT PATH '$.post_id',
              wp_media_id BIGINT PATH '$.wp_media_id'
          )) AS c
            ON c.post_id = a.post_id AND c.wp_media_id = a.wp_media_id
          JOIN WP_migracao_featured AS m
            ON m.id = a.migration_id
           AND m.post_id = a.post_id
           AND m.wp_media_id = a.wp_media_id
         WHERE m.status = 'ERROR'
           AND BINARY m.error_message = BINARY v_marcador
           AND m.wp_media_id_virtual IS NULL
           AND m.sha256 IS NULL
           AND m.storage_provider IS NULL
           AND m.storage_key IS NULL
           AND m.storage_url IS NULL
           AND m.storage_asset_id IS NULL
           AND m.cloudinary_public_id IS NULL
           AND m.cloudinary_url IS NULL;

        IF v_ja_reabertos <> v_alvos THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Migrations divergentes; reabertura cancelada';
        END IF;
        SET v_resultado = 'JA_REABERTO';
    END IF;

    COMMIT;

    SELECT v_resultado AS resultado, m.id AS migration_id,
           m.post_id, m.wp_media_id, m.status, m.error_message, m.updated_at
      FROM JSON_TABLE(p_alvos, '$[*]' COLUMNS (
          ordem FOR ORDINALITY,
          migration_id BIGINT PATH '$.migration_id'
      )) AS a
      JOIN WP_migracao_featured AS m ON m.id = a.migration_id
     ORDER BY a.ordem;
END$$

DELIMITER ;
