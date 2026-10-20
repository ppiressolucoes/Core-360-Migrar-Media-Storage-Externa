// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Monta | Lote Conclusão
// Extraído do export n8n oficial.

const itens = $input.all();

if (itens.length === 0) {
  throw new Error('Nenhum item recebido para conclusão.');
}

const lote = itens.map(item => {
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
    !/^https:\/\/[^/\s]+\/\S+$/.test(storageUrl)
  ) {
    throw new Error(
      `Migration ${migrationId}: lote de conclusão incompleto.`
    );
  }

  return {
    migration_id: migrationId,
    post_id: postId,
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: storageUrl
  };
});

return [{
  json: {
    total: lote.length,
    lote
  }
}];
