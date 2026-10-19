// Compatibilidade temporária com SP_WP_registra_cloudinary_lote e o schema atual.
// Os campos cloudinary_* são exigidos pela procedure, mesmo para URL R2.
const items = $input.all();
if (!items.length) throw new Error('Nenhum resultado de upload recebido do Loop.');

const uploads = items.map((item, index) => {
  const row = item.json;
  const id = Number(row.migration_id);
  const postId = Number(row.post_id);
  const mediaId = Number(row.wp_media_id);
  if (![id, postId, mediaId].every(Number.isSafeInteger) ||
      [id, postId, mediaId].some(value => value <= 0)) {
    throw new Error(`Item ${index + 1}: IDs da migration incompletos.`);
  }
  if (row.upload_ok !== true) {
    throw new Error(`Migration ${id}: upload não confirmado.`);
  }

  const sha256 = String(row.sha256 || '').toLowerCase();
  const publicId = String(row.storage_key || row.cloudinary_public_id || '').trim();
  const url = String(row.storage_url || row.cloudinary_url || '').trim();
  const match = url.match(/^https:\/\/([^/?#]+)\//i);
  const host = match?.[1]?.toLowerCase();
  const provider = String(row.storage_provider || row.provider ||
    (host === 'res.cloudinary.com' ? 'cloudinary' :
      host?.endsWith('.r2.dev') ? 'cloudflare_r2' : host || '')).toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(sha256) ||
      !publicId || !host ||
      !provider || provider.length > 255) {
    throw new Error(`Migration ${id}: SHA, public_id, provider ou URL inválidos.`);
  }

  const extension = url.match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1].toLowerCase();
  const assetId = row.storage_asset_id ?? row.cloudinary_asset_id ?? null;
  const bytes = row.storage_bytes ?? row.cloudinary_bytes ?? null;
  const width = row.storage_width ?? row.cloudinary_width ?? null;
  const height = row.storage_height ?? row.cloudinary_height ?? null;
  const mimeType = row.storage_mime_type ??
    (extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : null);

  return {
    migration_id: id,
    post_id: postId,
    wp_media_id: mediaId,
    original_url: row.original_url ?? null,
    sha256,
    storage_provider: provider,
    storage_key: publicId,
    storage_url: url,
    storage_asset_id: assetId,
    storage_bytes: bytes,
    storage_width: width,
    storage_height: height,
    storage_mime_type: mimeType,
    cloudinary_cloud_name: provider === 'cloudinary'
      ? url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\//i)?.[1] ?? null : null,
    // A procedure atual lê estes nomes; não são prova de provider Cloudinary.
    cloudinary_public_id: publicId,
    cloudinary_url: url,
    cloudinary_asset_id: assetId,
    cloudinary_bytes: bytes,
    cloudinary_width: width,
    cloudinary_height: height,
    cloudinary_format: extension ?? null
  };
});

if (new Set(uploads.map(row => row.migration_id)).size !== uploads.length) {
  throw new Error('migration_id duplicado no lote.');
}
return [{json: {total_uploads: uploads.length, uploads}}];
