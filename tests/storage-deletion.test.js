const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../workflows/pel-featured-associacao-wp.json')));
const code = workflow.nodes.find(n => n.name === 'Valida | Exclusão Liberada').parameters.jsCode;
const url = 'https://media.example.test/opaque-object?version=1';
function validate(sourceUrl) {
  return vm.runInNewContext(`(function(){${code}})()`, {
    $input: {all: () => [{json: {id: 90001, source_url: sourceUrl}}]},
    $: name => {
      assert.equal(name, 'Valida | Featured Atual');
      return {all: () => [{json: {migration_id: 469, post_id: 6625,
        wp_media_id_original: 6630, wp_media_id_virtual: 90001,
        storage_provider: 'new-storage.eu', storage_url: url,
        associacao_validada: true}}]};
    }
  })[0].json;
}
test('qualquer repositório libera exclusão somente quando WordPress publica a URL canônica', () => {
  assert.equal(validate(url).exclusao_liberada, true);
  assert.equal(validate(url.replace('media.example', 'other.example')).exclusao_liberada, false);
  assert.match(validate(url.replace('media.example', 'other.example')).motivo_bloqueio, /URL_STORAGE_DIVERGENTE/);
});
