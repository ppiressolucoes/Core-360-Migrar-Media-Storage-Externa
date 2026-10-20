const posts = $input.all();
const lote = $('Recupera | Lote Associação').all();
const porPost = new Map();

for (const item of lote) {
  const origem = item.json;
  const postId = Number(origem.post_id);
  if (!Number.isSafeInteger(postId) || postId <= 0 || porPost.has(postId)) {
    throw new Error(`Post ${origem.post_id}: contexto duplicado ou inválido.`);
  }
  porPost.set(postId, origem);
}

return posts.map(item => {
  const post = item.json?.body ?? item.json;
  const origem = porPost.get(Number(post.id));
  if (!origem) throw new Error(`Post ${post.id}: contexto da migração não encontrado.`);

  const migrationId = Number(origem.migration_id);
  const originalId = Number(origem.wp_media_id_original);
  const virtualId = Number(origem.wp_media_id_virtual);
  const featuredAtual = Number(post.featured_media);
  if ([migrationId, originalId, virtualId].some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error(`Post ${post.id}: IDs da migração inválidos.`);
  }
  if (origem.associacao_wp_confirmada !== true) {
    throw new Error(`Migration ${migrationId}: associação WP não confirmada.`);
  }
  if (featuredAtual !== virtualId) {
    throw new Error(`Post ${post.id}: featured_media ${featuredAtual} difere da mídia virtual ${virtualId} da migration ${migrationId}.`);
  }

  const provider = String(origem.storage_provider ?? '').trim();
  const storageUrl = String(origem.storage_url ?? '').trim();
  if (!/^[a-z0-9_]{1,100}$/.test(provider) ||
      !/^https:\/\/[^/\s]+\/\S+$/.test(storageUrl)) {
    throw new Error(`Migration ${migrationId}: storage canônico inválido.`);
  }

  return {json: {
    migration_id: migrationId,
    post_id: Number(post.id),
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: storageUrl,
    post_status: post.status,
    associacao_wp_confirmada: true,
    associacao_validada: true
  }};
});
