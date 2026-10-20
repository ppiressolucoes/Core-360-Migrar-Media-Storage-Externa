CREATE DEFINER=`u164126954_auto_admin`@`%` PROCEDURE `SP_WP_registra_storage_lote`(
    IN p_uploads LONGTEXT
)
BEGIN
    DECLARE v_i INT DEFAULT 1;
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_atualizados INT DEFAULT 0;

    DECLARE v_migration_id BIGINT UNSIGNED;
    DECLARE v_status VARCHAR(20);
    DECLARE v_sha256 CHAR(64);
    DECLARE v_provider VARCHAR(100);
    DECLARE v_storage_key VARCHAR(1024);
    DECLARE v_storage_url TEXT;
    DECLARE v_storage_asset_id VARCHAR(255);

    DECLARE v_db_sha256 CHAR(64);
    DECLARE v_db_provider VARCHAR(100);
    DECLARE v_db_storage_key VARCHAR(1024);
    DECLARE v_db_storage_url TEXT;
    DECLARE v_db_storage_asset_id VARCHAR(255);
    DECLARE v_existe INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        DROP TEMPORARY TABLE IF EXISTS tmp_storage_lote;
        RESIGNAL;
    END;

    IF p_uploads IS NULL OR JSON_VALID(p_uploads) = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'JSON de uploads inválido';
    END IF;

    SET v_total = JSON_LENGTH(p_uploads);

    IF v_total IS NULL OR v_total = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Lote de storage vazio';
    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_storage_lote;

    CREATE TEMPORARY TABLE tmp_storage_lote (
        ordem INT NOT NULL,
        migration_id BIGINT UNSIGNED NOT NULL,
        post_id BIGINT UNSIGNED NOT NULL,
        wp_media_id BIGINT UNSIGNED NOT NULL,
        original_url TEXT NOT NULL,
        sha256 CHAR(64) NOT NULL,
        storage_provider VARCHAR(100) NOT NULL,
        storage_key VARCHAR(1024) NOT NULL,
        storage_url TEXT NOT NULL,
        storage_asset_id VARCHAR(255) NOT NULL,
        storage_bytes BIGINT UNSIGNED NULL,
        storage_width INT UNSIGNED NULL,
        storage_height INT UNSIGNED NULL,
        storage_mime_type VARCHAR(100) NULL,
        cloudinary_cloud_name VARCHAR(255) NULL,
        cloudinary_public_id VARCHAR(1024) NULL,
        cloudinary_url TEXT NULL,
        cloudinary_asset_id VARCHAR(255) NULL,
        cloudinary_bytes BIGINT UNSIGNED NULL,
        cloudinary_width INT UNSIGNED NULL,
        cloudinary_height INT UNSIGNED NULL,
        cloudinary_format VARCHAR(50) NULL,
        PRIMARY KEY (migration_id),
        UNIQUE KEY uk_tmp_storage_ordem (ordem)
    );

    INSERT INTO tmp_storage_lote (
        ordem,
        migration_id,
        post_id,
        wp_media_id,
        original_url,
        sha256,
        storage_provider,
        storage_key,
        storage_url,
        storage_asset_id,
        storage_bytes,
        storage_width,
        storage_height,
        storage_mime_type,
        cloudinary_cloud_name,
        cloudinary_public_id,
        cloudinary_url,
        cloudinary_asset_id,
        cloudinary_bytes,
        cloudinary_width,
        cloudinary_height,
        cloudinary_format
    )
    SELECT
        jt.ordem,
        jt.migration_id,
        jt.post_id,
        jt.wp_media_id,
        jt.original_url,
        LOWER(jt.sha256),
        LOWER(jt.storage_provider),
        jt.storage_key,
        jt.storage_url,
        jt.storage_asset_id,
        jt.storage_bytes,
        jt.storage_width,
        jt.storage_height,
        jt.storage_mime_type,
        jt.cloudinary_cloud_name,
        jt.cloudinary_public_id,
        jt.cloudinary_url,
        jt.cloudinary_asset_id,
        jt.cloudinary_bytes,
        jt.cloudinary_width,
        jt.cloudinary_height,
        jt.cloudinary_format
    FROM JSON_TABLE(
        p_uploads,
        '$[*]' COLUMNS (
            ordem FOR ORDINALITY,
            migration_id BIGINT PATH '$.migration_id',
            post_id BIGINT PATH '$.post_id',
            wp_media_id BIGINT PATH '$.wp_media_id',
            original_url TEXT PATH '$.original_url',
            sha256 VARCHAR(64) PATH '$.sha256',
            storage_provider VARCHAR(100) PATH '$.storage_provider',
            storage_key VARCHAR(1024) PATH '$.storage_key',
            storage_url TEXT PATH '$.storage_url',
            storage_asset_id VARCHAR(255) PATH '$.storage_asset_id',
            storage_bytes BIGINT PATH '$.storage_bytes' NULL ON EMPTY,
            storage_width INT PATH '$.storage_width' NULL ON EMPTY,
            storage_height INT PATH '$.storage_height' NULL ON EMPTY,
            storage_mime_type VARCHAR(100) PATH '$.storage_mime_type' NULL ON EMPTY,
            cloudinary_cloud_name VARCHAR(255) PATH '$.cloudinary_cloud_name' NULL ON EMPTY,
            cloudinary_public_id VARCHAR(1024) PATH '$.cloudinary_public_id' NULL ON EMPTY,
            cloudinary_url TEXT PATH '$.cloudinary_url' NULL ON EMPTY,
            cloudinary_asset_id VARCHAR(255) PATH '$.cloudinary_asset_id' NULL ON EMPTY,
            cloudinary_bytes BIGINT PATH '$.cloudinary_bytes' NULL ON EMPTY,
            cloudinary_width INT PATH '$.cloudinary_width' NULL ON EMPTY,
            cloudinary_height INT PATH '$.cloudinary_height' NULL ON EMPTY,
            cloudinary_format VARCHAR(50) PATH '$.cloudinary_format' NULL ON EMPTY
        )
    ) AS jt;

    IF (SELECT COUNT(*) FROM tmp_storage_lote) <> v_total THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Lote de storage possui linhas inválidas ou duplicadas';
    END IF;

    START TRANSACTION;

    WHILE v_i <= v_total DO
        SELECT
            migration_id,
            sha256,
            storage_provider,
            storage_key,
            storage_url,
            storage_asset_id
        INTO
            v_migration_id,
            v_sha256,
            v_provider,
            v_storage_key,
            v_storage_url,
            v_storage_asset_id
        FROM tmp_storage_lote
        WHERE ordem = v_i;

        IF v_sha256 NOT REGEXP '^[0-9a-f]{64}$'
           OR v_provider NOT REGEXP '^[a-z0-9_]{1,100}$'
           OR v_storage_key = ''
           OR v_storage_url NOT REGEXP '^https://'
           OR v_storage_asset_id = '' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Storage recebido inválido';
        END IF;

        SELECT COUNT(*)
        INTO v_existe
        FROM WP_migracao_featured AS m
        JOIN tmp_storage_lote AS t
          ON t.migration_id = m.id
         AND t.post_id = m.post_id
         AND t.wp_media_id = m.wp_media_id
        WHERE t.ordem = v_i;

        IF v_existe <> 1 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Migration não encontrada ou contexto divergente';
        END IF;

        SELECT
            status,
            sha256,
            storage_provider,
            storage_key,
            storage_url,
            storage_asset_id
        INTO
            v_status,
            v_db_sha256,
            v_db_provider,
            v_db_storage_key,
            v_db_storage_url,
            v_db_storage_asset_id
        FROM WP_migracao_featured
        WHERE id = v_migration_id
        FOR UPDATE;

        IF v_status <> 'PROCESSING' THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Migration em estado incompatível para registrar storage';
        END IF;

        IF v_db_provider IS NOT NULL
           OR v_db_storage_key IS NOT NULL
           OR v_db_storage_url IS NOT NULL
           OR v_db_storage_asset_id IS NOT NULL THEN

            IF v_db_sha256 IS NULL
               OR v_db_provider IS NULL
               OR v_db_storage_key IS NULL
               OR v_db_storage_url IS NULL
               OR v_db_storage_asset_id IS NULL
               OR BINARY LOWER(v_db_sha256) <> BINARY v_sha256
               OR BINARY v_db_provider <> BINARY v_provider
               OR BINARY v_db_storage_key <> BINARY v_storage_key
               OR BINARY v_db_storage_url <> BINARY v_storage_url
               OR BINARY v_db_storage_asset_id <> BINARY v_storage_asset_id THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Storage conflitante na migration';
            END IF;

        ELSE
            UPDATE WP_migracao_featured AS m
            JOIN tmp_storage_lote AS t
              ON t.migration_id = m.id
            SET
                m.sha256 = t.sha256,
                m.storage_provider = t.storage_provider,
                m.storage_key = t.storage_key,
                m.storage_url = t.storage_url,
                m.storage_asset_id = t.storage_asset_id,
                m.storage_bytes = t.storage_bytes,
                m.storage_width = t.storage_width,
                m.storage_height = t.storage_height,
                m.storage_mime_type = t.storage_mime_type,
                m.cloudinary_cloud_name = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN t.cloudinary_cloud_name
                    ELSE NULL
                END,
                m.cloudinary_public_id = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN t.storage_key
                    ELSE NULL
                END,
                m.cloudinary_url = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN t.storage_url
                    ELSE NULL
                END,
                m.cloudinary_asset_id = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN t.storage_asset_id
                    ELSE NULL
                END,
                m.cloudinary_bytes = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN COALESCE(t.cloudinary_bytes, t.storage_bytes)
                    ELSE NULL
                END,
                m.cloudinary_width = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN COALESCE(t.cloudinary_width, t.storage_width)
                    ELSE NULL
                END,
                m.cloudinary_height = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN COALESCE(t.cloudinary_height, t.storage_height)
                    ELSE NULL
                END,
                m.cloudinary_format = CASE
                    WHEN t.storage_provider = 'cloudinary' THEN t.cloudinary_format
                    ELSE NULL
                END,
                m.error_message = NULL,
                m.updated_at = CURRENT_TIMESTAMP
            WHERE t.ordem = v_i;
        END IF;

        SET v_atualizados = v_atualizados + 1;
        SET v_i = v_i + 1;
    END WHILE;

    COMMIT;
    DROP TEMPORARY TABLE IF EXISTS tmp_storage_lote;

    SELECT
        v_total AS total_recebidos,
        v_atualizados AS total_atualizados,
        'STORAGE_REGISTRADO' AS etapa;
END
