-- Página 87: encerramento administrativo SEM verificação/exclusão da origem.
-- Preparado em 2026-10-23; NÃO EXECUTADO neste ambiente.
-- Executar somente após conferir as saídas atuais de
-- pagina87-contexto-pendente.sql e confirmar os seis pares no banco.
-- A rotina NÃO avança o checkpoint. Depois da liberação, iniciar o PAI desde
-- o começo para que ele consulte a página atual do WordPress e tente fechá-la.
-- A auditoria/limpeza das mídias originais 7701, 7709 e 7717 permanece pendente.

DELIMITER $$

CREATE PROCEDURE SP_WP_excecao_p87_origem_nao_verificada()
BEGIN
    DECLARE v_pagina INT UNSIGNED DEFAULT NULL;
    DECLARE v_ultimo_post BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_ja_migradas INT DEFAULT 0;
    DECLARE v_pendentes_validas INT DEFAULT 0;
    DECLARE v_alteradas INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT pagina_atual, ultimo_post_id
      INTO v_pagina, v_ultimo_post
      FROM WP_migracao_checkpoint
     WHERE processo = 'FEATURED'
     FOR UPDATE;

    IF v_pagina IS NULL OR v_pagina <> 87
       OR v_ultimo_post IS NULL OR v_ultimo_post <> 7684 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Checkpoint FEATURED mudou; liberar pagina 87 cancelado';
    END IF;

    SELECT COUNT(*) INTO v_ja_migradas
      FROM WP_migracao_featured
     WHERE status = 'MIGRATED'
       AND (
           (id = 550 AND post_id = 7721 AND wp_media_id = 7728
                     AND wp_media_id_virtual = 90000
                     AND storage_provider = 'cloudflare_r2'
                     AND updated_at = '2026-10-23 05:10:49')
        OR (id = 551 AND post_id = 7729 AND wp_media_id = 7735
                     AND wp_media_id_virtual = 90001
                     AND storage_provider = 'backblaze_b2'
                     AND updated_at = '2026-10-23 05:10:49')
        OR (id = 552 AND post_id = 7740 AND wp_media_id = 7746
                     AND wp_media_id_virtual = 90002
                     AND storage_provider = 'cloudflare_r2'
                     AND updated_at = '2026-10-23 05:10:49')
       );

    IF v_ja_migradas <> 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migrations 550-552 divergentes; liberacao cancelada';
    END IF;

    SELECT COUNT(*) INTO v_pendentes_validas
      FROM WP_migracao_featured
     WHERE status = 'PROCESSING'
       AND storage_provider IN ('cloudinary', 'cloudflare_r2', 'backblaze_b2')
       AND storage_url LIKE 'https://%'
       AND (
           (id = 547 AND post_id = 7697 AND wp_media_id = 7701
                     AND wp_media_id_virtual = 89997
                     AND storage_provider = 'cloudinary'
                     AND updated_at = '2026-10-23 04:01:55')
        OR (id = 548 AND post_id = 7691 AND wp_media_id = 7709
                     AND wp_media_id_virtual = 89998
                     AND storage_provider = 'cloudflare_r2'
                     AND updated_at = '2026-10-23 04:03:17')
        OR (id = 549 AND post_id = 7714 AND wp_media_id = 7717
                     AND wp_media_id_virtual = 89999
                     AND storage_provider = 'cloudinary'
                     AND updated_at = '2026-10-23 04:04:34')
       );

    IF v_pendentes_validas <> 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migrations 547-549 divergentes; liberacao cancelada';
    END IF;

    UPDATE WP_migracao_featured
       SET status = 'SKIPPED',
           error_message = LEFT(CONCAT(
               'EXCECAO_P87_ORIGEM_NAO_VERIFICADA; auditoria posterior pendente; ',
               COALESCE(error_message, '')
           ), 1000),
           updated_at = CURRENT_TIMESTAMP
     WHERE status = 'PROCESSING'
       AND storage_url LIKE 'https://%'
       AND (
           (id = 547 AND post_id = 7697 AND wp_media_id = 7701
                     AND wp_media_id_virtual = 89997
                     AND storage_provider = 'cloudinary'
                     AND updated_at = '2026-10-23 04:01:55')
        OR (id = 548 AND post_id = 7691 AND wp_media_id = 7709
                     AND wp_media_id_virtual = 89998
                     AND storage_provider = 'cloudflare_r2'
                     AND updated_at = '2026-10-23 04:03:17')
        OR (id = 549 AND post_id = 7714 AND wp_media_id = 7717
                     AND wp_media_id_virtual = 89999
                     AND storage_provider = 'cloudinary'
                     AND updated_at = '2026-10-23 04:04:34')
       );

    SET v_alteradas = ROW_COUNT();
    IF v_alteradas <> 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quantidade alterada divergente; liberacao revertida';
    END IF;

    COMMIT;

    SELECT id AS migration_id, post_id, wp_media_id AS wp_media_id_original,
           wp_media_id_virtual, status, error_message, updated_at
      FROM WP_migracao_featured
     WHERE id IN (547, 548, 549)
     ORDER BY id;
END$$

DELIMITER ;

CALL SP_WP_excecao_p87_origem_nao_verificada();
DROP PROCEDURE SP_WP_excecao_p87_origem_nao_verificada;
