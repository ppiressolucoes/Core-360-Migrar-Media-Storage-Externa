-- Historico da excecao administrativa da pagina 98, aplicada em 2026-10-27.
-- Executada separadamente: CREATE PROCEDURE, CALL, DROP PROCEDURE.
-- A procedure foi removida depois do CALL; nao reinstalar para o fluxo normal.
-- As originais 8829, 8840 e 8858 nao foram verificadas nem excluidas.

DELIMITER $$

CREATE PROCEDURE SP_WP_excecao_p98_origem_nao_verificada()
BEGIN
    DECLARE v_pagina INT UNSIGNED DEFAULT NULL;
    DECLARE v_per_page INT UNSIGNED DEFAULT NULL;
    DECLARE v_limite INT UNSIGNED DEFAULT NULL;
    DECLARE v_ultimo_post BIGINT UNSIGNED DEFAULT NULL;
    DECLARE v_total INT DEFAULT 0;
    DECLARE v_migradas INT DEFAULT 0;
    DECLARE v_pendentes INT DEFAULT 0;
    DECLARE v_alteradas INT DEFAULT 0;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    SELECT pagina_atual, per_page, limite_execucao, ultimo_post_id
      INTO v_pagina, v_per_page, v_limite, v_ultimo_post
      FROM WP_migracao_checkpoint
     WHERE processo = 'FEATURED'
     FOR UPDATE;

    IF v_pagina IS NULL OR v_pagina <> 98
       OR v_per_page <> 6 OR v_limite <> 3
       OR v_ultimo_post IS NULL OR v_ultimo_post <> 8782 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Checkpoint FEATURED divergente; pagina 98 nao liberada';
    END IF;

    SELECT COUNT(*) INTO v_total
      FROM WP_migracao_featured
     WHERE post_id IN (8827, 8834, 8846, 8860, 8874, 8889);

    IF v_total <> 6 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Quantidade de registros da pagina 98 divergente';
    END IF;

    SELECT COUNT(*) INTO v_migradas
      FROM WP_migracao_featured
     WHERE status = 'MIGRATED'
       AND (
           (id = 616 AND post_id = 8860 AND wp_media_id = 8869
                     AND wp_media_id_virtual = 90402
                     AND storage_provider = 'cloudinary'
                     AND updated_at = '2026-10-27 04:08:54')
        OR (id = 617 AND post_id = 8874 AND wp_media_id = 8878
                     AND wp_media_id_virtual = 90403
                     AND storage_provider = 'cloudinary'
                     AND updated_at = '2026-10-27 04:08:54')
        OR (id = 618 AND post_id = 8889 AND wp_media_id = 8895
                     AND wp_media_id_virtual = 90404
                     AND storage_provider = 'cloudinary'
                     AND updated_at = '2026-10-27 04:08:54')
       );

    IF v_migradas <> 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migrations 616-618 divergentes; liberacao cancelada';
    END IF;

    SELECT COUNT(*) INTO v_pendentes
      FROM WP_migracao_featured
     WHERE status = 'PROCESSING'
       AND error_message IS NULL
       AND (
           (id = 613 AND post_id = 8827 AND wp_media_id = 8829
                     AND wp_media_id_virtual = 90399
                     AND storage_provider = 'cloudflare_r2'
                     AND BINARY storage_url = BINARY 'https://pub-b3e02429eadd4d94bdaa5e5771117101.r2.dev/pel/featured/2c9702c7eac9a1c9c1bca4728d3c4ca025d4233077547ad879763142d7c61819.jpg'
                     AND updated_at = '2026-10-27 03:01:11')
        OR (id = 614 AND post_id = 8834 AND wp_media_id = 8840
                     AND wp_media_id_virtual = 90400
                     AND storage_provider = 'cloudinary'
                     AND BINARY storage_url = BINARY 'https://res.cloudinary.com/dn1a6v0cl/image/upload/v1793070016/pel/featured/ff96612faa6d31088780fa9ba7bd818a82b317a177c43996740c7f33d1107504.jpg'
                     AND updated_at = '2026-10-27 03:02:13')
        OR (id = 615 AND post_id = 8846 AND wp_media_id = 8858
                     AND wp_media_id_virtual = 90401
                     AND storage_provider = 'cloudflare_r2'
                     AND BINARY storage_url = BINARY 'https://pub-0af080727f5a476e95e690f072129957.r2.dev/pel/featured/880294c927caa67df51ba20c19c3e25f4dc67f20a1244ae4877c4d309d96a53b.jpg'
                     AND updated_at = '2026-10-27 03:03:14')
       );

    IF v_pendentes <> 3 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Migrations 613-615 divergentes; liberacao cancelada';
    END IF;

    UPDATE WP_migracao_featured
       SET status = 'SKIPPED',
           error_message = 'EXCECAO_P98_ORIGEM_NAO_VERIFICADA; auditoria posterior pendente;',
           updated_at = CURRENT_TIMESTAMP
     WHERE id IN (613, 614, 615)
       AND status = 'PROCESSING'
       AND error_message IS NULL
       AND (
           (id = 613 AND post_id = 8827 AND wp_media_id = 8829
                     AND wp_media_id_virtual = 90399
                     AND storage_provider = 'cloudflare_r2'
                     AND BINARY storage_url = BINARY 'https://pub-b3e02429eadd4d94bdaa5e5771117101.r2.dev/pel/featured/2c9702c7eac9a1c9c1bca4728d3c4ca025d4233077547ad879763142d7c61819.jpg'
                     AND updated_at = '2026-10-27 03:01:11')
        OR (id = 614 AND post_id = 8834 AND wp_media_id = 8840
                     AND wp_media_id_virtual = 90400
                     AND storage_provider = 'cloudinary'
                     AND BINARY storage_url = BINARY 'https://res.cloudinary.com/dn1a6v0cl/image/upload/v1793070016/pel/featured/ff96612faa6d31088780fa9ba7bd818a82b317a177c43996740c7f33d1107504.jpg'
                     AND updated_at = '2026-10-27 03:02:13')
        OR (id = 615 AND post_id = 8846 AND wp_media_id = 8858
                     AND wp_media_id_virtual = 90401
                     AND storage_provider = 'cloudflare_r2'
                     AND BINARY storage_url = BINARY 'https://pub-0af080727f5a476e95e690f072129957.r2.dev/pel/featured/880294c927caa67df51ba20c19c3e25f4dc67f20a1244ae4877c4d309d96a53b.jpg'
                     AND updated_at = '2026-10-27 03:03:14')
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
     WHERE id IN (613, 614, 615)
     ORDER BY id;
END$$

DELIMITER ;
