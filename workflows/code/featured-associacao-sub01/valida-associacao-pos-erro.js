// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Valida | Associação Pós-Erro
// Extraído do export n8n oficial.

const respostas = $input.all();
const contextos = $('Wait | Recuperação WP').all();

if (respostas.length !== contextos.length) {
  throw new Error(
    `Quantidade incompatível: ${respostas.length} respostas ` +
    `para ${contextos.length} contextos de recuperação`
  );
}

return respostas.map((item, index) => {
  const resp = item.json;
  const ctx = contextos[index].json;

  const statusCode = Number(resp.statusCode ?? 0);
  const body = resp.body ?? {};

  const originStatus = Number(
    body?.origin_status ??
    statusCode ??
    0
  );

  const postId = Number(
    body?.id ??
    ctx.post_id
  );

  const featuredAtual = Number(
    body?.featured_media ?? 0
  );

  const featuredEsperado = Number(
    ctx.wp_media_id_virtual
  );

  let resultado = 'ERRO_VALIDACAO';

  // GET funcionou e a associação realmente existe
  if (
    statusCode === 200 &&
    postId === Number(ctx.post_id) &&
    featuredAtual === featuredEsperado
  ) {
    resultado = 'ASSOCIADO';
  }

  // GET funcionou, mas o post ainda não aponta para a virtual
  else if (statusCode === 200) {
    resultado = 'NAO_ASSOCIADO';
  }

  // O próprio GET também sofreu bloqueio transitório
  else if (
    statusCode === 403 ||
    originStatus === 403 ||
    statusCode === 429 ||
    originStatus === 429
  ) {
    resultado = 'BLOQUEIO_PERSISTENTE';
  }

  return {
    json: {
      // Preserva todo o contexto anterior para eventual retry
      ...ctx,

      post_id: Number(ctx.post_id),
      wp_media_id_original: Number(ctx.wp_media_id_original),
      wp_media_id_virtual: featuredEsperado,

      featured_media_atual: featuredAtual || null,

      resultado_pos_erro: resultado,

      http_status_validacao: statusCode,
      origin_status_validacao: originStatus || null,

      associacao_confirmada:
        resultado === 'ASSOCIADO'
    }
  };
});
