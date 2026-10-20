// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Normaliza | Falha Registro Mídia Virtual
// Extraído do export n8n oficial.

const r = $json;

// Contexto original da migration dentro do Loop1
const origem = $('Loop').item.json;

const body = (
  r.body &&
  typeof r.body === 'object'
)
  ? r.body
  : {};

const httpStatus = Number(
  body.origin_status ??
  r.http_status ??
  r.statusCode ??
  0
);

// Tenta obter mensagem detalhada do origin
let detalhe = '';

if (typeof body.origin_body === 'string') {
  try {
    const parsed = JSON.parse(body.origin_body);

    detalhe =
      parsed.detail ??
      parsed.title ??
      parsed.error_name ??
      body.origin_body;
  } catch {
    detalhe = body.origin_body;
  }
}

if (!detalhe) {
  detalhe =
    body.message ??
    body.error ??
    r.statusMessage ??
    'Falha ao registrar mídia virtual no WordPress';
}

const erro =
  `Falha registro mídia virtual | ` +
  `HTTP ${httpStatus || 'N/A'} | ` +
  detalhe;

return [{
  json: {
    migration_id: Number(origem.migration_id),
    post_id: Number(origem.post_id),
    wp_media_id_original: Number(origem.wp_media_id_original),

    // Pode não existir, porque a falha ocorreu antes da criação
    wp_media_id_virtual: null,

    cloudinary_url:
      origem.cloudinary_url ?? null,

    status_destino: 'ERROR',

    etapa_erro:
      'REGISTRO_MIDIA_VIRTUAL',

    http_status:
      httpStatus || null,

    error_message:
      erro.slice(0, 1000)
  }
}];
