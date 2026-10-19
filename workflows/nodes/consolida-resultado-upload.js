// SUB | Storage Media External retorna o provider escolhido pela reserva.
const upload = $json;
const origem = $('Loop').item.json;
const id = Number(origem.migration_id);
if (!id || !Number(origem.post_id) || !Number(origem.wp_media_id)) {
  throw new Error('Contexto da migration incompleto no Loop.');
}
const provider = String(upload.provider || '').toLowerCase();
if (!['cloudinary', 'cloudflare_r2', 'backblaze_b2'].includes(provider)) {
  throw new Error(`Migration ${id}: provider ausente ou desconhecido.`);
}
const key = String(upload.public_id || '').trim();
const url = String(upload.secure_url || '').trim();
const sha256 = String(upload.sha256 || key.split('/').pop() || '').toLowerCase();
if (!/^[a-f0-9]{64}$/.test(sha256) || !key.endsWith(`/${sha256}`)) {
  throw new Error(`Migration ${id}: SHA-256 ou chave do objeto divergente.`);
}
if (!/^https:\/\/[^\s/?#]+\/[^\s]*$/i.test(url) || !url.includes(`/${key}.`)) {
  throw new Error(`Migration ${id}: URL pública inválida ou chave divergente.`);
}
if (provider === 'cloudinary' && !/^https:\/\/res\.cloudinary\.com\/[^/]+\//i.test(url)) {
  throw new Error(`Migration ${id}: URL Cloudinary inválida.`);
}
return {json: {
  migration_id: id,
  ordem: Number(origem.ordem),
  post_id: Number(origem.post_id),
  wp_media_id: Number(origem.wp_media_id),
  original_url: origem.original_url ?? null,
  original_file: origem.original_file ?? null,
  sha256,
  storage_provider: provider,
  storage_key: key,
  storage_url: url,
  storage_asset_id: upload.asset_id ?? null,
  storage_bytes: upload.bytes ?? null,
  storage_width: upload.width ?? null,
  storage_height: upload.height ?? null,
  storage_mime_type: upload.mime_type ?? null,
  cloudinary_public_id: provider === 'cloudinary' ? key : null,
  cloudinary_url: provider === 'cloudinary' ? url : null,
  cloudinary_asset_id: provider === 'cloudinary' ? upload.asset_id ?? null : null,
  upload_ok: true
}};
