// Entrada pontual para o Sub 01 da pagina 132; usar em um Code node
// (Run Once for All Items) de um workflow manual que chama o Sub 01.
// Base: saidas confirmadas de Consolida | Resultado Upload e leitura do
// storage canonico em 2026-11-09. Nao executa download nem novo upload.
// Antes de acionar o Sub 01, confirmar que 800 esta SKIPPED e que 798/799
// permanecem PROCESSING com estes mesmos valores no banco ativo.

const candidatos_pagina = [
  { post_id: 11358, wp_media_id: 11382 },
  { post_id: 11365, wp_media_id: 11373 },
  { post_id: 11380, wp_media_id: 11400 },
];

const entradas = [
  {
    migration_id: 798,
    post_id: 11358,
    wp_media_id_original: 11382,
    original_url: 'https://energialimpa.live/wp-content/uploads/2024/08/Nova-placa-solar-feita-com-sementes-de-arroz-vai-mudar-tudo-1.jpg',
    sha256: 'e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8',
    storage_provider: 'cloudinary',
    storage_key: 'pel/featured/e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8',
    storage_url: 'https://res.cloudinary.com/zdzn0kgm/image/upload/v1794231178/pel/featured/e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8.jpg',
    storage_asset_id: 'af2afbd86ed3c90c6f112e0ce7c10700',
    storage_mime_type: 'image/jpeg',
    storage_width: 840,
    storage_height: 560,
    width: 840,
    height: 560,
    format: 'jpg',
    cloudinary_cloud_name: 'zdzn0kgm',
    cloudinary_public_id: 'pel/featured/e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8',
    cloudinary_url: 'https://res.cloudinary.com/zdzn0kgm/image/upload/v1794231178/pel/featured/e04a8cebf8cc65e8171e80ed7629dcc2313d669b814c9fc75f750674525595d8.jpg',
    cloudinary_asset_id: 'af2afbd86ed3c90c6f112e0ce7c10700',
  },
  {
    migration_id: 799,
    post_id: 11365,
    wp_media_id_original: 11373,
    original_url: 'https://energialimpa.live/wp-content/uploads/2024/08/Procon-investiga-Equatorial-PI-por-cobrancas-indevidas-em-Energia-Solar.jpg',
    sha256: 'ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826',
    storage_provider: 'cloudflare_r2',
    storage_key: 'pel/featured/ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826',
    storage_url: 'https://pub-bcab0fcb78004202b92d225c4ee2e3d4.r2.dev/pel/featured/ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826.jpg',
    storage_asset_id: 'ad9097088356bda9210f29a8a125b2f1d25fcd5dd3d87e3e9f00ef06d08ed826',
    storage_mime_type: 'image/jpeg',
    storage_width: 840,
    storage_height: 560,
    width: 840,
    height: 560,
    format: 'jpg',
    cloudinary_cloud_name: null,
    cloudinary_public_id: null,
    cloudinary_url: null,
    cloudinary_asset_id: null,
  },
];

if (entradas.map(x => x.migration_id).join(',') !== '798,799') {
  throw new Error('Lote de retomada inesperado.');
}

for (const item of entradas) {
  if (!/^[a-f0-9]{64}$/.test(item.sha256) ||
      item.storage_key !== `pel/featured/${item.sha256}` ||
      !item.storage_url.startsWith('https://')) {
    throw new Error(`Contrato invalido para migration ${item.migration_id}.`);
  }
}

return entradas.map(item => ({
  json: {
    ...item,
    storage_canonico_reutilizado: false,
    storage_upload_divergencias: [],
    storage_upload_nao_canonico: null,
    pagina_processada: 132,
    ultimo_post_pagina: 11402,
    candidatos_pagina,
  },
}));
