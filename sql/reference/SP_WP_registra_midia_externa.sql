CREATE PROCEDURE `SP_WP_registra_midia_externa`(
    IN p_migration_id BIGINT UNSIGNED,
    IN p_post_id BIGINT UNSIGNED,
    IN p_wp_media_id BIGINT UNSIGNED,
    IN p_source_url TEXT
)
BEGIN

    DECLARE v_existe INT DEFAULT 0;

    /* Confirma que estamos alterando exatamente
       a reserva PROCESSING esperada */
    SELECT COUNT(*)
      INTO v_existe
    FROM WP_migracao_featured
    WHERE id = p_migration_id
      AND post_id = p_post_id
      AND wp_media_id = p_wp_media_id
      AND status = 'PROCESSING';

    IF v_existe <> 1 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT =
            'Migração não encontrada ou estado incompatível para SKIPPED';
    END IF;

    UPDATE WP_migracao_featured
    SET
        status = 'SKIPPED',
        error_message = CONCAT(
            'MIDIA_EXTERNA_ORIGEM: ',
            LEFT(COALESCE(p_source_url, 'URL não informada'), 1000)
        ),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_migration_id
      AND post_id = p_post_id
      AND wp_media_id = p_wp_media_id
      AND status = 'PROCESSING';

    SELECT
        p_migration_id AS migration_id,
        p_post_id AS post_id,
        p_wp_media_id AS wp_media_id,
        'SKIPPED' AS status,
        'MIDIA_EXTERNA_ORIGEM' AS motivo;

END