CREATE DEFINER=`u164126954_auto_admin`@`%` PROCEDURE `SP_WP_registra_erro_associacao`(
    IN p_migration_id BIGINT UNSIGNED,
    IN p_post_id BIGINT UNSIGNED,
    IN p_wp_media_id_original BIGINT UNSIGNED,
    IN p_wp_media_id_virtual BIGINT UNSIGNED,
    IN p_error_message TEXT
)
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_virtual_atual BIGINT UNSIGNED;
    DECLARE v_count INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT COUNT(*)
      INTO v_count
      FROM WP_migracao_featured
     WHERE id = p_migration_id
       AND post_id = p_post_id
       AND wp_media_id = p_wp_media_id_original;

    IF v_count <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT =
                'Migration inexistente ou contexto divergente ao registrar erro';
    END IF;

    SELECT
        status,
        wp_media_id_virtual
    INTO
        v_status,
        v_virtual_atual
    FROM WP_migracao_featured
    WHERE id = p_migration_id
      AND post_id = p_post_id
      AND wp_media_id = p_wp_media_id_original
    FOR UPDATE;

    -- Nunca rebaixar uma migration já concluída
    IF v_status = 'MIGRATED' THEN

        COMMIT;

        SELECT
            p_migration_id AS migration_id,
            p_post_id AS post_id,
            v_virtual_atual AS wp_media_id_virtual,
            'MIGRATED' AS status,
            'JA_MIGRATED' AS resultado;

    ELSE

        -- Se já existe virtual no banco, não aceitar outro ID diferente
        IF v_virtual_atual IS NOT NULL
           AND p_wp_media_id_virtual IS NOT NULL
           AND v_virtual_atual <> p_wp_media_id_virtual THEN

            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'wp_media_id_virtual divergente ao registrar erro';
        END IF;

        UPDATE WP_migracao_featured
        SET
            wp_media_id_virtual =
                COALESCE(
                    wp_media_id_virtual,
                    p_wp_media_id_virtual
                ),

            status = 'ERROR',

            error_message =
                LEFT(
                    COALESCE(
                        p_error_message,
                        'ERRO_ASSOCIACAO_WP'
                    ),
                    1000
                ),

            updated_at = CURRENT_TIMESTAMP

        WHERE id = p_migration_id
          AND post_id = p_post_id
          AND wp_media_id = p_wp_media_id_original;

        COMMIT;

        SELECT
            id AS migration_id,
            post_id,
            wp_media_id AS wp_media_id_original,
            wp_media_id_virtual,
            status,
            error_message,
            updated_at,
            'ERRO_REGISTRADO' AS resultado
        FROM WP_migracao_featured
        WHERE id = p_migration_id;

    END IF;
END
