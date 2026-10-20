CREATE DEFINER=`u164126954_auto_admin`@`%` PROCEDURE `SP_WP_fecha_checkpoint_featured`(
    IN p_candidatos JSON,
    IN p_pagina_processada INT UNSIGNED,
    IN p_ultimo_post_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_resolvidos INT DEFAULT 0;

    DECLARE v_pagina_atual INT UNSIGNED;
    DECLARE v_ultimo_checkpoint BIGINT UNSIGNED;

    DROP TEMPORARY TABLE IF EXISTS tmp_checkpoint_featured;

    CREATE TEMPORARY TABLE tmp_checkpoint_featured (
        post_id BIGINT UNSIGNED NOT NULL,
        wp_media_id BIGINT UNSIGNED NOT NULL,
        PRIMARY KEY (post_id, wp_media_id)
    );

    INSERT INTO tmp_checkpoint_featured (
        post_id,
        wp_media_id
    )
    SELECT
        jt.post_id,
        jt.wp_media_id
    FROM JSON_TABLE(
        p_candidatos,
        '$[*]' COLUMNS (
            post_id BIGINT PATH '$.post_id',
            wp_media_id BIGINT PATH '$.wp_media_id'
        )
    ) jt
    WHERE jt.post_id IS NOT NULL
      AND jt.wp_media_id IS NOT NULL
      AND jt.wp_media_id > 0;

    SELECT COUNT(*)
      INTO v_total
      FROM tmp_checkpoint_featured;

	SELECT COUNT(*)
	INTO v_resolvidos
	FROM tmp_checkpoint_featured c
	WHERE EXISTS (
		SELECT 1
		FROM WP_migracao_featured m
		WHERE m.post_id = c.post_id
		  AND m.status IN ('MIGRATED', 'SKIPPED')
		  AND (
				m.wp_media_id = c.wp_media_id
				OR
				m.wp_media_id_virtual = c.wp_media_id
			  )
	);

    START TRANSACTION;

    SELECT
        pagina_atual,
        ultimo_post_id
    INTO
        v_pagina_atual,
        v_ultimo_checkpoint
    FROM WP_migracao_checkpoint
    WHERE processo = 'FEATURED'
    FOR UPDATE;

    IF v_pagina_atual IS NULL THEN
        ROLLBACK;

        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Checkpoint FEATURED não encontrado';
    END IF;

    -- Já avançado anteriormente: idempotência
    IF v_pagina_atual > p_pagina_processada THEN

        COMMIT;

        SELECT
            'JA_AVANCADO' AS resultado,
            v_total AS total_candidatos,
            v_resolvidos AS total_resolvidos,
            v_pagina_atual AS pagina_atual,
            v_ultimo_checkpoint AS ultimo_post_id;

    -- Ainda existem migrations pendentes
    ELSEIF v_resolvidos <> v_total THEN

        COMMIT;

        SELECT
            'AGUARDANDO' AS resultado,
            v_total AS total_candidatos,
            v_resolvidos AS total_resolvidos,
            v_pagina_atual AS pagina_atual,
            v_ultimo_checkpoint AS ultimo_post_id;

    -- Página correta e todos resolvidos
    ELSEIF v_pagina_atual = p_pagina_processada THEN

        UPDATE WP_migracao_checkpoint
        SET
            pagina_atual = pagina_atual + 1,
            ultimo_post_id = p_ultimo_post_id,
            updated_at = CURRENT_TIMESTAMP
        WHERE processo = 'FEATURED';

        COMMIT;

        SELECT
            'AVANCADO' AS resultado,
            v_total AS total_candidatos,
            v_resolvidos AS total_resolvidos,
            pagina_atual,
            ultimo_post_id,
            updated_at
        FROM WP_migracao_checkpoint
        WHERE processo = 'FEATURED';

    ELSE

        ROLLBACK;

        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Página processada divergente do checkpoint';

    END IF;

    DROP TEMPORARY TABLE IF EXISTS tmp_checkpoint_featured;
END