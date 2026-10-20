CREATE DEFINER=`u164126954_auto_admin`@`%` PROCEDURE `SP_WP_reserva_migracao_featured`(
    IN p_candidatos JSON,
    IN p_limite INT
)
BEGIN

    /* ============================================================
       1. Tabela temporária com candidatos enviados pelo n8n
       ============================================================ */

    DROP TEMPORARY TABLE IF EXISTS tmp_wp_migracao_candidatos;

    CREATE TEMPORARY TABLE tmp_wp_migracao_candidatos (
        ordem INT NOT NULL,
        post_id BIGINT UNSIGNED NOT NULL,
        wp_media_id BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (post_id, wp_media_id),
        KEY idx_ordem (ordem)
    );


    /* ============================================================
       2. Converte JSON recebido para registros
       ============================================================ */

    INSERT INTO tmp_wp_migracao_candidatos (
        ordem,
        post_id,
        wp_media_id
    )
    SELECT
        jt.ordem,
        jt.post_id,
        jt.wp_media_id
    FROM JSON_TABLE(
        p_candidatos,
        '$[*]' COLUMNS (
            ordem FOR ORDINALITY,
            post_id BIGINT PATH '$.post_id',
            wp_media_id BIGINT PATH '$.wp_media_id'
        )
    ) jt
    WHERE jt.post_id IS NOT NULL
      AND jt.wp_media_id IS NOT NULL
      AND jt.wp_media_id > 0;


    /* ============================================================
       3. Seleciona somente candidatos elegíveis

       Elegíveis:
       - combinação ainda não existe no controle
       - ou existe como PENDING / ERROR

       Bloqueados:
       - combinação atual PROCESSING / MIGRATED
       - featured_media atual já corresponde a uma mídia virtual
         anteriormente registrada para o mesmo post
       ============================================================ */

    DROP TEMPORARY TABLE IF EXISTS tmp_wp_migracao_reserva;

    CREATE TEMPORARY TABLE tmp_wp_migracao_reserva AS

    SELECT
        c.ordem,
        c.post_id,
        c.wp_media_id

    FROM tmp_wp_migracao_candidatos c

    LEFT JOIN WP_migracao_featured m
        ON m.post_id = c.post_id
       AND m.wp_media_id = c.wp_media_id

    WHERE
        (
            m.id IS NULL
            OR m.status IN ('PENDING', 'ERROR')
        )

        /* --------------------------------------------------------
           BLOQUEIO DE REMIGRAÇÃO

           Se a mídia atual do post já estiver registrada como
           wp_media_id_virtual, ela não pode entrar novamente.
           -------------------------------------------------------- */

        AND NOT EXISTS (
            SELECT 1
            FROM WP_migracao_featured mv
            WHERE mv.post_id = c.post_id
              AND mv.wp_media_id_virtual = c.wp_media_id
              AND mv.wp_media_id_virtual IS NOT NULL
        )

    ORDER BY c.ordem ASC

    LIMIT p_limite;


    /* ============================================================
       4. Reserva os itens selecionados
       ============================================================ */

    INSERT INTO WP_migracao_featured (
        post_id,
        wp_media_id,
        status,
        error_message
    )
    SELECT
        r.post_id,
        r.wp_media_id,
        'PROCESSING',
        NULL
    FROM tmp_wp_migracao_reserva r

    ON DUPLICATE KEY UPDATE
        status = 'PROCESSING',
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP;


    /* ============================================================
       5. Retorna somente o lote efetivamente reservado
       ============================================================ */

    SELECT
        m.id AS migration_id,
        r.ordem,
        m.post_id,
        m.wp_media_id,
        m.status,
        m.created_at,
        m.updated_at

    FROM tmp_wp_migracao_reserva r

    INNER JOIN WP_migracao_featured m
        ON m.post_id = r.post_id
       AND m.wp_media_id = r.wp_media_id

    ORDER BY r.ordem ASC;


    /* ============================================================
       6. Limpeza
       ============================================================ */

    DROP TEMPORARY TABLE IF EXISTS tmp_wp_migracao_reserva;
    DROP TEMPORARY TABLE IF EXISTS tmp_wp_migracao_candidatos;

END