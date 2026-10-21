// Node: Monta | Lote Conclusão
// Mode: Run Once for All Items
// Atualização pendente de incorporação ao próximo export do Sub 02.
// Somente auditorias 404/rest_post_invalid_id podem chegar à SP de conclusão.

const esperados = $('Recupera | Lote Auditoria Final').all();

if (esperados.length === 0) {
  throw new Error('Nenhum item esperado para conclusão do lote.');
}

const confirmados = [];
const nodesConfirmacao = [
  'Classifica | Auditoria Final',
  'Valida | Retry Auditoria Final',
];

// Os nodes de auditoria executam em runIndex diferentes dentro do loop.
for (const nodeName of nodesConfirmacao) {
  for (let runIndex = 0; runIndex < esperados.length; runIndex++) {
    try {
      const itensRun = $(nodeName).all(0, runIndex);

      if (Array.isArray(itensRun)) {
        confirmados.push(...itensRun);
      }
    } catch {
      // O node pode não ter executado nesta iteração.
    }
  }
}

const mapaEsperados = new Map();

for (const item of esperados) {
  const x = item.json;
  const migrationId = Number(x.migration_id);

  if (!Number.isSafeInteger(migrationId) || migrationId <= 0) {
    throw new Error('Lote de auditoria contém migration_id inválido.');
  }

  if (mapaEsperados.has(migrationId)) {
    throw new Error(`Migration ${migrationId}: duplicada no lote de auditoria.`);
  }

  mapaEsperados.set(migrationId, x);
}

const mapaConfirmados = new Map();

for (const item of confirmados) {
  const x = item.json;

  if (
    x.auditoria_confirmada !== true ||
    x.auditoria_status !== 'EXCLUIDA' ||
    Number(x.auditoria_http_status) !== 404 ||
    x.auditoria_origin_code !== 'rest_post_invalid_id'
  ) {
    continue;
  }

  const migrationId = Number(x.migration_id);
  const postId = Number(x.post_id);
  const originalId = Number(x.wp_media_id_original);
  const virtualId = Number(x.wp_media_id_virtual);
  const provider = String(x.storage_provider ?? '').trim();
  const storageUrl = String(x.storage_url ?? '').trim();
  const esperado = mapaEsperados.get(migrationId);

  if (!esperado) {
    throw new Error(
      `Migration ${migrationId}: auditoria não pertence ao lote atual.`
    );
  }

  if (
    !Number.isSafeInteger(migrationId) || migrationId <= 0 ||
    !Number.isSafeInteger(postId) || postId <= 0 ||
    !Number.isSafeInteger(originalId) || originalId <= 0 ||
    !Number.isSafeInteger(virtualId) || virtualId <= 0 ||
    !/^[a-z0-9_]{1,100}$/.test(provider) ||
    !/^https:\/\/[^/\s]+\/\S+$/.test(storageUrl)
  ) {
    throw new Error(
      `Migration ${migrationId}: confirmação de auditoria incompleta.`
    );
  }

  if (
    Number(esperado.post_id) !== postId ||
    Number(esperado.wp_media_id_original) !== originalId ||
    Number(esperado.wp_media_id_virtual) !== virtualId ||
    String(esperado.storage_provider ?? '').trim() !== provider ||
    String(esperado.storage_url ?? '').trim() !== storageUrl
  ) {
    throw new Error(
      `Migration ${migrationId}: auditoria diverge do lote esperado.`
    );
  }

  const anterior = mapaConfirmados.get(migrationId);

  if (
    anterior &&
    (
      anterior.post_id !== postId ||
      anterior.wp_media_id_original !== originalId ||
      anterior.wp_media_id_virtual !== virtualId
    )
  ) {
    throw new Error(
      `Migration ${migrationId}: confirmações de auditoria conflitantes.`
    );
  }

  mapaConfirmados.set(migrationId, {
    migration_id: migrationId,
    post_id: postId,
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: storageUrl,
  });
}

const pendentes = [...mapaEsperados.keys()]
  .filter(migrationId => !mapaConfirmados.has(migrationId))
  .sort((a, b) => a - b);

if (pendentes.length > 0) {
  throw new Error(
    `Conclusão bloqueada: auditoria final não confirmada para migrations ` +
    `${pendentes.join(', ')}.`
  );
}

const lote = [...mapaConfirmados.values()]
  .sort((a, b) => a.migration_id - b.migration_id);

if (lote.length !== esperados.length) {
  throw new Error(
    `Conclusão bloqueada: esperados=${esperados.length}, ` +
    `confirmados=${lote.length}.`
  );
}

return [{
  json: {
    total: lote.length,
    lote,
  },
}];
