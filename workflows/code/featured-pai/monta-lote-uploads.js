// Workflow: PEL | Migração Featured IMG | PAI
// Node: Monta | Lote Uploads
// Extraído do export n8n oficial.

const items = $input.all();

if (items.length === 0) {
  throw new Error('Nenhum resultado de upload recebido do Loop.');
}

const uploads = items.map((item, index) => {
  const row = item.json;

  if (!row.migration_id) {
    throw new Error(`Item ${index + 1}: migration_id ausente.`);
  }

  if (row.upload_ok !== true) {
    throw new Error(
      `Migration ${row.migration_id}: upload não confirmado.`
    );
  }

  if (!row.sha256) {
    throw new Error(
      `Migration ${row.migration_id}: SHA-256 ausente.`
    );
  }

  if (!row.cloudinary_public_id) {
    throw new Error(
      `Migration ${row.migration_id}: cloudinary_public_id ausente.`
    );
  }

  if (!row.cloudinary_url) {
    throw new Error(
      `Migration ${row.migration_id}: cloudinary_url ausente.`
    );
  }

  // Cloud name extraído da URL real retornada pelo Cloudinary.
  const match = row.cloudinary_url.match(
    /^https:\/\/res\.cloudinary\.com\/([^/]+)\//
  );

  if (!match) {
    throw new Error(
      `Migration ${row.migration_id}: URL Cloudinary inválida: ${row.cloudinary_url}`
    );
  }

  return {
    migration_id: Number(row.migration_id),
    post_id: Number(row.post_id),
    wp_media_id: Number(row.wp_media_id),

    original_url: row.original_url,

    sha256: row.sha256,

    cloudinary_cloud_name: match[1],
    cloudinary_public_id: row.cloudinary_public_id,
    cloudinary_url: row.cloudinary_url,

    cloudinary_asset_id: row.cloudinary_asset_id ?? null,
    cloudinary_bytes: row.cloudinary_bytes ?? null,
    cloudinary_width: row.cloudinary_width ?? null,
    cloudinary_height: row.cloudinary_height ?? null,
    cloudinary_format: row.cloudinary_format ?? null
  };
});

return [
  {
    json: {
      total_uploads: uploads.length,
      uploads
    }
  }
];
