// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Classifica | Auditoria Final
// Extraído do export n8n oficial.

const r = $json;

// Contexto original do item que está sendo auditado
const ctx = $('Loop | Auditoria Final').item.json;

// ---------------------------------------------------------
// STATUS HTTP
// Compatível com resposta direta e resposta do proxy
// ---------------------------------------------------------

const httpStatus = Number(
  r.body?.origin_status ??
  r.statusCode ??
  0
);

// ---------------------------------------------------------
// BODY ORIGINAL DO WORDPRESS
// ---------------------------------------------------------

let originBody = {};

// Quando o proxy encapsula o erro
if (typeof r.body?.origin_body === 'string') {
  try {
    originBody = JSON.parse(r.body.origin_body);
  } catch {
    originBody = {};
  }
}

// Caso eventualmente venha resposta direta
if (
  !Object.keys(originBody).length &&
  r.body &&
  typeof r.body === 'object'
) {
  originBody = r.body;
}

const originCode =
  originBody.code ?? null;

// ---------------------------------------------------------
// CLASSIFICAÇÃO
// ---------------------------------------------------------

let auditoriaStatus = 'ERRO_REAL';

// Mídia realmente não existe mais
if (
  httpStatus === 404 &&
  originCode === 'rest_post_invalid_id'
) {
  auditoriaStatus = 'EXCLUIDA';
}

// Original ainda existe
else if (httpStatus === 200) {
  auditoriaStatus = 'ORIGINAL_EXISTE';
}

// Falhas temporárias / infraestrutura / rate limit
else if (
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
  auditoriaStatus = 'TRANSITORIO';
}

// ---------------------------------------------------------
// RETORNO
// ---------------------------------------------------------

return [{
  json: {
    ...ctx,

    auditoria_status:
      auditoriaStatus,

    auditoria_http_status:
      httpStatus,

    auditoria_origin_code:
      originCode,

    auditoria_confirmada:
      auditoriaStatus === 'EXCLUIDA',

    auditoria_erro:
      auditoriaStatus === 'ERRO_REAL'
        ? (
            r.body?.origin_status_text ??
            r.statusMessage ??
            'Falha não classificada na auditoria final'
          )
        : null
  }
}];
