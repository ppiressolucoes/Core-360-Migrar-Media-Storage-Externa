// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Classifica | Registro Mídia Virtual WP
// Extraído do export n8n oficial.

const r = $json;

const body = (
  r.body &&
  typeof r.body === 'object'
)
  ? r.body
  : {};

const statusCode = Number(
  body.origin_status ??
  r.statusCode ??
  0
);

const attachmentId = Number(
  body.attachment_id ?? 0
);

// Sucesso real
if (
  [200, 201].includes(statusCode) &&
  attachmentId > 0
) {
  return [{
    json: {
      ...r,
      classificacao_registro: 'SUCESSO',
      retry_after: 0
    }
  }];
}

// Tenta extrair retry_after do origin_body
let retryAfter = 120;

if (typeof body.origin_body === 'string') {
  try {
    const parsed = JSON.parse(body.origin_body);

    if (Number(parsed.retry_after) > 0) {
      retryAfter = Number(parsed.retry_after);
    }
  } catch {}
}

// Erros transitórios de infraestrutura/WAF
const transitorios = [
  403,
  429,
  500,
  502,
  503,
  504,
  520,
  522,
  523,
  524
];

if (transitorios.includes(statusCode)) {
  return [{
    json: {
      ...r,
      classificacao_registro: 'TRANSITORIO',
      retry_after: retryAfter,
      http_status: statusCode
    }
  }];
}

// Erro definitivo
return [{
  json: {
    ...r,
    classificacao_registro: 'ERRO_REAL',
    retry_after: 0,
    http_status: statusCode
  }
}];
