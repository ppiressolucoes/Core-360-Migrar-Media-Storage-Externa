const resposta = $json;
const origem = $('Loop1').item.json;
const midiaVirtual = $('Normaliza | Mídia Virtual Criada').item.json;

const migrationId = Number(origem.migration_id);
const postIdEsperado = Number(origem.post_id);
const mediaOriginal = Number(origem.wp_media_id_original);
const attachmentIdEsperado = Number(midiaVirtual.wp_media_id_virtual);
const status = Number(
  resposta.http_status_retry ?? resposta.http_status ?? resposta.statusCode ?? 0
);

// Os campos response_* vêm do body real de /assign. O classificador também
// preserva o contexto esperado, mas ele não pode servir como prova de retorno.
const postIdRecebido = Number(resposta.response_post_id);
const attachmentIdRecebido = Number(resposta.response_attachment_id);
const featuredMediaRecebido = Number(resposta.response_featured_media);

if (!migrationId || !postIdEsperado || !mediaOriginal || !attachmentIdEsperado) {
  throw new Error(`Migration ${migrationId || 'desconhecida'}: contexto WP incompleto`);
}
if (status < 200 || status >= 300 ||
    postIdRecebido !== postIdEsperado ||
    attachmentIdRecebido !== attachmentIdEsperado ||
    featuredMediaRecebido !== attachmentIdEsperado) {
  throw new Error(
    `Migration ${migrationId}: /assign divergente | HTTP ${status} | ` +
    `post ${postIdRecebido}/${postIdEsperado} | ` +
    `attachment ${attachmentIdRecebido}/${attachmentIdEsperado} | ` +
    `featured ${featuredMediaRecebido}/${attachmentIdEsperado}`
  );
}

const storageUrl = String(origem.storage_url || '');
if (!storageUrl.startsWith('https://')) {
  throw new Error(`Migration ${migrationId}: storage_url canônica ausente`);
}

return [{json: {
  migration_id: migrationId,
  post_id: postIdEsperado,
  wp_media_id_original: mediaOriginal,
  wp_media_id_virtual: attachmentIdEsperado,
  featured_media: featuredMediaRecebido,
  storage_url: storageUrl,
  storage_provider: origem.storage_provider,
  media_virtual_url: midiaVirtual.media_virtual_url ?? null,
  associacao_wp_confirmada: true,
  wp_associado: true,
  wp_validado: true,
  wp_meta_updated: resposta.native_attachment_meta_updated === true
}}];
