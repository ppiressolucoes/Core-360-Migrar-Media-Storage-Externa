// Code node após DB | Recupera Storage Canônico (Run Once for All Items).
const lote = $('Monta | Lote Uploads').first().json;
const checkpoint = $('Monta | Candidatos [5]').first().json;
const uploads = lote.uploads;
const banco = $input.all().map(item => item.json);

if (!Array.isArray(uploads) || uploads.length === 0 || banco.length !== uploads.length) {
  throw new Error('Lote persistido incompleto; interromper associação WP.');
}
if (!Array.isArray(checkpoint.candidatos) || checkpoint.candidatos.length === 0 ||
    !Number.isInteger(Number(checkpoint.pagina_processada)) ||
    !Number.isInteger(Number(checkpoint.ultimo_post_pagina))) {
  throw new Error('Checkpoint da página inválido.');
}

const porId = new Map();
for (const row of uploads) {
  const id = Number(row.migration_id);
  if (!Number.isSafeInteger(id) || id < 1 || porId.has(id)) {
    throw new Error(`migration_id duplicado ou inválido: ${row.migration_id}`);
  }
  porId.set(id, row);
}

const vistos = new Set();
const saida = banco.map(row => {
  const id = Number(row.migration_id);
  const upload = porId.get(id);
  if (!upload || vistos.has(id)) throw new Error(`Migration ${id}: resultado DB ausente ou duplicado.`);
  vistos.add(id);

  const iguais = [
    ['post_id', row.post_id, upload.post_id],
    ['wp_media_id_original', row.wp_media_id_original, upload.wp_media_id],
    ['sha256', row.sha256, upload.sha256],
    ['storage_provider', row.storage_provider, upload.storage_provider],
    ['storage_key', row.storage_key, upload.storage_key],
    ['storage_url', row.storage_url, upload.storage_url],
    ['storage_asset_id', row.storage_asset_id, upload.storage_asset_id],
  ];
  for (const [campo, db, recebido] of iguais) {
    if (String(db ?? '') !== String(recebido ?? '')) {
      throw new Error(`Migration ${id}: ${campo} divergente do banco; não associar ao WP.`);
    }
  }

  const width = Number(upload.storage_width);
  const height = Number(upload.storage_height);
  const mime = String(upload.storage_mime_type || '');
  if (row.status !== 'PROCESSING' ||
      !/^[a-z0-9_]{1,100}$/.test(String(row.storage_provider || '')) ||
      !/^https:\/\/[^/\s]+\/\S+$/.test(String(row.storage_url || '')) ||
      !row.storage_asset_id || !upload.original_url ||
      !Number.isSafeInteger(width) || width < 1 ||
      !Number.isSafeInteger(height) || height < 1 || !mime.startsWith('image/')) {
    throw new Error(`Migration ${id}: contrato de storage ou mídia incompleto.`);
  }

  const cloudinary = row.storage_provider === 'cloudinary';
  return { json: {
    migration_id: id,
    post_id: Number(row.post_id),
    wp_media_id_original: Number(row.wp_media_id_original),
    original_url: upload.original_url,
    sha256: row.sha256,
    storage_provider: row.storage_provider,
    storage_key: row.storage_key,
    storage_url: row.storage_url,
    storage_asset_id: row.storage_asset_id,
    storage_mime_type: mime,
    storage_width: width,
    storage_height: height,
    width,
    height,
    format: mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1],
    cloudinary_cloud_name: cloudinary ? row.storage_url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)/i)?.[1] ?? null : null,
    cloudinary_public_id: cloudinary ? row.storage_key : null,
    cloudinary_url: cloudinary ? row.storage_url : null,
    cloudinary_asset_id: cloudinary ? row.storage_asset_id : null,
    pagina_processada: Number(checkpoint.pagina_processada),
    ultimo_post_pagina: Number(checkpoint.ultimo_post_pagina),
    candidatos_pagina: checkpoint.candidatos.map(x => ({
      post_id: Number(x.post_id), wp_media_id: Number(x.wp_media_id),
    })),
  } };
});

if (vistos.size !== porId.size) throw new Error('Nem todas as migrations foram retornadas pelo banco.');
return saida.sort((a, b) => a.json.migration_id - b.json.migration_id);
