// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Normaliza | Falha Associação WP
// Extraído do export n8n oficial.

const itens = $input.all();

return itens.map(item => {
  const x = item.json;

  const migrationId = Number(x.migration_id);
  const postId = Number(x.post_id);

  const originalId = Number(
    x.wp_media_id_original ?? 0
  );

  const virtualId = Number(
    x.wp_media_id_virtual ??
    x.external_attachment_id ??
    x.attachment_id ??
    0
  );

  if (!migrationId || !postId || !originalId) {
    throw new Error(
      `Contexto incompleto para registrar falha. ` +
      `migration=${x.migration_id}, post=${x.post_id}`
    );
  }

  // Identifica de qual ponto do tratamento veio a falha
  const motivo =
    x.resultado_retry ??
    x.resultado_pos_erro ??
    x.resultado_associacao ??
    'ERRO_ASSOCIACAO_WP';

  const httpStatus = Number(
    x.http_status_retry ??
    x.http_status_validacao ??
    x.http_status ??
    0
  ) || null;

  const originStatus = Number(
    x.origin_status_retry ??
    x.origin_status_validacao ??
    x.origin_status ??
    0
  ) || null;

  const detalhe =
    x.erro_retry ??
    x.erro_resumo ??
    null;

  const mensagem = [
    motivo,
    httpStatus ? `HTTP=${httpStatus}` : null,
    originStatus ? `ORIGIN=${originStatus}` : null,
    detalhe
  ]
    .filter(Boolean)
    .join(' | ')
    .slice(0, 1000);

  return {
    json: {
      migration_id: migrationId,
      post_id: postId,
      wp_media_id_original: originalId,

      wp_media_id_virtual:
        virtualId > 0 ? virtualId : null,

      cloudinary_url:
        x.cloudinary_url ?? null,

      status_destino: 'ERROR',

      motivo_erro: motivo,
      http_status: httpStatus,
      origin_status: originStatus,
      error_message: mensagem
    }
  };
});
