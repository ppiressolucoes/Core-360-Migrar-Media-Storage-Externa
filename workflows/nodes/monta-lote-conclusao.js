const itens = $input.all();
if (itens.length === 0) throw new Error('Nenhum item recebido para conclusão.');

const vistos = new Set();
const lote = itens.map(item => {
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
      x.associacao_wp_confirmada !== true ||
      x.exclusao_liberada !== true ||
      x.auditoria_confirmada !== true) {
    throw new Error(`Migration ${x.migration_id}: contexto inválido para conclusão.`);
  }
  vistos.add(migrationId);
  return {
    migration_id: migrationId,
    post_id: postId,
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: url
  };
});

return [{json: {total: lote.length, lote}}];
