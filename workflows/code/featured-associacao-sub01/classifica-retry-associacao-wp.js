// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Classifica | Retry Associação WP
// Extraído do export n8n oficial.

const itens = $input.all();

// Contexto que chegou ao Retry
const ctx = $('Roteia | Pós-Erro Associação').item.json;

return itens.map(item => {
  const resp = item.json;

  const statusCode = Number(resp.statusCode ?? 0);
  const body = resp.body ?? {};

  const originStatus = Number(
    body?.origin_status ??
    statusCode ??
    0
  );

  const textoErro = [
    typeof body === 'string' ? body : '',
    body?.origin_body ?? '',
    body?.message ?? '',
    body?.error ?? ''
  ]
    .filter(Boolean)
    .join(' ');

  const bodyNormalizado =
    body &&
    typeof body === 'object' &&
    !Array.isArray(body)
      ? body
      : {};

  const sucesso =
    statusCode >= 200 &&
    statusCode < 300;

  return {
    json: {
      // Mantém contexto da migration
      ...ctx,

      // Mantém a resposta funcional do POST
      ...bodyNormalizado,

      migration_id: Number(
        ctx.migration_id ??
        bodyNormalizado.migration_id
      ),

      post_id: Number(
        ctx.post_id ??
        bodyNormalizado.post_id
      ),

      wp_media_id_original: Number(
        ctx.wp_media_id_original ??
        bodyNormalizado.wp_media_id_original
      ),

      wp_media_id_virtual: Number(
        ctx.wp_media_id_virtual ??
        bodyNormalizado.attachment_id ??
        bodyNormalizado.wp_media_id_virtual
      ),

      cloudinary_url:
        ctx.cloudinary_url ??
        bodyNormalizado.secure_url ??
        null,

      resultado_retry:
        sucesso
          ? 'SUCESSO_FINAL'
          : 'FALHA_FINAL',

      http_status_retry: statusCode,

      origin_status_retry:
        originStatus || null,

      erro_retry:
        textoErro || null,

      response_headers_retry:
        resp.headers ?? {}
    }
  };
});
