-- Página 87: diagnóstico somente leitura antes de qualquer retomada.
-- Não altera migrations nem checkpoint. Executar no banco ativo e conferir
-- as duas saídas com os dados atuais do WordPress/n8n.

SELECT
    processo,
    pagina_atual,
    per_page,
    limite_execucao,
    ultimo_post_id,
    updated_at
FROM WP_migracao_checkpoint
WHERE processo = 'FEATURED';

WITH esperados AS (
    SELECT 547 AS migration_id, 7697 AS post_id,
           7701 AS wp_media_id_original, 89997 AS wp_media_id_virtual
    UNION ALL
    SELECT 548, 7691, 7709, 89998
    UNION ALL
    SELECT 549, 7714, 7717, 89999
)
SELECT
    e.migration_id,
    e.post_id,
    e.wp_media_id_original,
    e.wp_media_id_virtual,
    m.status,
    m.storage_provider,
    m.storage_url,
    m.updated_at,
    CASE
        WHEN m.id IS NULL THEN 'CONTEXTO_DIVERGENTE'
        WHEN m.status = 'MIGRATED' THEN 'JA_CONCLUIDA'
        WHEN m.status <> 'PROCESSING' THEN 'STATUS_DIVERGENTE'
        WHEN m.wp_media_id_virtual <> e.wp_media_id_virtual
          OR m.wp_media_id_virtual IS NULL THEN 'MIDIA_VIRTUAL_DIVERGENTE'
        WHEN m.storage_provider IS NULL OR m.storage_url IS NULL
          THEN 'STORAGE_INCOMPLETO'
        ELSE 'VALIDAR_ASSOCIACAO_E_AUDITORIA'
    END AS proxima_verificacao
FROM esperados AS e
LEFT JOIN WP_migracao_featured AS m
  ON m.id = e.migration_id
 AND m.post_id = e.post_id
 AND m.wp_media_id = e.wp_media_id_original
ORDER BY e.migration_id;
