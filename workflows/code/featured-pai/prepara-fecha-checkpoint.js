// Workflow: PEL | Migração Featured IMG | PAI
// Node: Prepara | Fecha Checkpoint
// Extraído do export n8n oficial.

const origem = $('Monta | Candidatos [5]').first().json;

if (!Array.isArray(origem.candidatos) || origem.candidatos.length === 0) {
  throw new Error('Candidatos da página não encontrados.');
}

if (!origem.pagina_processada) {
  throw new Error('pagina_processada não encontrada.');
}

if (!origem.ultimo_post_pagina) {
  throw new Error('ultimo_post_pagina não encontrado.');
}

return [
  {
    json: {
      candidatos: origem.candidatos.map(item => ({
        post_id: Number(item.post_id),
        wp_media_id: Number(item.wp_media_id)
      })),

      pagina_processada: Number(origem.pagina_processada),
      ultimo_post_pagina: Number(origem.ultimo_post_pagina),

      total_candidatos: origem.candidatos.length
    }
  }
];
