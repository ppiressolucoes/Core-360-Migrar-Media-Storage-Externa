// Node: Valida | Exclusão Confirmada Retry
// Mode: Run Once for All Items
// HTTP 200 exige novo DELETE; respostas transitórias repetem somente o GET.

const r = $json;
const ctx = $('Loop | Exclusões').item.json;

const migrationId = Number(ctx.migration_id);
const originalId = Number(ctx.wp_media_id_original);

if (
  !Number.isSafeInteger(migrationId) ||
  migrationId <= 0 ||
  !Number.isSafeInteger(originalId) ||
  originalId <= 0
) {
  throw new Error(
    `Contexto inválido na confirmação da exclusão | ` +
    `migration=${ctx.migration_id} | original=${ctx.wp_media_id_original}`
  );
}

const body = r.body && typeof r.body === 'object' ? r.body : r;
const httpStatus = Number(body.origin_status ?? r.statusCode ?? 0);

let originBody = {};

if (typeof body.origin_body === 'string' && body.origin_body.trim()) {
  try {
    originBody = JSON.parse(body.origin_body);
  } catch {
    originBody = {};
  }
} else if (body.origin_body && typeof body.origin_body === 'object') {
  originBody = body.origin_body;
} else if (body && typeof body === 'object') {
  originBody = body;
}

const originCode = originBody.code ?? null;
const target = String(body.target ?? '');

if (target) {
  const match = target.match(/\/wp\/v2\/media\/(\d+)(?:[/?#]|$)/);

  if (!match || Number(match[1]) !== originalId) {
    throw new Error(
      `Resposta de outra mídia | migration=${migrationId} | ` +
      `media=${originalId} | target=${target}`
    );
  }
}

const mediaRetornada = Number(body.id ?? 0);

if (
  httpStatus === 200 &&
  (!Number.isSafeInteger(mediaRetornada) || mediaRetornada !== originalId)
) {
  throw new Error(
    `GET retornou contexto divergente | migration=${migrationId} | ` +
    `media_esperada=${originalId} | media_retornada=${body.id ?? 'N/A'}`
  );
}

if (httpStatus === 404 && originCode === 'rest_post_invalid_id') {
  return [{
    json: {
      ...ctx,
      migration_id: migrationId,
      wp_media_id_original: originalId,
      exclusao_confirmada: true,
      confirmacao_pendente: false,
      repetir_exclusao: false,
      exclusao_acao: 'CONFIRMADA',
      exclusao_http_status: httpStatus,
      exclusao_origin_code: originCode,
      confirmacao_retry_after: 0,
    },
    pairedItem: { item: 0 },
  }];
}

if (httpStatus === 200) {
  return [{
    json: {
      ...ctx,
      migration_id: migrationId,
      wp_media_id_original: originalId,
      exclusao_confirmada: false,
      confirmacao_pendente: false,
      repetir_exclusao: true,
      exclusao_acao: 'REPETIR_DELETE',
      exclusao_http_status: httpStatus,
      exclusao_origin_code: null,
      confirmacao_retry_after: 120,
      confirmacao_motivo: 'MIDIA_ORIGINAL_AINDA_EXISTE',
    },
    pairedItem: { item: 0 },
  }];
}

const statusTransitorios = new Set([
  408,
  425,
  429,
  500,
  502,
  503,
  504,
  520,
  521,
  522,
  523,
  524,
]);

if (statusTransitorios.has(httpStatus)) {
  const retryAfterInformado = Number(
    originBody.retry_after ??
    body.retry_after ??
    r.headers?.['retry-after'] ??
    0
  );

  const retryAfter = Math.max(
    Number.isFinite(retryAfterInformado) ? retryAfterInformado : 0,
    httpStatus === 429 || httpStatus === 504 ? 120 : 60
  );

  return [{
    json: {
      ...ctx,
      migration_id: migrationId,
      wp_media_id_original: originalId,
      exclusao_confirmada: false,
      confirmacao_pendente: true,
      repetir_exclusao: false,
      exclusao_acao: 'REPETIR_GET',
      exclusao_http_status: httpStatus,
      exclusao_origin_code: originCode,
      confirmacao_retry_after: retryAfter,
      confirmacao_motivo:
        originBody.error_name ??
        body.origin_status_text ??
        r.statusMessage ??
        `HTTP_${httpStatus}`,
    },
    pairedItem: { item: 0 },
  }];
}

throw new Error(
  `Exclusão não confirmada | migration=${migrationId} | ` +
  `media=${originalId} | HTTP=${httpStatus || 'N/A'} | ` +
  `code=${originCode || 'N/A'}`
);
