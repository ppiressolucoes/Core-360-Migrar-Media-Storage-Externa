// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Classifica | Resposta Associação WP
// Extraído do export n8n oficial.

const itens = $input.all();

// O Loop trabalha com 1 mídia por vez.
// Recupera o payload usado antes do POST de associação.
const ctx = $('Wait 60').item.json;

return itens.map(item => {
  const resp = item.json;

  const statusCode = Number(
    resp.statusCode ?? 0
  );

  const body = resp.body ?? {};

  const originStatus = Number(
    body?.origin_status ??
    statusCode ??
    0
  );

  // ---------------------------------------------------------
  // Texto consolidado para identificar respostas de erro
  // ---------------------------------------------------------

  const textoErro = [
    typeof body === 'string'
      ? body
      : '',

    body?.origin_body ?? '',
    body?.message ?? '',
    body?.error ?? ''
  ]
    .filter(Boolean)
    .join(' ');

  // ---------------------------------------------------------
  // Classificação da resposta
  // ---------------------------------------------------------

  let resultado = 'ERRO_REAL';

  // Sucesso HTTP
  if (
    statusCode >= 200 &&
    statusCode < 300
  ) {
    resultado = 'SUCESSO';
  }

  // WAF / proteção Hostinger
  else if (
    statusCode === 403 &&
    (
      originStatus === 403 ||
      textoErro.includes('Checking your browser') ||
      textoErro.includes('Just a moment')
    )
  ) {
    resultado = 'WAF_403';
  }

  // Rate limit
  else if (
    statusCode === 429 ||
    originStatus === 429
  ) {
    resultado = 'RATE_LIMIT_429';
  }

  // ---------------------------------------------------------
  // Normaliza body quando for objeto
  // ---------------------------------------------------------

  const bodyNormalizado =
    body &&
    typeof body === 'object' &&
    !Array.isArray(body)
      ? body
      : {};

  // ---------------------------------------------------------
  // Saída
  // ---------------------------------------------------------

  return {
    json: {
      // Preserva TODO o contexto original da migration.
      // Isso será fundamental para recuperação e retry.
      ...ctx,

      // Preserva também a resposta original do endpoint.
      ...bodyNormalizado,

      // -----------------------------------------------------
      // Identificadores normalizados
      // -----------------------------------------------------

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
        ctx.external_attachment_id ??
        ctx.wp_media_id_virtual ??
        bodyNormalizado.attachment_id ??
        bodyNormalizado.wp_media_id_virtual
      ),

      cloudinary_url:
        ctx.cloudinary_url ??
        bodyNormalizado.secure_url ??
        null,

      // -----------------------------------------------------
      // Controle técnico
      // -----------------------------------------------------

      resultado_associacao: resultado,

      http_status:
        statusCode,

      origin_status:
        originStatus || null,

      erro_resumo:
        textoErro || null,

      // -----------------------------------------------------
      // Auditoria
      // -----------------------------------------------------

      response_headers:
        resp.headers ?? {}
    }
  };
});
