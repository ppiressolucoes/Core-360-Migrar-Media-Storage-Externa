const lote = $('Valida | Contrato Exclusão').all();
if (lote.length === 0) throw new Error('Nenhum item encontrado para auditoria final.');

const vistos = new Set();
return lote.map(item => {
  const x = item.json;
  const migrationId = Number(x.migration_id);
  const postId = Number(x.post_id);
  const originalId = Number(x.wp_media_id_original);
  const virtualId = Number(x.wp_media_id_virtual);
  const provider = String(x.storage_provider ?? '').trim();
  const url = String(x.storage_url ?? '').trim();
  if ([migrationId, postId, originalId, virtualId].some(id => !Number.isSafeInteger(id) || id <= 0) ||
      originalId === virtualId || vistos.has(migrationId) ||
      !/^[a-z0-9_]{1,100}$/.test(provider) ||
      !/^https:\/\/[^/\s]+\/\S+$/.test(url) ||
      x.associacao_wp_confirmada !== true || x.exclusao_liberada !== true) {
    throw new Error(`Migration ${x.migration_id}: contexto inválido para auditoria final.`);
  }
  vistos.add(migrationId);
  return {json: {
    migration_id: migrationId,
    post_id: postId,
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: url,
    media_virtual_url: x.media_virtual_url ?? null,
    associacao_wp_confirmada: true,
    exclusao_liberada: true
  }};
});
