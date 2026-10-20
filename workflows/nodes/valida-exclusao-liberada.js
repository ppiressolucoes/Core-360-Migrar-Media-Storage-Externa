const medias = $input.all();
const contextos = $('Valida | Featured Atual').all();
const porMedia = new Map();

for (const item of contextos) {
  const ctx = item.json;
  const id = Number(ctx.wp_media_id_virtual);
  if (!Number.isSafeInteger(id) || id <= 0 || porMedia.has(id)) {
    throw new Error(`Mídia virtual ${ctx.wp_media_id_virtual}: contexto duplicado ou inválido.`);
  }
  porMedia.set(id, ctx);
}

function mesmoAsset(canonical, served, provider) {
  if (!canonical.startsWith('https://') || !served.startsWith('https://')) return false;
  if (canonical === served) return true;
  if (provider !== 'cloudinary') return false;

  // WP pode servir esta variante responsiva do mesmo objeto Cloudinary.
  const original = canonical.match(
    /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/image\/upload\/(v\d+\/[^?#]+)$/i
  );
  const variante = served.match(
    /^https:\/\/res\.cloudinary\.com\/([a-z0-9_-]+)\/image\/upload\/c_limit,w_\d+\/(v\d+\/[^?#]+)$/i
  );
  return Boolean(original && variante &&
    original[1] === variante[1] && original[2] === variante[2]);
}

return medias.map(item => {
  const media = item.json?.body ?? item.json;
  const mediaId = Number(media.id);
  const ctx = porMedia.get(mediaId);
  if (!ctx) throw new Error(`Mídia virtual ${mediaId}: contexto da migração não encontrado.`);

  const migrationId = Number(ctx.migration_id);
  const postId = Number(ctx.post_id);
  const originalId = Number(ctx.wp_media_id_original);
  const virtualId = Number(ctx.wp_media_id_virtual);
  if ([migrationId, postId, originalId, virtualId].some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error(`Migration ${ctx.migration_id}: IDs inválidos para liberar exclusão.`);
  }

  const provider = String(ctx.storage_provider ?? '').trim();
  const esperado = String(ctx.storage_url ?? '').trim();
  const atual = String(media.source_url ?? '').trim();
  const motivos = [];
  if (ctx.associacao_wp_confirmada !== true || ctx.associacao_validada !== true) {
    motivos.push('ASSOCIACAO_WP_NAO_CONFIRMADA');
  }
  if (mediaId !== virtualId) motivos.push('ID_VIRTUAL_DIVERGENTE');
  if (originalId === virtualId) motivos.push('ORIGINAL_IGUAL_VIRTUAL');
  if (!/^[a-z0-9_]{1,100}$/.test(provider) || !mesmoAsset(esperado, atual, provider)) {
    motivos.push('URL_STORAGE_DIVERGENTE');
  }

  const liberado = motivos.length === 0;
  return {json: {
    ...ctx,
    migration_id: migrationId,
    post_id: postId,
    wp_media_id_original: originalId,
    wp_media_id_virtual: virtualId,
    storage_provider: provider,
    storage_url: esperado,
    media_virtual_url: atual,
    exclusao_liberada: liberado,
    motivo_bloqueio: liberado ? null : motivos.join(' | ')
  }};
});
