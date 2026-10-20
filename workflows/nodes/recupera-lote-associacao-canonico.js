const entrada = $('Start WP').all();
const origens = new Map();

for (const item of entrada) {
  const origem = item.json;
  const migrationId = Number(origem.migration_id);
  if (!Number.isSafeInteger(migrationId) || migrationId <= 0 || origens.has(migrationId)) {
    throw new Error(`Migration ${origem.migration_id}: entrada inválida ou duplicada em Start WP.`);
  }
  origens.set(migrationId, origem);
}

const itensConfirmados = [];
for (let runIndex = 0; runIndex < entrada.length; runIndex++) {
  try {
    const itensRun = $('Normaliza | Associação Confirmada').all(0, runIndex);
    if (Array.isArray(itensRun)) itensConfirmados.push(...itensRun);
  } catch {
    // A iteração pode ter seguido pelo ramo de erro.
  }
}

const mapa = new Map();
for (const item of itensConfirmados) {
  const x = item.json;
  if (x.associacao_wp_confirmada !== true) continue;

  const migrationId = Number(x.migration_id);
  const postId = Number(x.post_id);
  const originalId = Number(x.wp_media_id_original);
  const virtualId = Number(x.wp_media_id_virtual);
  if ([migrationId, postId, originalId, virtualId].some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error(`Migration ${migrationId}: identificadores inválidos na associação.`);
  }

  const origem = origens.get(migrationId);
  if (!origem || Number(origem.post_id) !== postId ||
      Number(origem.wp_media_id_original) !== originalId) {
    throw new Error(`Migration ${migrationId}: associação difere de Start WP.`);
  }

  const provider = String(origem.storage_provider ?? '').trim();
  const storageUrl = String(origem.storage_url ?? '').trim();
  if (!/^[a-z0-9_]{1,100}$/.test(provider) ||
      !/^https:\/\/[^/\s]+\/\S+$/.test(storageUrl)) {
    throw new Error(`Migration ${migrationId}: storage canônico ausente ou inválido.`);
  }
  if ((x.storage_provider != null && String(x.storage_provider) !== provider) ||
      (x.storage_url != null && String(x.storage_url) !== storageUrl)) {
    throw new Error(`Migration ${migrationId}: storage da associação divergente.`);
  }

  const anterior = mapa.get(migrationId);
  if (anterior && anterior.wp_media_id_virtual !== virtualId) {
    throw new Error(`Migration ${migrationId}: mídias virtuais conflitantes.`);
  }
  mapa.set(migrationId, {
    migration_id: migrationId,
    post_id: postId,
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: storageUrl,
    associacao_wp_confirmada: true,
    tem_associacao_confirmada: true
  });
}

if (mapa.size === 0) {
  return [{json: {tem_associacao_confirmada: false, total_associacoes_confirmadas: 0}}];
}
return [...mapa.values()]
  .sort((a, b) => a.migration_id - b.migration_id)
  .map(json => ({json}));
