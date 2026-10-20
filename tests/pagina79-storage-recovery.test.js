const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(
  __dirname,
  '..',
  'workflows/recovery/pagina79-recupera-lote-repositorio.js'
), 'utf8');

const sha498 = '74b71b38cb9e2cb3093e5595a9d64742d1b96e3f11c033cc422f0357d3119514';
const key498 = `pel/featured/${sha498}`;
const r2Url498 = `https://pub-28e4a7157d8a4d86a25b4ff5b4132517.r2.dev/${key498}.jpg`;
const cloudinaryUrl498 = `https://res.cloudinary.com/gbjn0cjg/image/upload/v1790000000/${key498}.jpg`;

const upload498 = {
  migration_id: 498,
  post_id: 6951,
  wp_media_id: 6952,
  original_url: 'https://energialimpa.live/wp-content/uploads/2024/04/imagem.jpg',
  sha256: sha498,
  storage_provider: 'cloudflare_r2',
  storage_key: key498,
  storage_url: r2Url498,
  storage_asset_id: sha498,
  storage_width: 841,
  storage_height: 560,
  storage_mime_type: 'image/jpeg'
};

const db498 = {
  migration_id: 498,
  post_id: 6951,
  wp_media_id_original: 6952,
  status: 'PROCESSING',
  sha256: sha498,
  storage_provider: 'cloudinary',
  storage_key: key498,
  storage_url: cloudinaryUrl498,
  storage_asset_id: 'e04d4736c28c5442c857046cf84e63ef'
};

function execute(upload, db, inputItems = [{json: db}]) {
  const checkpoint = {
    pagina_processada: 79,
    ultimo_post_pagina: 7000,
    candidatos: [{post_id: upload.post_id, wp_media_id: upload.wp_media_id}]
  };

  return vm.runInNewContext(`(function () {\n${code}\n})()`, {
    $: name => ({
      first: () => ({
        json: name === 'Monta | Lote Uploads'
          ? {uploads: [upload]}
          : checkpoint
      })
    }),
    $input: {all: () => inputItems}
  });
}

test('reutiliza storage Cloudinary canônico quando novo upload do mesmo SHA foi para R2', () => {
  const [result] = execute(upload498, db498);

  assert.equal(result.json.storage_provider, 'cloudinary');
  assert.equal(result.json.storage_url, cloudinaryUrl498);
  assert.equal(result.json.cloudinary_url, cloudinaryUrl498);
  assert.equal(result.json.storage_canonico_reutilizado, true);
  assert.deepEqual(
    Array.from(result.json.storage_upload_divergencias),
    ['storage_provider', 'storage_url', 'storage_asset_id']
  );
  assert.equal(result.json.storage_upload_nao_canonico.url, r2Url498);
});

test('abre retorno MySQL aninhado e ignora o bloco de metadados', () => {
  const inputItems = [{
    json: {
      0: [db498],
      1: {
        fieldCount: 0,
        affectedRows: 0,
        insertId: 0,
        info: '',
        serverStatus: 2,
        warningStatus: 0,
        changedRows: 0
      }
    }
  }];

  const [result] = execute(upload498, db498, inputItems);

  assert.equal(result.json.migration_id, 498);
  assert.equal(result.json.storage_provider, 'cloudinary');
});

test('bloqueia recuperação se o SHA do upload divergir do banco', () => {
  assert.throws(
    () => execute({...upload498, sha256: '0'.repeat(64)}, db498),
    /post, mídia original ou SHA diverge do banco/
  );
});
