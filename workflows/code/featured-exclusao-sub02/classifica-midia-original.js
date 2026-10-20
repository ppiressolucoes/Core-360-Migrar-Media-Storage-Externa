// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Classifica | Mídia Original
// Extraído do export n8n oficial.

const respostas = $input.all();
const contextos = $('Valida | Contrato Exclusão').all();

// Indexa pelo ID da mídia original
const mapa = new Map(
  contextos.map(item => [
    Number(item.json.wp_media_id_original),
    item.json
  ])
);

function getOriginBody(r) {
  const raw = r.body?.origin_body;

  if (typeof raw !== 'string') {
    return {};
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

return respostas.map((item, index) => {

  const r = item.json;

  const body =
    r.body &&
    typeof r.body === 'object'
      ? r.body
      : r;

  const httpStatus = Number(
    body.origin_status ??
    r.statusCode ??
    0
  );

  const originBody = getOriginBody(r);

  // -------------------------------------------------------
  // Identifica qual wp_media_id_original esta resposta
  // pertence.
  //
  // 200 → WordPress retorna media.id
  // erro → proxy retorna target .../media/XXXX
  // fallback → mesma posição do contexto
  // -------------------------------------------------------

  let originalId =
    Number(body.id ?? 0);

  if (!originalId) {
    const target = String(
      body.target ??
      r.body?.target ??
      ''
    );

    const match =
      target.match(/\/media\/(\d+)/);

    if (match) {
      originalId = Number(match[1]);
    }
  }

  let ctx =
    mapa.get(originalId);

  // Fallback seguro para resposta HTTP que não carregue ID
  if (!ctx && contextos[index]) {
    ctx = contextos[index].json;
    originalId =
      Number(ctx.wp_media_id_original);
  }

  if (!ctx) {
    throw new Error(
      `Contexto não encontrado na classificação da mídia original`
    );
  }

  const migrationId =
    Number(ctx.migration_id);

  // -------------------------------------------------------
  // ORIGINAL EXISTE
  // -------------------------------------------------------

  if (httpStatus === 200) {

    if (
      Number(body.id) !==
      Number(ctx.wp_media_id_original)
    ) {
      throw new Error(
        `Migration ${migrationId}: ` +
        `ID da mídia original divergente`
      );
    }

    return {
      json: {
        ...ctx,

        original_http_status: 200,
        original_existe: true,
        original_ja_excluida: false,

        precisa_excluir_original: true
      }
    };
  }

  // -------------------------------------------------------
  // ORIGINAL JÁ FOI EXCLUÍDA
  // -------------------------------------------------------

  if (
    httpStatus === 404 &&
    originBody.code === 'rest_post_invalid_id'
  ) {

    return {
      json: {
        ...ctx,

        original_http_status: 404,
        original_existe: false,
        original_ja_excluida: true,

        precisa_excluir_original: false
      }
    };
  }

  // -------------------------------------------------------
  // ERRO TRANSITÓRIO
  //
  // Não pode cair no FALSE do IF, porque FALSE significa
  // "original já excluída".
  // -------------------------------------------------------

  if (
    [
      403,
      408,
      429,
      500,
      502,
      503,
      504,
      520,
      522,
      523,
      524
    ].includes(httpStatus)
  ) {

    throw new Error(
      `Falha transitória ao verificar mídia original | ` +
      `migration=${migrationId} | ` +
      `media=${originalId} | ` +
      `HTTP=${httpStatus}`
    );
  }

  // -------------------------------------------------------
  // QUALQUER OUTRA RESPOSTA
  // -------------------------------------------------------

  throw new Error(
    `Resposta inesperada ao verificar mídia original | ` +
    `migration=${migrationId} | ` +
    `media=${originalId} | ` +
    `HTTP=${httpStatus || 'N/A'}`
  );
});
