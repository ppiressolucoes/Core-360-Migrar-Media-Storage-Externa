const origem = $('Loop1').item.json;
const resp = $json.body ?? $json;
const migrationId = Number(origem.migration_id);
const attachmentId = Number(resp.attachment_id);

if ($json.statusCode && ($json.statusCode < 200 || $json.statusCode >= 300)) {
  throw new Error(`Migration ${migrationId}: registro WP retornou HTTP ${$json.statusCode}.`);
}

if (!Number.isSafeInteger(migrationId) || migrationId < 1 ||
    !Number.isSafeInteger(attachmentId) || attachmentId < 1) {
  throw new Error(`Migration ${migrationId || 'desconhecida'}: attachment_id inválido no registro WP.`);
}

const checks = [
  ['sha256', String(origem.sha256 || '').toLowerCase(), String(resp.sha256 || '').toLowerCase()],
  ['provider', String(origem.storage_provider || '').toLowerCase(), String(resp.provider || '').toLowerCase()],
  ['public_id', String(origem.storage_key || ''), String(resp.public_id || '')],
  ['secure_url', String(origem.storage_url || ''), String(resp.secure_url || '')]
];

if (origem.storage_asset_id != null && String(origem.storage_asset_id) !== '') {
  checks.push(['asset_id', String(origem.storage_asset_id), String(resp.asset_id || '')]);
}

for (const [field, expected, actual] of checks) {
  if (!expected || actual !== expected) {
    throw new Error(
      `Migration ${migrationId}: attachment ${attachmentId} divergente em ${field}; ` +
      'não associar ao post.'
    );
  }
}

const width = Number(origem.storage_width ?? origem.width);
const height = Number(origem.storage_height ?? origem.height);
if (!Number.isSafeInteger(width) || width < 1 ||
    !Number.isSafeInteger(height) || height < 1 ||
    Number(resp.width) !== width || Number(resp.height) !== height) {
  throw new Error(`Migration ${migrationId}: dimensões da mídia virtual divergentes.`);
}

return [{
  json: {
    ...origem,
    wp_media_id_virtual: attachmentId,
    media_virtual_url: resp.secure_url,
    storage_url: origem.storage_url,
    cloudinary_url: origem.storage_provider === 'cloudinary' ? origem.storage_url : null,
    virtual_existing: Boolean(resp.existing),
    virtual_provider: origem.storage_provider,
    virtual_sha256: resp.sha256,
    virtual_public_id: resp.public_id,
    virtual_asset_id: resp.asset_id ?? null
  }
}];
