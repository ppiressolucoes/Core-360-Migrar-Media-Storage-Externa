CREATE PROCEDURE `SP_WP_avanca_checkpoint_featured`(
    IN p_pagina_processada INT UNSIGNED,
    IN p_ultimo_post_id BIGINT UNSIGNED
)
BEGIN
    DECLARE v_pagina_atual INT UNSIGNED;
    DECLARE v_ultimo_post_id BIGINT UNSIGNED;

    START TRANSACTION;

    SELECT
        pagina_atual,
        ultimo_post_id
    INTO
        v_pagina_atual,
        v_ultimo_post_id
    FROM WP_migracao_checkpoint
    WHERE processo = 'FEATURED'
    FOR UPDATE;

    IF v_pagina_atual IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Checkpoint FEATURED não encontrado';
    END IF;

    /*
      A página que terminou precisa ser exatamente
      a página atualmente registrada.
    */
    IF v_pagina_atual <> p_pagina_processada THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Página processada divergente do checkpoint';
    END IF;

    /*
      O ponteiro de post nunca pode retroceder.
    */
    IF p_ultimo_post_id <= v_ultimo_post_id THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'ultimo_post_id não pode retroceder ou repetir';
    END IF;

    UPDATE WP_migracao_checkpoint
    SET
        pagina_atual   = pagina_atual + 1,
        ultimo_post_id = p_ultimo_post_id,
        updated_at     = CURRENT_TIMESTAMP
    WHERE processo = 'FEATURED';

    COMMIT;

    SELECT
        processo,
        pagina_atual,
        per_page,
        ultimo_post_id,
        updated_at
    FROM WP_migracao_checkpoint
    WHERE processo = 'FEATURED';
END