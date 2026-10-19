const medias = $input.all();
const contextos = $('Valida | Featured Atual').all();

// Contexto indexado pela mídia virtual
const mapa = new Map(
  contextos.map(item => [
    Number(item.json.wp_media_id_virtual),
    item.json
  ])
);

return medias.map(item => {

  // Compatível com HTTP Request com ou sem response wrapper
  const media =
    item.json?.body &&
    typeof item.json.body === 'object'
      ? item.json.body
      : item.json;

  const mediaId = Number(media.id);

  const ctx = mapa.get(mediaId);

  if (!ctx) {
    throw new Error(
      `Mídia virtual ${mediaId}: contexto da migração não encontrado`
    );
  }

  const migrationId = Number(ctx.migration_id);
  const postId = Number(ctx.post_id);
  const originalId = Number(ctx.wp_media_id_original);
  const virtualId = Number(ctx.wp_media_id_virtual);

  if (
    !migrationId ||
    !postId ||
    !originalId ||
    !virtualId
  ) {
    throw new Error(
      `Contexto inválido na liberação de exclusão | ` +
      `migration=${ctx.migration_id} | ` +
      `post=${ctx.post_id} | ` +
      `original=${ctx.wp_media_id_original} | ` +
      `virtual=${ctx.wp_media_id_virtual}`
    );
  }

  // URL canônica da migration
  const esperado = String(
    ctx.storage_url || ''
  );

  // URL real do attachment virtual WP
  const atual = String(
    media.source_url || ''
  );

  // Barreiras
const associacaoConfirmada =
  ctx.associacao_wp_confirmada === true ||
  ctx.associacao_validada === true;

  const idVirtualCorreto =
    mediaId === virtualId;

  const idsDistintos =
    originalId !== virtualId;

  const provider = String(ctx.storage_provider || '').trim();
  const providerValido = provider.length > 0 && provider.length <= 100;

  // O WordPress pode servir uma variante responsiva do mesmo asset Cloudinary.
  // Somente a transformação c_limit,w_N, antes da versão, é aceita. Outros
  // providers continuam exigindo a URL canônica exata.
  const mesmoAsset = (canonical, served, storageProvider) => {
    if (!canonical.startsWith('https://') || !served.startsWith('https://')) {
      return false;
    }
    if (canonical === served) return true;
    if (storageProvider !== 'cloudinary') return false;

    try {
      const original = new URL(canonical);
      const virtual = new URL(served);
      if (original.hostname !== 'res.cloudinary.com' ||
          virtual.origin !== original.origin ||
          original.search || virtual.search || original.hash || virtual.hash ||
          !/^\/[^/]+\/image\/upload\/v\d+\/.+/.test(original.pathname)) {
        return false;
      }
      const normalized = virtual.pathname.replace(
        /^(\/[^/]+\/image\/upload\/)c_limit,w_\d+\/(?=v\d+\/)/,
        '$1'
      );
      return normalized !== virtual.pathname && normalized === original.pathname;
    } catch {
      return false;
    }
  };

  const urlDoProvider = providerValido && mesmoAsset(esperado, atual, provider);

  const liberado =
    associacaoConfirmada &&
    idVirtualCorreto &&
    idsDistintos &&
    urlDoProvider;

  const motivos = [];

  if (!associacaoConfirmada) {
    motivos.push(
      'ASSOCIACAO_WP_NAO_CONFIRMADA'
    );
  }

  if (!idVirtualCorreto) {
    motivos.push(
      'ID_VIRTUAL_DIVERGENTE'
    );
  }

  if (!idsDistintos) {
    motivos.push(
      'ORIGINAL_IGUAL_VIRTUAL'
    );
  }

  if (!urlDoProvider) {
    motivos.push(
      'URL_STORAGE_DIVERGENTE'
    );
  }

  return {
    json: {

      // Preserva contexto completo
      ...ctx,

      migration_id: migrationId,
      post_id: postId,

      wp_media_id_original:
        originalId,

      wp_media_id_virtual:
        virtualId,

      // Canônica da migration
      storage_url:
        esperado,

      // URL usada pelo WP
      media_virtual_url:
        atual,

      associacao_wp_confirmada:
        associacaoConfirmada,

      exclusao_liberada:
        liberado,

      motivo_bloqueio:
        liberado
          ? null
          : motivos.join(' | ')
    }
  };
});
