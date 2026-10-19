const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(
  __dirname, '..', 'workflows/nodes/normaliza-midia-virtual-criada.js'
), 'utf8');
const canonical = 'https://res.cloudinary.com/gbjn0cjg/image/upload/v1792420826/pel/featured/05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4.jpg';
const origin = {
  migration_id: 470,
  sha256: '05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4',
  storage_provider: 'cloudinary',
  storage_key: 'pel/featured/05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4',
  storage_url: canonical,
  storage_asset_id: 'real-asset-id'
};

function run(response) {
  return vm.runInNewContext(`(function () {\n${code}\n})()`, {
    $: () => ({item: {json: origin}}),
    $json: {body: response}
  });
}

test('aceita attachment que corresponde integralmente ao storage registrado', () => {
  const result = run({
    attachment_id: 90001, existing: true, sha256: origin.sha256,
    provider: origin.storage_provider, public_id: origin.storage_key,
    secure_url: canonical, asset_id: origin.storage_asset_id
  });
  assert.equal(result[0].json.wp_media_id_virtual, 90001);
});

test('bloqueia attachment deduplicado pelo SHA com URL de outra conta', () => {
  assert.throws(() => run({
    attachment_id: 90001, existing: true, sha256: origin.sha256,
    provider: 'cloudinary', public_id: origin.storage_key,
    secure_url: canonical.replace('gbjn0cjg', 'mlobcylk'),
    asset_id: origin.storage_asset_id
  }), /divergente em secure_url/);
});
