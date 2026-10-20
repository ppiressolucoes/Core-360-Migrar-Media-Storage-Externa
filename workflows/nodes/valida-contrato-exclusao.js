return $input.all().map(item => {
  const x = item.json;
  const migrationId = Number(x.migration_id);
  const postId = Number(x.post_id);
  const originalId = Number(x.wp_media_id_original);
  const virtualId = Number(x.wp_media_id_virtual);
  if ([migrationId, postId, originalId, virtualId].some(id => !Number.isSafeInteger(id) || id <= 0) ||
      originalId === virtualId) {
    throw new Error(`Migration ${x.migration_id}: IDs inválidos para exclusão.`);
  }
  if (x.associacao_wp_confirmada !== true || x.associacao_validada !== true ||
      x.exclusao_liberada !== true) {
    throw new Error(`Migration ${migrationId}: associação ou exclusão não confirmada.`);
  }
  const provider = String(x.storage_provider ?? '').trim();
  const url = String(x.storage_url ?? '').trim();
  if (!/^[a-z0-9_]{1,100}$/.test(provider) ||
      !/^https:\/\/[^/\s]+\/\S+$/.test(url)) {
    throw new Error(`Migration ${migrationId}: storage canônico inválido.`);
  }
  return {json: {
    ...x,
    migration_id: migrationId,
    post_id: postId,
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: url
  }, binary: item.binary};
});
