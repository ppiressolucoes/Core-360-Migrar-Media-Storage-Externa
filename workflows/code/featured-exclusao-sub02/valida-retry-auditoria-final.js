// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Valida | Retry Auditoria Final
// Extraído do export n8n oficial.

const r = $json;
const ctx = $('Loop | Auditoria Final').item.json;

const httpStatus = Number(
  r.body?.origin_status ??
  r.statusCode ??
  0
);

let originBody = {};

if (typeof r.body?.origin_body === 'string') {
  try {
    originBody = JSON.parse(r.body.origin_body);
  } catch {}
}

const excluida =
  httpStatus === 404 &&
  originBody.code === 'rest_post_invalid_id';

if (!excluida) {
  throw new Error(
    `Auditoria final falhou após retry | ` +
    `migration=${ctx.migration_id} | ` +
    `media_original=${ctx.wp_media_id_original} | ` +
    `HTTP=${httpStatus || 'N/A'}`
  );
}

return [{
  json: {
    ...ctx,
    auditoria_status: 'EXCLUIDA',
    auditoria_http_status: httpStatus,
    auditoria_origin_code: originBody.code,
    auditoria_confirmada: true,
    auditoria_retry: true
  }
}];
