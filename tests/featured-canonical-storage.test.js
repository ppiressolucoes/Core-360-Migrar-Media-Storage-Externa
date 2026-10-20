const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pai = JSON.parse(fs.readFileSync(path.join(root, 'workflows/pel-featured-pai.json')));
const exclusao = JSON.parse(fs.readFileSync(path.join(root, 'workflows/pel-featured-exclusao-auditoria.json')));
const find = (workflow, name) => workflow.nodes.find(node => node.name === name);

const sha = 'a3d0a336bb749219747c277ac843785b7f096a41b8643b05300da4334637520b';
const url = `https://flow-b2-02-storage-proxy-hml.core360.workers.dev/pel/featured/${sha}.jpg`;
const upload = {
  migration_id: 476, post_id: 6697, wp_media_id: 6699,
  original_url: 'https://energialimpa.live/wp-content/uploads/2024/03/original.jpg',
  sha256: sha, storage_provider: 'backblaze_b2', storage_key: `pel/featured/${sha}`,
  storage_url: url, storage_asset_id: sha,
  storage_width: 840, storage_height: 560, storage_mime_type: 'image/jpeg'
};
const db = {
  migration_id: 476, post_id: 6697, wp_media_id_original: 6699,
  status: 'PROCESSING', sha256: sha, storage_provider: 'backblaze_b2',
  storage_key: upload.storage_key, storage_url: url, storage_asset_id: sha
};

function recover(row) {
  const code = find(pai, 'Recupera | Lote Repositório').parameters.jsCode;
  const select = name => ({first: () => ({json: name === 'Monta | Lote Uploads'
    ? {uploads: [upload]}
    : {pagina_processada: 75, ultimo_post_pagina: 6714,
       candidatos: [{post_id: 6697, wp_media_id: 6699}]}})});
  return new Function('$input', '$', code)({all: () => [{json: row}]}, select)[0].json;
}

test('PAI recupera storage persistido antes de chamar o subfluxo WP', () => {
  const code = fs.readFileSync(path.join(root, 'workflows/nodes/recupera-lote-repositorio-canonico.js'), 'utf8').trim();
  assert.equal(find(pai, 'Recupera | Lote Repositório').parameters.jsCode, code);
  assert.ok(find(pai, 'DB | Recupera Storage Canônico'));
  assert.equal(pai.connections['SP | Registra Lote'].main[0][0].node, 'DB | Recupera Storage Canônico');
  assert.equal(pai.connections['DB | Recupera Storage Canônico'].main[0][0].node, 'Recupera | Lote Repositório');

  const row = recover(db);
  assert.equal(row.storage_provider, 'backblaze_b2');
  assert.equal(row.storage_url, url);
  assert.equal(row.storage_width, 840);
  assert.equal(row.cloudinary_url, null);
});

test('PAI bloqueia URL divergente entre upload e banco', () => {
  assert.throws(() => recover({...db, storage_url: url.replace('flow-b2-02', 'outro-host')}), /storage_url divergente/);
});

test('export de exclusão contém os códigos completos de auditoria multi-provider', () => {
  for (const [name, file] of [
    ['Valida | Contrato Exclusão', 'valida-contrato-exclusao.js'],
    ['Recupera | Lote Auditoria Final', 'recupera-lote-auditoria-final.js'],
    ['Monta | Lote Conclusão', 'monta-lote-conclusao.js']
  ]) {
    assert.equal(find(exclusao, name).parameters.jsCode,
      fs.readFileSync(path.join(root, 'workflows/nodes', file), 'utf8').trim());
  }
});

test('conclusão exige auditoria final positiva para B2', () => {
  const code = find(exclusao, 'Monta | Lote Conclusão').parameters.jsCode;
  const item = {
    ...db, wp_media_id_original: 6699, wp_media_id_virtual: 89383,
    associacao_wp_confirmada: true, exclusao_liberada: true,
    auditoria_confirmada: true
  };
  const run = value => new Function('$input', code)({all: () => [{json: value}]});
  assert.equal(run(item)[0].json.lote[0].storage_provider, 'backblaze_b2');
  assert.throws(() => run({...item, auditoria_confirmada: false}), /contexto inválido/);
});
