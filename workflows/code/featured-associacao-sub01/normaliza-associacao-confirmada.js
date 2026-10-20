// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Normaliza | Associação Confirmada
// Extraído do export n8n oficial.

const itens = $input.all();

return itens.map(item => {

  const x = item.json;

  const migrationId =
    Number(x.migration_id);

  const postId =
    Number(x.post_id);

  const originalId =
    Number(
      x.wp_media_id_original ?? 0
    );

  const virtualId =
    Number(
      x.wp_media_id_virtual ??
      x.attachment_id ??
      x.external_attachment_id ??
      0
    );


  // -------------------------------------------------------
  // URL CANÔNICA
  // Já deve vir preservada do Valida | Associação WP
  // -------------------------------------------------------

  const cloudinaryUrl =
    x.cloudinary_url ??
    null;


  // -------------------------------------------------------
  // URL DO ATTACHMENT VIRTUAL
  // -------------------------------------------------------

  const mediaVirtualUrl =
    x.media_virtual_url ??
    x.secure_url ??
    null;


  // -------------------------------------------------------
  // Validação estrutural
  // -------------------------------------------------------

  if (
    !migrationId ||
    !postId ||
    !originalId ||
    !virtualId
  ) {

    throw new Error(
      `Contexto inválido para associação confirmada. ` +
      `migration=${x.migration_id}, ` +
      `post=${x.post_id}, ` +
      `original=${x.wp_media_id_original}, ` +
      `virtual=${virtualId}`
    );

  }


  if (!cloudinaryUrl) {

    throw new Error(
      `Migration ${migrationId}: ` +
      `cloudinary_url canônica não encontrada`
    );

  }


  return {
    json: {

      ...x,

      migration_id:
        migrationId,

      post_id:
        postId,

      wp_media_id_original:
        originalId,

      wp_media_id_virtual:
        virtualId,

      cloudinary_url:
        cloudinaryUrl,

      media_virtual_url:
        mediaVirtualUrl,

      associacao_wp_confirmada:
        true

    }
  };

});
