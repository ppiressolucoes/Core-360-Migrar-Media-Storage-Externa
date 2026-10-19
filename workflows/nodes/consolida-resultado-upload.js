// ============================================================
// RESULTADO RETORNADO PELO SUBFLUXO CLOUDINARY
// ============================================================

const cloudinary = $json;


// ============================================================
// CONTEXTO ORIGINAL DA MÍDIA ATUAL DO LOOP
// ============================================================

const origem = $('Loop').item.json;


// ============================================================
// VALIDAÇÕES
// ============================================================

if (!origem.migration_id) {
  throw new Error('migration_id não encontrado no item atual do Loop.');
}

if (!origem.post_id) {
  throw new Error(
    `post_id não encontrado para migration_id ${origem.migration_id}.`
  );
}

if (!origem.wp_media_id) {
  throw new Error(
    `wp_media_id não encontrado para migration_id ${origem.migration_id}.`
  );
}

if (!cloudinary.public_id) {
  throw new Error(
    `Cloudinary não retornou public_id para migration_id ${origem.migration_id}.`
  );
}

if (!cloudinary.secure_url) {
  throw new Error(
    `Cloudinary não retornou secure_url para migration_id ${origem.migration_id}.`
  );
}

// Falha imediatamente se a chamada externa apontar para outro provider.
// O restante do PAI e as procedures desta sprint usam contrato Cloudinary.
const uploadUrl = String(cloudinary.secure_url).trim();
if (!/^https:\/\/res\.cloudinary\.com\/[^/]+\//i.test(uploadUrl)) {
  const host = uploadUrl.match(/^(?:https?:)?\/\/([^/]+)/i)?.[1] ?? 'desconhecido';
  throw new Error(
    `Migration ${origem.migration_id}: subfluxo retornou host ${host}; ` +
    'PAI Featured espera Cloudinary. Confira o workflow em Chamar Repositório Externo.'
  );
}


// ============================================================
// SHA-256
//
// Nosso public_id possui:
// pel/featured/<SHA256>
//
// Pegamos somente a última parte.
// ============================================================

const sha256 =
  cloudinary.public_id
    .split('/')
    .pop();

if (!/^[a-f0-9]{64}$/i.test(sha256)) {
  throw new Error(
    `SHA-256 inválido extraído do public_id: ${cloudinary.public_id}`
  );
}


// ============================================================
// RESULTADO NORMALIZADO DA ITERAÇÃO
// ============================================================

return {
  json: {

    migration_id:
      Number(origem.migration_id),

    ordem:
      Number(origem.ordem),

    post_id:
      Number(origem.post_id),

    wp_media_id:
      Number(origem.wp_media_id),

    original_url:
      origem.original_url ?? null,

    original_file:
      origem.original_file ?? null,

    sha256,

    cloudinary_public_id:
      cloudinary.public_id,

    cloudinary_url:
      cloudinary.secure_url,

    cloudinary_asset_id:
      cloudinary.asset_id ?? null,

    cloudinary_bytes:
      cloudinary.bytes ?? null,

    cloudinary_width:
      cloudinary.width ?? null,

    cloudinary_height:
      cloudinary.height ?? null,

    cloudinary_format:
      cloudinary.format ?? null,

    upload_ok: true
  }
};
