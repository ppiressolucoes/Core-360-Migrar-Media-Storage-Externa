DELIMITER $$
DROP PROCEDURE IF EXISTS SP_WP_conclui_migracao_featured_lote$$
CREATE PROCEDURE `SP_WP_conclui_migracao_featured_lote`(
    IN p_lote JSON
)
BEGIN
    DECLARE v_i INT DEFAULT 0;
    DECLARE v_total INT DEFAULT 0;

    DECLARE v_migration_id BIGINT UNSIGNED;
    DECLARE v_post_id BIGINT UNSIGNED;
    DECLARE v_wp_media_id_original BIGINT UNSIGNED;
    DECLARE v_wp_media_id_virtual BIGINT UNSIGNED;
    DECLARE v_storage_url TEXT;
    DECLARE v_storage_provider VARCHAR(32);

    DECLARE v_count INT DEFAULT 0;
    DECLARE v_status VARCHAR(20);
    DECLARE v_db_virtual BIGINT UNSIGNED;
    DECLARE v_db_storage_url TEXT;
    DECLARE v_db_storage_provider VARCHAR(32);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET v_total = JSON_LENGTH(p_lote);

    IF v_total IS NULL OR v_total = 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Lote final vazio';
    END IF;

    START TRANSACTION;

    WHILE v_i < v_total DO

        SET v_migration_id =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(p_lote, CONCAT('$[', v_i, '].migration_id'))
            ) AS UNSIGNED);

        SET v_post_id =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(p_lote, CONCAT('$[', v_i, '].post_id'))
            ) AS UNSIGNED);

        SET v_wp_media_id_original =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(p_lote, CONCAT('$[', v_i, '].wp_media_id_original'))
            ) AS UNSIGNED);

        SET v_wp_media_id_virtual =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(p_lote, CONCAT('$[', v_i, '].wp_media_id_virtual'))
            ) AS UNSIGNED);

        SET v_storage_url =
            JSON_UNQUOTE(
                JSON_EXTRACT(p_lote, CONCAT('$[', v_i, '].storage_url'))
            );
        SET v_storage_provider =
            JSON_UNQUOTE(
                JSON_EXTRACT(p_lote, CONCAT('$[', v_i, '].storage_provider'))
            );

        /* -------------------------------------------------
           1. Localiza exatamente a migration esperada
           ------------------------------------------------- */

        SELECT COUNT(*)
          INTO v_count
          FROM WP_migracao_featured
         WHERE id = v_migration_id
           AND post_id = v_post_id
           AND wp_media_id = v_wp_media_id_original;

        IF v_count <> 1 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Migration inexistente ou contexto original divergente';
        END IF;


        /* -------------------------------------------------
           2. Recupera estado persistido
           ------------------------------------------------- */

        SELECT
            status,
            wp_media_id_virtual,
            storage_url,
            storage_provider
        INTO
            v_status,
            v_db_virtual,
            v_db_storage_url,
            v_db_storage_provider
        FROM WP_migracao_featured
        WHERE id = v_migration_id
          AND post_id = v_post_id
          AND wp_media_id = v_wp_media_id_original
        FOR UPDATE;


        /* -------------------------------------------------
           3. Valida mídia virtual
           ------------------------------------------------- */

        IF v_db_virtual IS NULL
           OR v_db_virtual <> v_wp_media_id_virtual THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'wp_media_id_virtual divergente';

        END IF;


        /* -------------------------------------------------
           4. Valida URL storage
           ------------------------------------------------- */

        IF v_db_storage_url IS NULL
           OR v_db_storage_provider IS NULL
           OR v_storage_url IS NULL
           OR v_storage_provider IS NULL
           OR v_db_storage_provider <> v_storage_provider
           OR BINARY v_db_storage_url <> BINARY v_storage_url THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'storage_url divergente';

        END IF;


        /* -------------------------------------------------
           5. Idempotência
           ------------------------------------------------- */

        IF v_status = 'PROCESSING' THEN

            UPDATE WP_migracao_featured
               SET status       = 'MIGRATED',
                   migrated_at  = COALESCE(migrated_at, CURRENT_TIMESTAMP),
                   error_message = NULL,
                   updated_at   = CURRENT_TIMESTAMP
             WHERE id = v_migration_id;

        ELSEIF v_status = 'MIGRATED' THEN

            /* Já concluída com o mesmo contexto.
               Não faz UPDATE novamente. */
            SET v_status = 'MIGRATED';

        ELSE

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Status incompatível para conclusão da migration';

        END IF;

        SET v_i = v_i + 1;

    END WHILE;

    COMMIT;


    /* -------------------------------------------------
       Resultado para o n8n
       ------------------------------------------------- */

    SELECT
        m.id AS migration_id,
        m.post_id,
        m.wp_media_id AS wp_media_id_original,
        m.wp_media_id_virtual,
        m.storage_url,
        m.storage_provider,
        m.status,
        m.migrated_at
    FROM WP_migracao_featured m
    WHERE JSON_CONTAINS(
        p_lote,
        JSON_OBJECT('migration_id', m.id)
    )
    ORDER BY m.id;

END$$
DELIMITER ;
