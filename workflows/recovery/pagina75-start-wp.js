// Code node (Run Once for All Items) de um workflow manual que chama
// PEL | Featured Associação WP | Sub Fluxo. Comece somente pela 473.
const idsParaExecutar = new Set([473]);

const candidatosPagina = [
  { post_id: 6644, wp_media_id: 6645 },
  { post_id: 6646, wp_media_id: 6667 },
  { post_id: 6691, wp_media_id: 6695 },
  { post_id: 6697, wp_media_id: 6699 },
  { post_id: 6705, wp_media_id: 6711 },
  { post_id: 6714, wp_media_id: 6722 },
];

const registros = [
  {
    migration_id: 473,
    post_id: 6644,
    wp_media_id_original: 6645,
    original_url: 'https://energialimpa.live/wp-content/uploads/2024/03/hqdefault-2.jpg',
    sha256: '8f633d1bb30db50683129735714deea96552160b7c4140f1a258578441949abe',
    storage_provider: 'cloudflare_r2',
    storage_key: 'pel/featured/8f633d1bb30db50683129735714deea96552160b7c4140f1a258578441949abe',
    storage_url: 'https://pub-4fc4737db70147a8bec050dd7fb883d7.r2.dev/pel/featured/8f633d1bb30db50683129735714deea96552160b7c4140f1a258578441949abe.jpg',
    storage_asset_id: '8f633d1bb30db50683129735714deea96552160b7c4140f1a258578441949abe',
    storage_mime_type: 'image/jpeg',
    width: 480,
    height: 360,
  },
  {
    migration_id: 474,
    post_id: 6646,
    wp_media_id_original: 6667,
    original_url: 'https://energialimpa.live/wp-content/uploads/2024/03/Energia-solar-um-otimo-investimento-em-longo-prazo.jpg',
    sha256: '20c6a423ca7c5c069fd302f652fd7e55bd52e51eaa28b50addce4b0f767a59c4',
    storage_provider: 'cloudflare_r2',
    storage_key: 'pel/featured/20c6a423ca7c5c069fd302f652fd7e55bd52e51eaa28b50addce4b0f767a59c4',
    storage_url: 'https://pub-43dc3ba28cba479abf3287dc11405d82.r2.dev/pel/featured/20c6a423ca7c5c069fd302f652fd7e55bd52e51eaa28b50addce4b0f767a59c4.jpg',
    storage_asset_id: '20c6a423ca7c5c069fd302f652fd7e55bd52e51eaa28b50addce4b0f767a59c4',
    storage_mime_type: 'image/jpeg',
    width: 840,
    height: 560,
  },
  {
    migration_id: 475,
    post_id: 6691,
    wp_media_id_original: 6695,
    original_url: 'https://energialimpa.live/wp-content/uploads/2024/03/Acao-do-TCU-entidades-defendem-legalidade-da-geracao-de-energia-compartilhada.jpg',
    sha256: '8f42fbcb4b5d104fbdb2df5939d4b2cbd06dcb738079cc28a77387eee37eba68',
    storage_provider: 'cloudinary',
    storage_key: 'pel/featured/8f42fbcb4b5d104fbdb2df5939d4b2cbd06dcb738079cc28a77387eee37eba68',
    storage_url: 'https://res.cloudinary.com/yezowpnj/image/upload/v1792451454/pel/featured/8f42fbcb4b5d104fbdb2df5939d4b2cbd06dcb738079cc28a77387eee37eba68.jpg',
    storage_asset_id: 'c5341e2eef0ab116513a8979422329e9',
    storage_mime_type: 'image/jpeg',
    width: 840,
    height: 560,
  },
];

if (idsParaExecutar.size === 0 || registros.filter(row => idsParaExecutar.has(row.migration_id)).length !== idsParaExecutar.size) {
  throw new Error('IDs de retomada ausentes ou inválidos.');
}

return registros
  .filter(row => idsParaExecutar.has(row.migration_id))
  .map(row => {
    if (!/^[a-f0-9]{64}$/.test(row.sha256) ||
        row.storage_key !== `pel/featured/${row.sha256}` ||
        !row.storage_url.startsWith('https://') ||
        !row.storage_url.includes(`${row.storage_key}.jpg`)) {
      throw new Error(`Migration ${row.migration_id}: storage inválido.`);
    }

    return { json: {
      ...row,
      cloudinary_cloud_name: row.storage_provider === 'cloudinary' ? 'yezowpnj' : null,
      cloudinary_public_id: row.storage_provider === 'cloudinary' ? row.storage_key : null,
      cloudinary_url: row.storage_provider === 'cloudinary' ? row.storage_url : null,
      cloudinary_asset_id: row.storage_provider === 'cloudinary' ? row.storage_asset_id : null,
      format: 'jpg',
      pagina_processada: 75,
      ultimo_post_pagina: 6714,
      candidatos_pagina: candidatosPagina,
    } };
  });
