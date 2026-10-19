const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const workflow = JSON.parse(fs.readFileSync(path.join(__dirname, '../workflows/pel-featured-pai.json'), 'utf8'));
const code = name => workflow.nodes.find(n => n.name === name).parameters.jsCode;
const sha = '936704c6b5e4af2f443761458acf4c686f04f5dd9d24578b72c11387b17a7bcd';
const key = `pel/featured/${sha}`;
const r2 = `https://pub-example.r2.dev/${key}.jpg`;
const cdy = `https://res.cloudinary.com/example/image/upload/v123/${key}.jpg`;
const sha470 = '05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4';
const sha471 = 'bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080';
const context = {$: name => {
  assert.equal(name, 'Loop');
  return {item: {json: {migration_id: 469, ordem: 4, post_id: 6625,
    wp_media_id: 6630, original_url: 'https://example.test/original.jpg'}}};
}};
function run(script, extra) {
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(function () {\n${script}\n})()`, {...context, ...extra})));
}
function consolidate(provider, url) {
  return run(code('Consolida | Resultado Upload'), {$json: {provider, public_id: key,
    secure_url: url, sha256: sha, asset_id: sha, mime_type: 'image/jpeg', width: 840, height: 560}}).json;
}
test('Cloudinary e R2 preservam o provider e a URL canônica', () => {
  const cloudinary = consolidate('cloudinary', cdy);
  const external = consolidate('cloudflare_r2', r2);
  assert.equal(cloudinary.storage_provider, 'cloudinary');
  assert.equal(cloudinary.cloudinary_url, cdy);
  assert.equal(external.storage_provider, 'cloudflare_r2');
  assert.equal(external.storage_url, r2);
  assert.equal(external.cloudinary_url, null);
});
test('lote legado 469 R2 + 470/471 Cloudinary prossegue com provedores distintos', () => {
  const items = [
    {json: {migration_id: 469, post_id: 6625, wp_media_id: 6630, sha256: sha,
      cloudinary_public_id: key, cloudinary_url: r2, upload_ok: true}},
    {json: {migration_id: 470, post_id: 6633, wp_media_id: 6639, sha256: sha470,
      cloudinary_public_id: `pel/featured/${sha470}`, cloudinary_url: cdy.replaceAll(sha, sha470), upload_ok: true}},
    {json: {migration_id: 471, post_id: 6642, wp_media_id: 6643, sha256: sha471,
      cloudinary_public_id: `pel/featured/${sha471}`, cloudinary_url: cdy.replaceAll(sha, sha471), upload_ok: true}}
  ];
  const result = run(code('Monta | Lote Uploads'), {$input: {all: () => items}});
  assert.deepEqual(result[0].json.uploads.map(x => x.storage_provider), ['cloudflare_r2', 'cloudinary', 'cloudinary']);
  assert.equal(result[0].json.uploads[0].cloudinary_url, null);
});
test('provider ou chave incoerente bloqueiam a migração', () => {
  assert.throws(() => consolidate('cloudinary', r2), /URL Cloudinary inválida/);
  assert.throws(() => consolidate('unknown', r2), /provider ausente ou desconhecido/);
  assert.throws(() => run(code('Monta | Lote Uploads'), {$input: {all: () => [{json: {
    migration_id: 469, sha256: sha, storage_provider: 'cloudflare_r2',
    storage_key: `pel/featured/${'a'.repeat(64)}`, storage_url: r2, upload_ok: true
  }}]}}), /contrato de storage inválido/);
});
