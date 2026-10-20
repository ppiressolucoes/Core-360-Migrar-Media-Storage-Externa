const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(
  __dirname, '..', 'workflows/nodes/normaliza-midia-virtual-criada-sub01.js'
), 'utf8');
const sha = 'd5a00dcebe0a12c3d5e18453c0231529af4526a3f2a0d692740ae938997d477b';
const origem = {
  migration_id: 493,
  post_id: 6906,
  wp_media_id_original: 6907,
  sha256: sha,
  storage_provider: 'cloudflare_r2',
  storage_key: `pel/featured/${sha}`,
  storage_asset_id: sha,
  storage_url: `https://pub-43dc3ba28cba479abf3287dc11405d82.r2.dev/pel/featured/${sha}.jpg`,
  storage_width: 480,
  storage_height: 360
};

function run(body, statusCode = 200) {
  return vm.runInNewContext(`(function () {\n${code}\n})()`, {
    $: () => ({item: {json: origem}}),
    $json: {body, statusCode}
  });
}

test('migration 493 bloqueia attachment Cloudinary retornado pela busca por SHA', () => {
  assert.throws(() => run({
    attachment_id: 86711,
    existing: true,
    sha256: sha,
    provider: 'cloudinary',
    public_id: origem.storage_key,
    asset_id: '327d14b69c903a23cac1d281ca7245de',
    secure_url: `https://res.cloudinary.com/yezowpnj/image/upload/v1790924429/pel/featured/${sha}.jpg`,
    width: 480,
    height: 360
  }), /attachment 86711 divergente em provider/);
});

test('migration 493 aceita attachment R2 com identidade canônica completa', () => {
  const result = run({
    attachment_id: 89400,
    existing: false,
    sha256: sha,
    provider: origem.storage_provider,
    public_id: origem.storage_key,
    asset_id: origem.storage_asset_id,
    secure_url: origem.storage_url,
    width: 480,
    height: 360
  }, 201);
  assert.equal(result[0].json.wp_media_id_virtual, 89400);
  assert.equal(result[0].json.storage_provider, 'cloudflare_r2');
  assert.equal(result[0].json.cloudinary_url, null);
});
