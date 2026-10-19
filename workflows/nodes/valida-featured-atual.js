const posts = $input.all();
const lote = $('Recupera | Lote Associação').all();

// Mapa do lote pelo post_id
const mapaLote = new Map(
  lote.map(item => [
    Number(item.json.post_id),
    item.json
  ])
);

return posts.map(item => {
  const post = item.json;

  const origem = mapaLote.get(Number(post.id));

  if (!origem) {
    throw new Error(
      `Post ${post.id}: contexto da migração não encontrado`
    );
  }

  const featuredAtual = Number(post.featured_media);

  if (!featuredAtual) {
    throw new Error(
      `Post ${post.id}: featured_media não definido`
    );
  }

  const virtualEsperado = Number(origem.wp_media_id_virtual);
  if (!virtualEsperado || featuredAtual !== virtualEsperado) {
    throw new Error(
      `Post ${post.id}: featured_media ${featuredAtual} difere da mídia virtual ` +
      `${virtualEsperado || 'ausente'} da migration ${origem.migration_id}`
    );
  }

  return {
    json: {
      migration_id: Number(origem.migration_id),
      post_id: Number(origem.post_id),

      wp_media_id_original: Number(origem.wp_media_id_original),

      wp_media_id_virtual: featuredAtual,

      storage_url: origem.storage_url,
      storage_provider: origem.storage_provider,

      post_status: post.status,

      associacao_validada: true
    }
  };
});
