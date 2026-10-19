const items = $input.all();
if (!items.length) throw new Error('Nenhum resultado de upload recebido do Loop.');
const uploads = items.map((item, index) => {
  const row = item.json;
  const id = Number(row.migration_id);
  if (!id || row.upload_ok !== true) {
    throw new Error(`Item ${index + 1}: migration_id ou upload_ok inválido.`);
  }
  // Compatibilidade para retomar a execução 469–471 já enviada ao storage.
  const url = String(row.storage_url || row.cloudinary_url || '').trim();
  const key = String(row.storage_key || row.cloudinary_public_id || '').trim();
  const inferred = /^https:\/\/res\.cloudinary\.com\//i.test(url)
    ? 'cloudinary' : /^https:\/\/[^/]+\.r2\.dev\//i.test(url) ? 'cloudflare_r2' : null;
  const provider = row.storage_provider || inferred;
  const sha256 = String(row.sha256 || '').toLowerCase();
  if (!['cloudinary', 'cloudflare_r2', 'backblaze_b2'].includes(provider) ||
      !/^https:\/\/[^\s/?#]+\/[^\s]*$/i.test(url) ||
      !/^[a-f0-9]{64}$/.test(sha256) ||
      !key.endsWith(`/${sha256}`) || !url.includes(`/${key}.`)) {
    throw new Error(`Migration ${id}: contrato de storage inválido.`);
  }
  if (provider === 'cloudinary' && !/^https:\/\/res\.cloudinary\.com\//i.test(url)) {
    throw new Error(`Migration ${id}: URL não corresponde ao provider Cloudinary.`);
  }
  if (provider === 'cloudflare_r2' && !/^https:\/\/[^/]+\.r2\.dev\//i.test(url)) {
    throw new Error(`Migration ${id}: URL não corresponde ao provider R2.`);
  }
  const extension = url.match(/\.(jpe?g|png|webp)(?:\?|$)/i)?.[1].toLowerCase();
  return {
    migration_id: id, post_id: Number(row.post_id), wp_media_id: Number(row.wp_media_id),
    original_url: row.original_url, sha256,
    storage_provider: provider, storage_key: key, storage_url: url,
    storage_asset_id: row.storage_asset_id ?? row.cloudinary_asset_id ?? null,
    storage_bytes: row.storage_bytes ?? row.cloudinary_bytes ?? null,
    storage_width: row.storage_width ?? row.cloudinary_width ?? null,
    storage_height: row.storage_height ?? row.cloudinary_height ?? null,
    storage_mime_type: row.storage_mime_type ?? (extension ? `image/${extension === 'jpg' ? 'jpeg' : extension}` : null),
    cloudinary_cloud_name: provider === 'cloudinary' ? url.match(/^https:\/\/res\.cloudinary\.com\/([^/]+)\//i)?.[1] : null,
    cloudinary_public_id: provider === 'cloudinary' ? key : null,
    cloudinary_url: provider === 'cloudinary' ? url : null,
    cloudinary_asset_id: provider === 'cloudinary' ? row.cloudinary_asset_id ?? row.storage_asset_id ?? null : null,
    cloudinary_bytes: provider === 'cloudinary' ? row.cloudinary_bytes ?? row.storage_bytes ?? null : null,
    cloudinary_width: provider === 'cloudinary' ? row.cloudinary_width ?? row.storage_width ?? null : null,
    cloudinary_height: provider === 'cloudinary' ? row.cloudinary_height ?? row.storage_height ?? null : null,
    cloudinary_format: provider === 'cloudinary' ? row.cloudinary_format ?? null : null
  };
});
if (new Set(uploads.map(x => x.migration_id)).size !== uploads.length) {
  throw new Error('migration_id duplicado no lote de uploads.');
}
return [{json: {total_uploads: uploads.length, uploads}}];
