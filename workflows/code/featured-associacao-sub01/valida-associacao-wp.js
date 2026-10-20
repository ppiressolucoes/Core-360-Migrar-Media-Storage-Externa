// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Valida | Associação WP
// Extraído do export n8n oficial.

const r = $json;

// ---------------------------------------------------------
// Contexto da iteração atual
// ---------------------------------------------------------

const origem = $('Loop').item.json;


// ---------------------------------------------------------
// Resposta do registro da mídia virtual
// ---------------------------------------------------------

const virtualResp =
  $('Registrar Mídia Virtual WP vs0.2').item.json;

const virtualBody =
  virtualResp?.body &&
  typeof virtualResp.body === 'object'
    ? virtualResp.body
    : virtualResp;


// ---------------------------------------------------------
// Identificadores principais
// ---------------------------------------------------------

const migrationId = Number(
  r.migration_id ??
  origem.migration_id
);

const postIdEsperado = Number(
  r.post_id ??
  origem.post_id
);

const mediaOriginal = Number(
  r.wp_media_id_original ??
  origem.wp_media_id_original
);


// ---------------------------------------------------------
// Attachment virtual esperado
// ---------------------------------------------------------

const attachmentIdEsperado = Number(
  r.wp_media_id_virtual ??
  r.external_attachment_id ??
  r.attachment_id ??
  virtualBody?.attachment_id
);


// ---------------------------------------------------------
// Valores retornados pelo /assign
// ---------------------------------------------------------

const postIdRecebido =
  Number(r.post_id);

const attachmentIdRecebido =
  Number(r.attachment_id);

const featuredMediaRecebido =
  Number(r.featured_media);


// ---------------------------------------------------------
// Validação estrutural
// ---------------------------------------------------------

if (!migrationId) {
  throw new Error(
    'migration_id inválido na validação da associação WP'
  );
}

if (!postIdEsperado) {
  throw new Error(
    `Migration ${migrationId}: post_id esperado inválido`
  );
}

if (!mediaOriginal) {
  throw new Error(
    `Migration ${migrationId}: wp_media_id_original inválido`
  );
}

if (!attachmentIdEsperado) {
  throw new Error(
    `Migration ${migrationId}: attachment virtual esperado não encontrado`
  );
}


// ---------------------------------------------------------
// Validação funcional
// ---------------------------------------------------------

const checks = {

  post_ok:
    postIdRecebido === postIdEsperado,

  attachment_ok:
    attachmentIdRecebido === attachmentIdEsperado,

  featured_ok:
    featuredMediaRecebido === attachmentIdEsperado

};

const valido =
  Object.values(checks)
    .every(v => v === true);


if (!valido) {

  throw new Error(
    `Falha associação WP | ` +
    `migration=${migrationId} | ` +
    `post esperado=${postIdEsperado} recebido=${postIdRecebido} | ` +
    `attachment esperado=${attachmentIdEsperado} recebido=${attachmentIdRecebido} | ` +
    `featured esperado=${attachmentIdEsperado} recebido=${featuredMediaRecebido}`
  );

}


// ---------------------------------------------------------
// URL CANÔNICA DA MIGRATION
//
// IMPORTANTE:
// secure_url do WordPress NÃO participa deste campo.
// ---------------------------------------------------------

const cloudinaryUrl =
  origem.cloudinary_url ??
  r.cloudinary_url ??
  null;

if (!cloudinaryUrl) {
  throw new Error(
    `Migration ${migrationId}: cloudinary_url canônica não encontrada`
  );
}


// ---------------------------------------------------------
// URL EFETIVAMENTE UTILIZADA PELO ATTACHMENT VIRTUAL
//
// Pode ser uma URL reutilizada de migration anterior.
// ---------------------------------------------------------

const mediaVirtualUrl =
  r.media_virtual_url ??
  r.secure_url ??
  virtualBody?.secure_url ??
  null;


// ---------------------------------------------------------
// Associação validada
// ---------------------------------------------------------

return [{
  json: {

    migration_id:
      migrationId,

    post_id:
      postIdEsperado,

    wp_media_id_original:
      mediaOriginal,

    wp_media_id_virtual:
      attachmentIdEsperado,

    featured_media:
      featuredMediaRecebido,

    cloudinary_url:
      cloudinaryUrl,

    media_virtual_url:
      mediaVirtualUrl,

    wp_associado:
      true,

    wp_validado:
      true,

    associacao_wp_confirmada:
      true,

    wp_meta_updated:
      r.native_attachment_meta_updated === true

  }
}];
