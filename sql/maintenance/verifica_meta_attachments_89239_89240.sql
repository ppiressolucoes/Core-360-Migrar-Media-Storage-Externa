-- Somente leitura no banco WordPress u164126954_bNEJI.
-- Compara os metadados dos attachments 89239 (migration 469) e 89240 (470).
SELECT p.ID AS attachment_id, p.post_type, p.post_status, p.guid,
       m.meta_key, m.meta_value
FROM u164126954_bNEJI.wp_posts AS p
LEFT JOIN u164126954_bNEJI.wp_postmeta AS m ON m.post_id = p.ID
WHERE p.ID IN (89239, 89240)
  AND (LEFT(m.meta_key, LENGTH('_m360_external_')) = '_m360_external_'
       OR m.meta_key = '_wp_attachment_image_alt')
ORDER BY p.ID, m.meta_key, m.meta_id;
