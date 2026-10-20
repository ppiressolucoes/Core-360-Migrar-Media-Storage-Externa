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
  storage_asset_id: 'real-asset-id',
  width: 840,
  height: 560
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
    secure_url: canonical, asset_id: origin.storage_asset_id,
    width: origin.width, height: origin.height
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

test('bloqueia attachment Cloudinary quando migration espera R2', () => {
  const r2 = {
    ...origin,
    migration_id: 493,
    storage_provider: 'cloudflare_r2',
    storage_asset_id: origin.sha256,
    storage_url: `https://pub-43dc3ba28cba479abf3287dc11405d82.r2.dev/${origin.storage_key}.jpg`
  };
  assert.throws(() => vm.runInNewContext(`(function () {\n${code}\n})()`, {
    $: () => ({item: {json: r2}}),
    $json: {body: {
      attachment_id: 86711,
      existing: true,
      sha256: r2.sha256,
      provider: 'cloudinary',
      public_id: r2.storage_key,
      asset_id: '327d14b69c903a23cac1d281ca7245de',
      secure_url: canonical,
      width: r2.width,
      height: r2.height
    }}
  }), /divergente em provider/);
});

test('bloqueia resposta HTTP de erro mesmo que contenha attachment_id', () => {
  assert.throws(() => vm.runInNewContext(`(function () {\n${code}\n})()`, {
    $: () => ({item: {json: origin}}),
    $json: {statusCode: 400, body: {attachment_id: 90001}}
  }), /HTTP 400/);
});
