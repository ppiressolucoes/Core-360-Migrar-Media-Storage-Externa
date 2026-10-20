// Workflow: PEL | Migração Featured IMG | PAI
// Node: Recupera | Contexto Post
// Extraído do export n8n oficial.

const reservados = $input.all();
const posts = $('Busca Posts').all();

// Índice dos posts originalmente retornados pelo WordPress
const postsMap = new Map(
  posts.map(item => [
    Number(item.json.id),
    item.json
  ])
);

return reservados.map(item => {

  const reserva = item.json;
  const post = postsMap.get(Number(reserva.post_id));

  if (!post) {
    throw new Error(
      `Post ${reserva.post_id} não encontrado no resultado de Busca Posts`
    );
  }

  return {
    json: {
      // CONTROLE DA MIGRAÇÃO
      migration_id: reserva.migration_id,
      ordem: reserva.ordem,
      status_migracao: reserva.status,

      // POST WORDPRESS
      post_id: reserva.post_id,
      wp_media_id: reserva.wp_media_id,

      post_date: post.date,
      post_modified: post.modified,
      post_slug: post.slug,
      post_link: post.link
    }
  };
});
