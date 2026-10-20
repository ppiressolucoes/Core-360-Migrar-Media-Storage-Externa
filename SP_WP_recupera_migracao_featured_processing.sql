CREATE DEFINER=`u164126954_auto_admin`@`%` PROCEDURE `SP_WP_recupera_migracao_featured_processing`(
    IN p_candidatos JSON
)
BEGIN

    SELECT
        m.id AS migration_id,
        jt.ordem,
        m.post_id,
        m.wp_media_id,
        m.status,
        m.created_at,
        m.updated_at

    FROM JSON_TABLE(
        p_candidatos,
        '$[*]' COLUMNS (
            ordem FOR ORDINALITY,
            post_id BIGINT PATH '$.post_id',
            wp_media_id BIGINT PATH '$.wp_media_id'
        )
    ) jt

    INNER JOIN WP_migracao_featured m
        ON m.post_id = jt.post_id
       AND m.wp_media_id = jt.wp_media_id

    WHERE m.status = 'PROCESSING'
      AND m.wp_media_id_virtual IS NULL

    ORDER BY jt.ordem ASC;

END