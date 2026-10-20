// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Classifica | Retry Registro Mídia Virtual WP
// Extraído do export n8n oficial.

const r = $json;
const body = r.body ?? {};

const statusCode = Number(
  body.origin_status ??
  r.statusCode ??
  0
);

const attachmentId = Number(
  body.attachment_id ?? 0
);

const sucesso =
  [200, 201].includes(statusCode) &&
  attachmentId > 0;

return [{
  json: {
    ...r,
    classificacao_retry_registro:
      sucesso
        ? 'SUCESSO_FINAL'
        : 'FALHA_FINAL',

    http_status: statusCode
  }
}];
