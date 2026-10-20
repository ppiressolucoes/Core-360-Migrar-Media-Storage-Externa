// Recuperação da página 79 após SP | Registra Lote bloquear a migration 498.
// Node: Recupera | Lote Repositório (Run Once for All Items)
// Entrada: DB | Recupera Storage Canônico para todas as migrations do lote.
//
// O banco é a fonte canônica do storage. O upload da execução atual fornece
// apenas a URL original e os metadados técnicos da mesma imagem, comprovada
// pelo SHA-256. Divergências de destino são preservadas para auditoria.

const lote = $('Monta | Lote Uploads').first().json;
const checkpoint = $('Monta | Candidatos [5]').first().json;
const uploads = lote.uploads;
const banco = $input.all().map(item => item.json);

if (!Array.isArray(uploads) || uploads.length === 0) {
  throw new Error('Lote de uploads ausente ou vazio.');
}

if (banco.length !== uploads.length) {
  throw new Error(
    `Lote persistido incompleto: banco=${banco.length}, uploads=${uploads.length}.`
  );
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

const vistos = new Set();

const saida = banco.map(row => {
  const migrationId = inteiroPositivo(row.migration_id);
  const upload = uploadsPorId.get(migrationId);

  if (!migrationId || !upload || vistos.has(migrationId)) {
    throw new Error(
      `Migration ${row.migration_id}: resultado do banco ausente, duplicado ou inválido.`
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
      `Migration ${migrationId}: storage canônico incompleto ou estado diferente de PROCESSING.`
    );
  }

  const originalUrl = texto(upload.original_url);
  const width = inteiroPositivo(upload.storage_width ?? upload.cloudinary_width);
  const height = inteiroPositivo(upload.storage_height ?? upload.cloudinary_height);
  const mime = texto(upload.storage_mime_type);

  if (
    !/^https:\/\/[^/\s]+\/\S+$/.test(originalUrl) ||
    !width ||
    !height ||
    !/^image\/[a-z0-9.+-]+$/i.test(mime)
  ) {
    throw new Error(
      `Migration ${migrationId}: metadados técnicos do upload estão incompletos.`
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
