const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workflow = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../workflows/pel-featured-pai.json'), 'utf8'
));
const code = workflow.nodes.find(node => node.name === 'Consolida | Resultado Upload').parameters.jsCode;
const sha = 'bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080';

function consolidate(url) {
  return vm.runInNewContext(`(function () {\n${code}\n})()`, {
    $json: {public_id: `pel/featured/${sha}`, secure_url: url},
    $: name => {
      assert.equal(name, 'Loop');
      return {item: {json: {migration_id: 471, ordem: 6, post_id: 6642,
        wp_media_id: 6643, original_url: 'https://example.test/hqdefault.jpg'}}};
    }
  });
}

test('upload Cloudinary mantém o contrato do PAI', () => {
  const url = `https://res.cloudinary.com/sk9mbfyb/image/upload/pel/featured/${sha}.jpg`;
  const result = consolidate(url);
  assert.equal(result.json.cloudinary_url, url);
  assert.equal(result.json.sha256, sha);
  assert.equal(result.json.upload_ok, true);
});

test('URL R2 falha no primeiro retorno antes de Monta | Lote Uploads', () => {
  for (const prefix of ['//pub-example.r2.dev', 'https://pub-example.r2.dev']) {
    assert.throws(
      () => consolidate(`${prefix}/pel/featured/${sha}.jpg`),
      /subfluxo retornou host pub-example\.r2\.dev; PAI Featured espera Cloudinary/
    );
  }
});
