CREATE PROCEDURE `SP_WP_registra_cloudinary_lote`(
    IN p_uploads LONGTEXT
)
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_i INT DEFAULT 0;

    DECLARE v_migration_id BIGINT UNSIGNED;
    DECLARE v_sha256 CHAR(64);
    DECLARE v_public_id VARCHAR(255);
    DECLARE v_url TEXT;

    DECLARE v_atualizados INT DEFAULT 0;

    -- Validação básica do JSON
    IF p_uploads IS NULL OR JSON_VALID(p_uploads) = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'JSON de uploads inválido';
    END IF;

    SET v_total = JSON_LENGTH(p_uploads);

    START TRANSACTION;

    WHILE v_i < v_total DO

        SET v_migration_id = CAST(
            JSON_UNQUOTE(
                JSON_EXTRACT(
                    p_uploads,
                    CONCAT('$[', v_i, '].migration_id')
                )
            ) AS UNSIGNED
        );

        SET v_sha256 = JSON_UNQUOTE(
            JSON_EXTRACT(
                p_uploads,
                CONCAT('$[', v_i, '].sha256')
            )
        );

        SET v_public_id = JSON_UNQUOTE(
            JSON_EXTRACT(
                p_uploads,
                CONCAT('$[', v_i, '].cloudinary_public_id')
            )
        );

        SET v_url = JSON_UNQUOTE(
            JSON_EXTRACT(
                p_uploads,
                CONCAT('$[', v_i, '].cloudinary_url')
            )
        );

        -- Campos obrigatórios
        IF v_migration_id IS NULL
           OR v_sha256 IS NULL
           OR v_public_id IS NULL
           OR v_url IS NULL THEN

            ROLLBACK;

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Item do lote possui dados Cloudinary incompletos';
        END IF;

        UPDATE WP_migracao_featured
        SET
            sha256 = v_sha256,
            cloudinary_public_id = v_public_id,
            cloudinary_url = v_url,
            updated_at = NOW()
        WHERE id = v_migration_id
          AND status = 'PROCESSING';

        IF ROW_COUNT() <> 1 THEN
            ROLLBACK;

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migration ID inexistente ou fora de PROCESSING';
        END IF;

        SET v_atualizados = v_atualizados + 1;
        SET v_i = v_i + 1;

    END WHILE;

    COMMIT;

    -- Retorno para o n8n
    SELECT
        v_total AS total_recebidos,
        v_atualizados AS total_atualizados,
        'CLOUDINARY_REGISTRADO' AS etapa;

END