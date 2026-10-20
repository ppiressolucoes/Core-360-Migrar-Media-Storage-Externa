// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Normaliza | Mídia Virtual Criada
// Extraído do export n8n oficial.

const origem = $('Loop').item.json;
const retorno = $json;
const resp = retorno.body ?? retorno;

const migrationId = Number(origem.migration_id);
const attachmentId = Number(resp.attachment_id);
const statusCode = Number(retorno.statusCode ?? 0);

if (statusCode && (statusCode < 200 || statusCode >= 300)) {
  throw new Error(
    `Migration ${migrationId}: registro WP retornou HTTP ${statusCode}.`
  );
}

if (!Number.isSafeInteger(attachmentId) || attachmentId <= 0) {
  throw new Error(`Migration ${migrationId}: attachment_id inválido.`);
}

const esperado = {
  sha256: origem.sha256,
  provider: origem.storage_provider,
  public_id: origem.storage_key,
  asset_id: origem.storage_asset_id,
  secure_url: origem.storage_url,
};

for (const [campo, valor] of Object.entries(esperado)) {
  if (!valor || String(resp[campo] ?? '') !== String(valor)) {
    throw new Error(
      `Migration ${migrationId}: ${campo} da mídia virtual difere do storage registrado.`
    );
  }
}

const width = Number(origem.storage_width ?? origem.width);
const height = Number(origem.storage_height ?? origem.height);

if (
  !Number.isSafeInteger(width) ||
  width <= 0 ||
  !Number.isSafeInteger(height) ||
  height <= 0 ||
  Number(resp.width) !== width ||
  Number(resp.height) !== height
) {
  throw new Error(
    `Migration ${migrationId}: dimensões da mídia virtual divergentes.`
  );
}

return [{
  json: {
    ...origem,
    wp_media_id_virtual: attachmentId,
    media_virtual_url: resp.secure_url,
    cloudinary_url:
      esperado.provider === 'cloudinary' ? resp.secure_url : null,
    virtual_existing: Boolean(resp.existing),
    virtual_provider: resp.provider,
    virtual_sha256: resp.sha256,
    virtual_public_id: resp.public_id,
    virtual_asset_id: resp.asset_id,
  },
}];
