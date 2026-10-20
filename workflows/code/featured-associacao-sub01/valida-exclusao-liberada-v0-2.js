// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Valida | Exclusão Liberada v0.2
// Extraído do export n8n oficial.

const respostas = $input.all();
const contextos = $('Valida | Featured Atual v0.3').all();

const porMidiaVirtual = new Map(
  contextos.map(item => [
    Number(item.json.wp_media_id_virtual),
    item.json
  ])
);

function mesmaMidiaCloudinary(canonica, servida) {
  if (canonica === servida) return true;

  const original = canonica.match(
    /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/image\/upload\/(v\d+\/[^?#]+)$/i
  );

  const variante = servida.match(
    /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/image\/upload\/c_limit,w_\d+\/(v\d+\/[^?#]+)$/i
  );

  return Boolean(
    original &&
    variante &&
    original[1] === variante[1] &&
    original[2] === variante[2]
  );
}

return respostas.map(item => {
  const media =
    item.json?.body && typeof item.json.body === 'object'
      ? item.json.body
      : item.json;

  const mediaId = Number(media.id);
  const ctx = porMidiaVirtual.get(mediaId);

  if (!ctx) {
    throw new Error(
      `Mídia virtual ${mediaId}: contexto da migração não encontrado.`
    );
  }

  const migrationId = Number(ctx.migration_id);
  const postId = Number(ctx.post_id);
  const originalId = Number(ctx.wp_media_id_original);
  const virtualId = Number(ctx.wp_media_id_virtual);
  const provider = String(ctx.storage_provider ?? '').trim();
  const storageUrl = String(ctx.storage_url ?? '').trim();
  const mediaUrl = String(media.source_url ?? '').trim();

  if (
    !Number.isSafeInteger(migrationId) || migrationId <= 0 ||
    !Number.isSafeInteger(postId) || postId <= 0 ||
    !Number.isSafeInteger(originalId) || originalId <= 0 ||
    !Number.isSafeInteger(virtualId) || virtualId <= 0
  ) {
    throw new Error(
      `Migration ${migrationId}: IDs inválidos na liberação de exclusão.`
    );
  }

  const associacaoConfirmada =
    ctx.associacao_wp_confirmada === true &&
    ctx.associacao_validada === true;

  const idVirtualCorreto = mediaId === virtualId;
  const idsDistintos = originalId !== virtualId;
  const providerValido = /^[a-z0-9_]{1,100}$/.test(provider);

  let urlValida = false;

  if (
    providerValido &&
    /^https:\/\/[^/\s]+\/\S+$/.test(storageUrl) &&
    /^https:\/\/[^/\s]+\/\S+$/.test(mediaUrl)
  ) {
    urlValida = provider === 'cloudinary'
      ? mesmaMidiaCloudinary(storageUrl, mediaUrl)
      : mediaUrl === storageUrl;
  }

  const motivos = [];

  if (!associacaoConfirmada) {
    motivos.push('ASSOCIACAO_WP_NAO_CONFIRMADA');
  }

  if (!idVirtualCorreto) {
    motivos.push('ID_VIRTUAL_DIVERGENTE');
  }

  if (!idsDistintos) {
    motivos.push('ORIGINAL_IGUAL_VIRTUAL');
  }

  if (!providerValido) {
    motivos.push('STORAGE_PROVIDER_INVALIDO');
  }

  if (!urlValida) {
    motivos.push('URL_STORAGE_DIVERGENTE');
  }

  const liberado = motivos.length === 0;

  return {
    json: {
      ...ctx,
      migration_id: migrationId,
      post_id: postId,
      wp_media_id_original: originalId,
      wp_media_id_virtual: virtualId,
      storage_provider: provider,
      storage_url: storageUrl,
      media_virtual_url: mediaUrl,
      associacao_wp_confirmada: associacaoConfirmada,
      exclusao_liberada: liberado,
      motivo_bloqueio: liberado ? null : motivos.join(' | ')
    }
  };
});
