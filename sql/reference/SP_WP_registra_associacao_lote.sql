CREATE PROCEDURE `SP_WP_registra_associacao_lote`(
    IN p_json LONGTEXT
)
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_idx INT DEFAULT 0;
    DECLARE v_processados INT DEFAULT 0;

    DECLARE v_migration_id BIGINT UNSIGNED;
    DECLARE v_post_id BIGINT UNSIGNED;
    DECLARE v_media_original BIGINT UNSIGNED;
    DECLARE v_media_virtual BIGINT UNSIGNED;

    DECLARE v_existe INT DEFAULT 0;
    DECLARE v_media_virtual_atual BIGINT UNSIGNED;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    /* ---------------------------------------------------
       1. Validação do JSON
       --------------------------------------------------- */

    IF p_json IS NULL OR JSON_VALID(p_json) = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'JSON de associações inválido';
    END IF;

    SET v_total = JSON_LENGTH(p_json);

    IF v_total IS NULL OR v_total = 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Nenhuma associação recebida';
    END IF;

    START TRANSACTION;

    /* ---------------------------------------------------
       2. Processamento
       --------------------------------------------------- */

    WHILE v_idx < v_total DO

        SET v_migration_id =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(
                    p_json,
                    CONCAT('$[', v_idx, '].migration_id')
                )
            ) AS UNSIGNED);

        SET v_post_id =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(
                    p_json,
                    CONCAT('$[', v_idx, '].post_id')
                )
            ) AS UNSIGNED);

        SET v_media_original =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(
                    p_json,
                    CONCAT('$[', v_idx, '].wp_media_id_original')
                )
            ) AS UNSIGNED);

        SET v_media_virtual =
            CAST(JSON_UNQUOTE(
                JSON_EXTRACT(
                    p_json,
                    CONCAT('$[', v_idx, '].wp_media_id_virtual')
                )
            ) AS UNSIGNED);

        /* -----------------------------------------------
           3. IDs obrigatórios
           ----------------------------------------------- */

        IF v_migration_id IS NULL
           OR v_post_id IS NULL
           OR v_media_original IS NULL
           OR v_media_virtual IS NULL THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Associação contém identificadores inválidos';

        END IF;

        /* -----------------------------------------------
           4. Localiza exatamente a migração esperada
           ----------------------------------------------- */

        SET v_existe = 0;
        SET v_media_virtual_atual = NULL;

        SELECT
            COUNT(*),
            MAX(wp_media_id_virtual)
        INTO
            v_existe,
            v_media_virtual_atual
        FROM WP_migracao_featured
        WHERE id = v_migration_id
          AND post_id = v_post_id
          AND wp_media_id = v_media_original
          AND status = 'PROCESSING'
          AND cloudinary_url IS NOT NULL;

        IF v_existe <> 1 THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Migração não encontrada ou estado incompatível';

        END IF;

        /* -----------------------------------------------
           5. Proteção contra associação conflitante

           NULL      -> pode registrar
           mesmo ID  -> reexecução idempotente
           outro ID  -> BLOQUEIA
           ----------------------------------------------- */

        IF v_media_virtual_atual IS NOT NULL
           AND v_media_virtual_atual <> v_media_virtual THEN

            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Conflito: migração já possui outra mídia virtual';

        END IF;

        /* -----------------------------------------------
           6. Registra associação

           Se já possuir o mesmo valor, continua sendo
           considerado sucesso.
           ----------------------------------------------- */

        UPDATE WP_migracao_featured
        SET
            wp_media_id_virtual = v_media_virtual,
            updated_at = NOW()
        WHERE id = v_migration_id
          AND post_id = v_post_id
          AND wp_media_id = v_media_original
          AND status = 'PROCESSING';

        SET v_processados = v_processados + 1;

        SET v_idx = v_idx + 1;

    END WHILE;

    COMMIT;

    /* ---------------------------------------------------
       7. Resultado
       --------------------------------------------------- */

    SELECT
        v_total AS total_recebidos,
        v_processados AS total_processados,
        'WP_ASSOCIACAO_REGISTRADA' AS etapa;

END