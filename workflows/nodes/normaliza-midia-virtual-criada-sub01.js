// Code node "Normaliza | Mídia Virtual Criada" do Sub 01.
// Execute após o POST de registro. Uma resposta existente com o mesmo SHA,
// mas outro storage, não pode ser associada ao post.
const origem = $('Loop').item.json;
const retorno = $json;
const resp = retorno.body ?? retorno;

const migrationId = Number(origem.migration_id);
const attachmentId = Number(resp.attachment_id);
const statusCode = Number(retorno.statusCode ?? 0);

if (!Number.isSafeInteger(migrationId) || migrationId <= 0) {
  throw new Error('migration_id inválido na entrada do Loop.');
}

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
  const esperadoValor = String(valor ?? '').trim();
  const recebidoValor = String(resp[campo] ?? '').trim();

  if (!esperadoValor || recebidoValor !== esperadoValor) {
    const detalhe = resp.existing === true
      ? 'O WordPress reutilizou um attachment de outro storage; corrigir a deduplicação do plugin antes de repetir o registro.'
      : 'Conferir os dados enviados ao endpoint de registro.';
    throw new Error(
      `Migration ${migrationId}: attachment ${attachmentId} divergente em ${campo}; ` +
      `esperado=${esperadoValor || 'AUSENTE'}; recebido=${recebidoValor || 'AUSENTE'}. ${detalhe}`
    );
  }
}

const width = Number(origem.storage_width ?? origem.width);
const height = Number(origem.storage_height ?? origem.height);

if (
  !Number.isSafeInteger(width) || width <= 0 ||
  !Number.isSafeInteger(height) || height <= 0 ||
  Number(resp.width) !== width ||
  Number(resp.height) !== height
) {
  throw new Error(
    `Migration ${migrationId}: attachment ${attachmentId} tem dimensões divergentes; ` +
    `esperado=${width}x${height}; recebido=${resp.width}x${resp.height}.`
  );
}

return [{
  json: {
    ...origem,
    wp_media_id_virtual: attachmentId,
    media_virtual_url: esperado.secure_url,
    cloudinary_url:
      esperado.provider === 'cloudinary' ? esperado.secure_url : null,
    virtual_existing: Boolean(resp.existing),
    virtual_provider: esperado.provider,
    virtual_sha256: esperado.sha256,
    virtual_public_id: esperado.public_id,
    virtual_asset_id: esperado.asset_id,
  },
}];
