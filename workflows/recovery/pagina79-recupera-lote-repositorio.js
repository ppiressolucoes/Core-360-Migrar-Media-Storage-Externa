// Node: Recupera | Lote Repositório
// Mode: Run Once for All Items
// Recuperação validada na página 79 para as migrations 498, 500 e 501.
// Entrada: SELECT do storage canônico de todas as migrations do lote.

const lote = $('Monta | Lote Uploads').first().json;
const checkpoint = $('Monta | Candidatos [5]').first().json;
const uploads = lote.uploads;

if (!Array.isArray(uploads) || uploads.length === 0) {
  throw new Error('Lote de uploads ausente ou vazio.');
}

if (
  !Array.isArray(checkpoint.candidatos) ||
  checkpoint.candidatos.length === 0 ||
  !Number.isSafeInteger(Number(checkpoint.pagina_processada)) ||
  Number(checkpoint.pagina_processada) <= 0 ||
  !Number.isSafeInteger(Number(checkpoint.ultimo_post_pagina)) ||
  Number(checkpoint.ultimo_post_pagina) <= 0
) {
  throw new Error('Contexto do checkpoint da página inválido.');
}

const texto = value => String(value ?? '').trim();
const inteiroPositivo = value => {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const uploadsPorId = new Map();

for (const upload of uploads) {
  const migrationId = inteiroPositivo(upload.migration_id);

  if (!migrationId || uploadsPorId.has(migrationId)) {
    throw new Error(
      `migration_id duplicado ou inválido no upload: ${upload.migration_id}.`
    );
  }

  uploadsPorId.set(migrationId, upload);
}

// O node MySQL pode devolver linhas planas, [resultset, metadata] ou repetir
// o mesmo SELECT por item de entrada. Somente linhas funcionais são coletadas.
const linhasBanco = [];
const wrappers = [
  'json',
  'rows',
  'result',
  'results',
  'data',
  'resultset',
  'resultsets',
];
const metadata = new Set([
  'fieldCount',
  'affectedRows',
  'insertId',
  'info',
  'serverStatus',
  'warningStatus',
  'changedRows',
]);

function coletarLinhas(value, depth = 0) {
  if (depth > 12) {
    throw new Error('Resultado do banco aninhado além do limite esperado.');
  }

  if (Array.isArray(value)) {
    value.forEach(item => coletarLinhas(item, depth + 1));
    return;
  }

  if (value == null) {
    return;
  }

  if (typeof value !== 'object') {
    throw new Error('Resultado do banco contém valor escalar inesperado.');
  }

  if (Object.prototype.hasOwnProperty.call(value, 'migration_id')) {
    linhasBanco.push(value);
    return;
  }

  const keys = Object.keys(value);
  const nestedKeys = [
    ...wrappers,
    ...keys.filter(key => /^\d+$/.test(key)),
  ].filter((key, index, all) => key in value && all.indexOf(key) === index);

  if (nestedKeys.length > 0) {
    nestedKeys.forEach(key => coletarLinhas(value[key], depth + 1));
    return;
  }

  if (keys.length === 0 || keys.every(key => metadata.has(key))) {
    return;
  }

  throw new Error(
    `Formato desconhecido no retorno do banco: ${keys.join(', ')}.`
  );
}

$input.all().forEach(item => coletarLinhas(item.json));

const bancoPorId = new Map();

for (const row of linhasBanco) {
  const migrationId = inteiroPositivo(row.migration_id);

  if (!migrationId) {
    throw new Error(
      `migration_id inválido no retorno do banco: ${row.migration_id}.`
    );
  }

  const anterior = bancoPorId.get(migrationId);

  if (anterior && JSON.stringify(anterior) !== JSON.stringify(row)) {
    throw new Error(
      `Migration ${migrationId}: banco retornou linhas conflitantes.`
    );
  }

  bancoPorId.set(migrationId, row);
}

const ausentes = [...uploadsPorId.keys()]
  .filter(migrationId => !bancoPorId.has(migrationId));
const extras = [...bancoPorId.keys()]
  .filter(migrationId => !uploadsPorId.has(migrationId));

if (ausentes.length > 0 || extras.length > 0) {
  throw new Error(
    `Lote persistido incompleto ou excedente | ` +
    `ausentes=${ausentes.join(',') || 'nenhuma'} | ` +
    `extras=${extras.join(',') || 'nenhuma'} | ` +
    `banco=${bancoPorId.size} | uploads=${uploadsPorId.size}.`
  );
}

const vistos = new Set();

const saida = [...bancoPorId.values()].map(row => {
  const migrationId = inteiroPositivo(row.migration_id);
  const upload = uploadsPorId.get(migrationId);

  if (!migrationId || !upload || vistos.has(migrationId)) {
    throw new Error(
      `Migration ${row.migration_id}: resultado ausente, duplicado ou inválido.`
    );
  }

  vistos.add(migrationId);

  const postId = inteiroPositivo(row.post_id);
  const originalId = inteiroPositivo(row.wp_media_id_original);
  const uploadPostId = inteiroPositivo(upload.post_id);
  const uploadOriginalId = inteiroPositivo(upload.wp_media_id);
  const shaBanco = texto(row.sha256).toLowerCase();
  const shaUpload = texto(upload.sha256).toLowerCase();

  if (
    !postId ||
    !originalId ||
    postId !== uploadPostId ||
    originalId !== uploadOriginalId ||
    !/^[a-f0-9]{64}$/.test(shaBanco) ||
    shaBanco !== shaUpload
  ) {
    throw new Error(
      `Migration ${migrationId}: post, mídia original ou SHA diverge do banco.`
    );
  }

  const provider = texto(row.storage_provider).toLowerCase();
  const storageKey = texto(row.storage_key);
  const storageUrl = texto(row.storage_url);
  const storageAssetId = texto(row.storage_asset_id);

  if (
    row.status !== 'PROCESSING' ||
    !/^[a-z0-9_]{1,100}$/.test(provider) ||
    !storageKey ||
    !/^https:\/\/[^/\s]+\/\S+$/.test(storageUrl) ||
    !storageAssetId
  ) {
    throw new Error(
      `Migration ${migrationId}: storage canônico incompleto ou estado inválido.`
    );
  }

  const originalUrl = texto(upload.original_url);
  const width = inteiroPositivo(
    upload.storage_width ?? upload.cloudinary_width
  );
  const height = inteiroPositivo(
    upload.storage_height ?? upload.cloudinary_height
  );
  const mime = texto(upload.storage_mime_type);

  if (
    !/^https:\/\/[^/\s]+\/\S+$/.test(originalUrl) ||
    !width ||
    !height ||
    !/^image\/[a-z0-9.+-]+$/i.test(mime)
  ) {
    throw new Error(
      `Migration ${migrationId}: metadados técnicos incompletos.`
    );
  }

  const divergencias = [];
  const comparar = [
    ['storage_provider', provider, texto(upload.storage_provider).toLowerCase()],
    ['storage_key', storageKey, texto(upload.storage_key)],
    ['storage_url', storageUrl, texto(upload.storage_url)],
    ['storage_asset_id', storageAssetId, texto(upload.storage_asset_id)],
  ];

  for (const [campo, canonico, recebido] of comparar) {
    if (canonico !== recebido) {
      divergencias.push(campo);
    }
  }

  const cloudinary = provider === 'cloudinary';
  const subtype = mime.split('/')[1].toLowerCase();

  return {
    json: {
      migration_id: migrationId,
      post_id: postId,
      wp_media_id_original: originalId,
      original_url: originalUrl,
      sha256: shaBanco,
      storage_provider: provider,
      storage_key: storageKey,
      storage_url: storageUrl,
      storage_asset_id: storageAssetId,
      storage_mime_type: mime,
      storage_width: width,
      storage_height: height,
      width,
      height,
      format: subtype === 'jpeg' ? 'jpg' : subtype,
      cloudinary_cloud_name: cloudinary
        ? storageUrl.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)/i)?.[1] ?? null
        : null,
      cloudinary_public_id: cloudinary ? storageKey : null,
      cloudinary_url: cloudinary ? storageUrl : null,
      cloudinary_asset_id: cloudinary ? storageAssetId : null,
      storage_canonico_reutilizado: divergencias.length > 0,
      storage_upload_divergencias: divergencias,
      storage_upload_nao_canonico: divergencias.length > 0
        ? {
            provider: texto(upload.storage_provider).toLowerCase(),
            key: texto(upload.storage_key),
            url: texto(upload.storage_url),
            asset_id: texto(upload.storage_asset_id),
          }
        : null,
      pagina_processada: Number(checkpoint.pagina_processada),
      ultimo_post_pagina: Number(checkpoint.ultimo_post_pagina),
      candidatos_pagina: checkpoint.candidatos.map(item => ({
        post_id: Number(item.post_id),
        wp_media_id: Number(item.wp_media_id),
      })),
    },
  };
});

if (vistos.size !== uploadsPorId.size) {
  throw new Error('Nem todas as migrations do upload foram retornadas pelo banco.');
}

return saida.sort(
  (a, b) => a.json.migration_id - b.json.migration_id
);
