// Workflow: PEL | Migração Featured IMG | PAI
// Node: Recupera | Lote Cloudinary
// Extraído do export n8n oficial.

const lote = $('Monta | Lote Uploads').first().json;
const checkpoint = $('Monta | Candidatos [5]').first().json;

// ---------------------------------------------------------
// 1. Valida lote Cloudinary
// ---------------------------------------------------------

if (!lote?.uploads || !Array.isArray(lote.uploads)) {
  throw new Error('Lote de uploads Cloudinary não encontrado.');
}

if (lote.uploads.length === 0) {
  throw new Error('Lote Cloudinary vazio.');
}

// ---------------------------------------------------------
// 2. Valida contexto da página / checkpoint
// ---------------------------------------------------------

const paginaProcessada = Number(checkpoint.pagina_processada);
const ultimoPostPagina = Number(checkpoint.ultimo_post_pagina);

if (!paginaProcessada) {
  throw new Error('pagina_processada inválida ou não encontrada.');
}

if (!ultimoPostPagina) {
  throw new Error('ultimo_post_pagina inválido ou não encontrado.');
}

if (
  !Array.isArray(checkpoint.candidatos) ||
  checkpoint.candidatos.length === 0
) {
  throw new Error('Lista candidatos da página não encontrada.');
}

// Normaliza o contrato que será enviado ao subfluxo
const candidatosPagina = checkpoint.candidatos.map(item => ({
  post_id: Number(item.post_id),
  wp_media_id: Number(item.wp_media_id)
}));

// ---------------------------------------------------------
// 3. Recupera lote Cloudinary
// ---------------------------------------------------------

const mapa = new Map();

for (const row of lote.uploads) {
  const migrationId = Number(row.migration_id);

  if (!migrationId) {
    throw new Error('migration_id inválido no lote Cloudinary.');
  }

  mapa.set(migrationId, {
    migration_id: migrationId,
    post_id: Number(row.post_id),
    wp_media_id_original: Number(row.wp_media_id),

    original_url: row.original_url,
    sha256: row.sha256,

    cloudinary_cloud_name: row.cloudinary_cloud_name,
    cloudinary_public_id: row.cloudinary_public_id,
    cloudinary_url: row.cloudinary_url,
    cloudinary_asset_id: row.cloudinary_asset_id ?? null,

    width: row.cloudinary_width ?? null,
    height: row.cloudinary_height ?? null,
    format: row.cloudinary_format ?? null,

    // -----------------------------------------------------
    // Contexto da página para fechamento do checkpoint
    // -----------------------------------------------------
    pagina_processada: paginaProcessada,
    ultimo_post_pagina: ultimoPostPagina,
    candidatos_pagina: candidatosPagina
  });
}

// ---------------------------------------------------------
// 4. Retorno para o Sub Fluxo
// ---------------------------------------------------------

return [...mapa.values()]
  .sort((a, b) => a.migration_id - b.migration_id)
  .map(row => ({ json: row }));
