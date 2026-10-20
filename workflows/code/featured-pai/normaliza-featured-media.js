// Workflow: PEL | Migração Featured IMG | PAI
// Node: Normaliza | Featured Media
// Extraído do export n8n oficial.

const medias = $input.all();

// IMPORTANTE:
// coloque abaixo o nome EXATO do node anterior
// que contém migration_id + post_id + wp_media_id
const posts = $('Recupera | Contexto Post').all();

if (medias.length !== posts.length) {
  throw new Error(
    `Quantidade divergente: ${medias.length} mídias e ${posts.length} posts`
  );
}

return medias.map((item, index) => {

  const media = item.json;
  const post = posts[index].json;

  // Proteção adicional contra associação incorreta
  if (Number(media.id) !== Number(post.wp_media_id)) {
    throw new Error(
      `Mídia incompatível: esperado ${post.wp_media_id}, recebido ${media.id}`
    );
  }

  return {
    json: {
      // CONTROLE
      migration_id: post.migration_id,
      ordem: post.ordem,
      status_migracao: post.status_migracao,

      // POST
      post_id: post.post_id,
      post_date: post.post_date,
      post_modified: post.post_modified,
      post_slug: post.post_slug,
      post_link: post.post_link,

      // FEATURED MEDIA
      wp_media_id: media.id,
      media_date: media.date,
      media_slug: media.slug,
      mime_type: media.mime_type,

      // ARQUIVO ORIGINAL
      original_url: media.source_url,
      original_file: media.media_details?.file ?? null,
      original_width: media.media_details?.width ?? null,
      original_height: media.media_details?.height ?? null,
      original_filesize: media.media_details?.filesize ?? null
    }
  };
});
