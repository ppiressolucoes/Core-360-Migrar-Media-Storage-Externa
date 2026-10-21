// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Valida | Exclusão Confirmada
// Extraído do export n8n oficial.

// Code node: Valida | Exclusão Confirmada
// Mode: Run Once for All Items
//
// O DELETE pode terminar no WordPress mesmo quando a confirmação posterior
// recebe timeout ou rate limit. Respostas transitórias não encerram o fluxo:
// elas seguem para Wait e repetem somente o GET de confirmação.

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
    `migration=${ctx.migration_id} | ` +
    `original=${ctx.wp_media_id_original}`
  );
}

const body =
  r.body && typeof r.body === 'object'
    ? r.body
    : r;

const httpStatus = Number(
  body.origin_status ??
  r.statusCode ??
  0
);

let originBody = {};

if (
  typeof body.origin_body === 'string' &&
  body.origin_body.trim()
) {
  try {
    originBody = JSON.parse(body.origin_body);
  } catch {
    originBody = {};
  }
} else if (
  body.origin_body &&
  typeof body.origin_body === 'object'
) {
  originBody = body.origin_body;
} else if (
  body &&
  typeof body === 'object'
) {
  originBody = body;
}

const originCode =
  originBody.code ??
  null;

const target =
  String(body.target ?? '');

if (target) {
  const match = target.match(
    /\/wp\/v2\/media\/(\d+)(?:[/?#]|$)/
  );

  if (
    !match ||
    Number(match[1]) !== originalId
  ) {
    throw new Error(
      `Resposta de outra mídia | ` +
      `migration=${migrationId} | ` +
      `media=${originalId} | ` +
      `target=${target}`
    );
  }
}

// Confirmação definitiva de que a mídia original não existe.
const exclusaoConfirmada =
  httpStatus === 404 &&
  originCode === 'rest_post_invalid_id';

if (exclusaoConfirmada) {
  return [{
    json: {
      ...ctx,

      migration_id: migrationId,
      wp_media_id_original: originalId,

      exclusao_confirmada: true,
      confirmacao_pendente: false,

      exclusao_http_status: httpStatus,
      exclusao_origin_code: originCode,

      confirmacao_retry_after: 0,
      confirmacao_status: 'EXCLUIDA'
    },

    pairedItem: {
      item: 0
    }
  }];
}

// Respostas transitórias: repetir somente o GET.
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
  524
]);

if (statusTransitorios.has(httpStatus)) {
  const retryAfterInformado = Number(
    originBody.retry_after ??
    body.retry_after ??
    r.headers?.['retry-after'] ??
    0
  );

  const retryAfter = Math.max(
    Number.isFinite(retryAfterInformado)
      ? retryAfterInformado
      : 0,
    httpStatus === 429 || httpStatus === 504
      ? 120
      : 60
  );

  return [{
    json: {
      ...ctx,

      migration_id: migrationId,
      wp_media_id_original: originalId,

      exclusao_confirmada: false,
      confirmacao_pendente: true,

      exclusao_http_status: httpStatus,
      exclusao_origin_code: originCode,

      confirmacao_retry_after: retryAfter,
      confirmacao_status: 'PENDENTE_RETRY_GET',
      confirmacao_motivo:
        originBody.error_name ??
        body.origin_status_text ??
        r.statusMessage ??
        `HTTP_${httpStatus}`
    },

    pairedItem: {
      item: 0
    }
  }];
}

// HTTP 200 significa que a mídia continua existindo.
// Não pode ser interpretado como exclusão concluída.
if (httpStatus === 200) {
  throw new Error(
    `Mídia original ainda existe após DELETE | ` +
    `migration=${migrationId} | ` +
    `media=${originalId} | HTTP=200`
  );
}

throw new Error(
  `Exclusão não confirmada | ` +
  `migration=${migrationId} | ` +
  `media=${originalId} | ` +
  `HTTP=${httpStatus || 'N/A'} | ` +
  `code=${originCode || 'N/A'}`
);
