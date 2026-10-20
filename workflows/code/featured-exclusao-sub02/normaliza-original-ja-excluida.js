// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Normaliza | Original Já Excluída
// Extraído do export n8n oficial.

const itens = $input.all();

return itens.map(item => {
  const ctx = item.json;

  if (
    ctx.precisa_excluir_original !== false ||
    ctx.original_ja_excluida !== true ||
    Number(ctx.original_http_status) !== 404
  ) {
    throw new Error(
      `Migration ${ctx.migration_id}: item não possui evidência válida ` +
      `de exclusão anterior da mídia ${ctx.wp_media_id_original}`
    );
  }

  return {
    json: {
      migration_id: Number(ctx.migration_id),
      post_id: Number(ctx.post_id),

      wp_media_id_original: Number(ctx.wp_media_id_original),
      wp_media_id_virtual: Number(ctx.wp_media_id_virtual),

      cloudinary_url: ctx.cloudinary_url,

      exclusao_original_confirmada: true,
      wp_original_http_status: 404,

      status_final: 'MIGRATED'
    }
  };
});
