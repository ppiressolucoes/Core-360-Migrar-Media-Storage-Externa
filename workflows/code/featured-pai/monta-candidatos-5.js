// Workflow: PEL | Migração Featured IMG | PAI
// Node: Monta | Candidatos [5]
// Extraído do export n8n oficial.

const posts = $input.all();

// Recupera o checkpoint que originou esta busca
const checkpoint = $('DB | Ponteiro Migração').first().json;

const candidatos = posts
  .filter(item =>
    item.json.id &&
    item.json.featured_media &&
    Number(item.json.featured_media) > 0
  )
  .map(item => ({
    post_id: Number(item.json.id),
    wp_media_id: Number(item.json.featured_media)
  }));

// Último post efetivamente recebido nesta página.
// Importante: usa todos os posts da página, não apenas os candidatos
// que possuem featured_media.
const ultimoPostPagina = posts.length
  ? Number(posts[posts.length - 1].json.id)
  : null;

// Limite operacional controlado pelo banco
const limiteExecucao = Number(checkpoint.limite_execucao);

if (!limiteExecucao || limiteExecucao < 1) {
  throw new Error(
    `limite_execucao inválido no checkpoint: ${checkpoint.limite_execucao}`
  );
}

return [
  {
    json: {
      candidatos,

      // Quantidade máxima que a SP poderá reservar nesta execução
      limite: limiteExecucao,

      total_candidatos: candidatos.length,

      pagina_processada: Number(checkpoint.pagina_atual),

      // Tamanho da página consultada no WordPress
      per_page: Number(checkpoint.per_page),

      // Mantido também para rastreabilidade
      limite_execucao: limiteExecucao,

      ultimo_post_pagina: ultimoPostPagina
    }
  }
];
