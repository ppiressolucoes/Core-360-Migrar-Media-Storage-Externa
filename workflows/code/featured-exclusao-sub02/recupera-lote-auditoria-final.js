// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Recupera | Lote Auditoria Final
// Extraído do export n8n oficial.

const itens = $('Valida | Contrato Exclusão').all();

if (itens.length === 0) {
  throw new Error('Nenhum item encontrado para auditoria final.');
}

return itens.map(item => {
  const x = item.json;

  const migrationId = Number(x.migration_id);
  const postId = Number(x.post_id);
  const originalId = Number(x.wp_media_id_original);
  const virtualId = Number(x.wp_media_id_virtual);
  const provider = String(x.storage_provider ?? '').trim();
  const storageUrl = String(x.storage_url ?? '').trim();

  if (
    !Number.isSafeInteger(migrationId) || migrationId <= 0 ||
    !Number.isSafeInteger(postId) || postId <= 0 ||
    !Number.isSafeInteger(originalId) || originalId <= 0 ||
    !Number.isSafeInteger(virtualId) || virtualId <= 0 ||
    !/^[a-z0-9_]{1,100}$/.test(provider) ||
    !/^https:\/\/[^/\s]+\/\S+$/.test(storageUrl) ||
    x.associacao_wp_confirmada !== true ||
    x.exclusao_liberada !== true
  ) {
    throw new Error(
      `Migration ${migrationId}: contexto incompleto para auditoria final.`
    );
  }

  return {
    json: {
      migration_id: migrationId,
      post_id: postId,
      wp_media_id_original: originalId,
      wp_media_id_virtual: virtualId,
      storage_provider: provider,
      storage_url: storageUrl,
      media_virtual_url: x.media_virtual_url ?? null,
      associacao_wp_confirmada: true,
      exclusao_liberada: true
    }
  };
});
