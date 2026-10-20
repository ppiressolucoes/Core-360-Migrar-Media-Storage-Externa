// Workflow: PEL | Migração Featured IMG | PAI
// Node: Normaliza | Lote Reservado
// Extraído do export n8n oficial.

const items = $input.all();
const reservados = [];

// Contexto da página que originou esta reserva
const contextoPagina = $('Monta | Candidatos [5]').first().json;

function procurar(value) {
  if (Array.isArray(value)) {
    for (const v of value) procurar(v);
    return;
  }

  if (
    value &&
    typeof value === 'object' &&
    value.post_id !== undefined &&
    value.wp_media_id !== undefined &&
    value.migration_id !== undefined
  ) {
    reservados.push(value);
  }
}

for (const item of items) {
  procurar(item.json);
}

/*
  Nenhuma migração elegível.
  Não é erro: encerra o ciclo normalmente.
*/
if (reservados.length === 0) {
  return [{
    json: {
      tem_reserva: false,
      total_reservado: 0,
      etapa: 'SEM_CANDIDATOS_ELEGIVEIS',

      // Contexto da página permanece disponível
      pagina_processada: Number(contextoPagina.pagina_processada),
      per_page: Number(contextoPagina.per_page),
      ultimo_post_pagina: Number(contextoPagina.ultimo_post_pagina),
      total_candidatos: Number(contextoPagina.total_candidatos)
    }
  }];
}

return reservados.map(row => ({
  json: {
    tem_reserva: true,
    total_reservado: reservados.length,

    migration_id: Number(row.migration_id),
    ordem: Number(row.ordem),
    post_id: Number(row.post_id),
    wp_media_id: Number(row.wp_media_id),

    status: row.status,
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,

    // Contexto da página
    pagina_processada: Number(contextoPagina.pagina_processada),
    per_page: Number(contextoPagina.per_page),
    ultimo_post_pagina: Number(contextoPagina.ultimo_post_pagina),
    total_candidatos: Number(contextoPagina.total_candidatos)
  }
}));
