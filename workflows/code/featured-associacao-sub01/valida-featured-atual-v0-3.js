// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Valida | Featured Atual v0.3
// Extraído do export n8n oficial.

const respostas = $input.all();
const associacoes = $('Recupera | Lote Associação v0.3').all();

const porPost = new Map(
  associacoes.map(item => [
    Number(item.json.post_id),
    item.json
  ])
);

return respostas.map(item => {
  const post =
    item.json?.body && typeof item.json.body === 'object'
      ? item.json.body
      : item.json;

  const postId = Number(post.id);
  const origem = porPost.get(postId);

  if (!origem || origem.associacao_wp_confirmada !== true) {
    throw new Error(
      `Post ${postId}: associação confirmada não encontrada.`
    );
  }

  const migrationId = Number(origem.migration_id);
  const originalId = Number(origem.wp_media_id_original);
  const virtualId = Number(origem.wp_media_id_virtual);
  const featuredAtual = Number(post.featured_media);

  if (
    !Number.isSafeInteger(migrationId) || migrationId <= 0 ||
    !Number.isSafeInteger(originalId) || originalId <= 0 ||
    !Number.isSafeInteger(virtualId) || virtualId <= 0 ||
    featuredAtual !== virtualId ||
    originalId === virtualId
  ) {
    throw new Error(
      `Migration ${migrationId}: featured_media do post ${postId} ` +
      `não corresponde à mídia virtual ${virtualId}.`
    );
  }

  const provider = String(origem.storage_provider ?? '').trim();
  const storageUrl = String(origem.storage_url ?? '').trim();

  if (
    !/^[a-z0-9_]{1,100}$/.test(provider) ||
    !/^https:\/\/[^/\s]+\/\S+$/.test(storageUrl)
  ) {
    throw new Error(
      `Migration ${migrationId}: storage canônico inválido.`
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
      post_status: post.status ?? null,
      associacao_wp_confirmada: true,
      associacao_validada: true
    }
  };
});
