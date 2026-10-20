// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Valida | Exclusão Confirmada Retry
// Extraído do export n8n oficial.

// Code node: Valida | Confirmação após Retry (Run Once for All Items).
// Um 429 após o DELETE não informa se a mídia ainda existe.
const ultimaTentativa = true;
const r = $json;
const ctx = $('Loop | Exclusões').item.json;

const migrationId = Number(ctx.migration_id);
const originalId = Number(ctx.wp_media_id_original);

if (!Number.isSafeInteger(migrationId) || migrationId <= 0 ||
    !Number.isSafeInteger(originalId) || originalId <= 0) {
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
    throw new Error(
      `Resposta da origem inválida | migration=${migrationId} | ` +
      `media=${originalId} | HTTP=${httpStatus || 'N/A'}`
    );
  }
} else if (body.origin_body && typeof body.origin_body === 'object') {
  originBody = body.origin_body;
} else if (body.code) {
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

if (httpStatus === 429) {
  if (ultimaTentativa) {
    throw new Error(
      `Confirmação pendente após retry | migration=${migrationId} | ` +
      `media=${originalId} | HTTP=429. Repetir somente o GET mais tarde.`
    );
  }

  return [{
    json: {
      ...ctx,
      migration_id: migrationId,
      wp_media_id_original: originalId,
      exclusao_confirmada: false,
      confirmacao_pendente: true,
      exclusao_http_status: 429,
      exclusao_origin_code: null
    },
    pairedItem: { item: 0 }
  }];
}

if (httpStatus !== 404 || originCode !== 'rest_post_invalid_id') {
  throw new Error(
    `Exclusão não confirmada | migration=${migrationId} | ` +
    `media=${originalId} | HTTP=${httpStatus || 'N/A'} | ` +
    `code=${originCode || 'N/A'}`
  );
}

return [{
  json: {
    ...ctx,
    migration_id: migrationId,
    wp_media_id_original: originalId,
    exclusao_confirmada: true,
    confirmacao_pendente: false,
    exclusao_http_status: httpStatus,
    exclusao_origin_code: originCode
  },
  pairedItem: { item: 0 }
}];
