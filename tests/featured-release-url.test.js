const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../workflows/pel-featured-associacao-wp.json'), 'utf8'
));
const node = workflow.nodes.find(item => item.name === 'Valida | Exclusão Liberada');
const standalone = fs.readFileSync(
  path.join(__dirname, '../workflows/nodes/valida-exclusao-liberada.js'), 'utf8'
).trim();
const featuredNode = workflow.nodes.find(item => item.name === 'Valida | Featured Atual');

function validate(context, sourceUrl) {
  const select = () => ({all: () => [{json: context}]});
  return new Function('$input', '$', node.parameters.jsCode)(
    {all: () => [{json: {id: context.wp_media_id_virtual, source_url: sourceUrl}}]},
    select
  )[0].json;
}

const canonical = 'https://res.cloudinary.com/yezowpnj/image/upload/v1792420814/pel/featured/936704c6.jpg';
const transformed = 'https://res.cloudinary.com/yezowpnj/image/upload/c_limit,w_768/v1792420814/pel/featured/936704c6.jpg';
const context = {
  migration_id: 469,
  post_id: 6625,
  wp_media_id_original: 6630,
  wp_media_id_virtual: 89239,
  storage_provider: 'cloudinary',
  storage_url: canonical,
  associacao_validada: true
};

test('export mantém o código de validação versionado', () => {
  assert.equal(node.parameters.jsCode.trim(), standalone);
  assert.equal(featuredNode.parameters.jsCode.trim(), fs.readFileSync(
    path.join(__dirname, '../workflows/nodes/valida-featured-atual.js'), 'utf8'
  ).trim());
});

test('post ainda com mídia original não libera exclusão', () => {
  const select = () => ({all: () => [{json: context}]});
  const run = featured => new Function('$input', '$', featuredNode.parameters.jsCode)(
    {all: () => [{json: {id: 6625, featured_media: featured}}]}, select
  );
  assert.throws(() => run(6630), /difere da mídia virtual/);
  const verified = run(89239)[0].json;
  assert.equal(verified.wp_media_id_virtual, 89239);
  assert.equal(validate(verified, transformed).exclusao_liberada, true);
});

test('libera variante responsiva Cloudinary do mesmo asset após associação', () => {
  const result = validate(context, transformed);
  assert.equal(result.exclusao_liberada, true);
  assert.equal(result.media_virtual_url, transformed);
  assert.equal(validate(context, canonical).exclusao_liberada, true);
  assert.equal(validate({...context, associacao_validada: false}, transformed).exclusao_liberada, false);
});

test('bloqueia mudança de asset, versão, cloud e transformações de outros providers', () => {
  for (const url of [
    transformed.replace('936704c6', 'outroasset'),
    transformed.replace('v1792420814', 'v1792420815'),
    transformed.replace('yezowpnj', 'outracloud'),
    transformed.replace('c_limit,w_768', 'c_crop,w_768')
  ]) {
    assert.equal(validate(context, url).exclusao_liberada, false, url);
  }

  const r2 = 'https://example.r2.dev/pel/featured/936704c6.jpg';
  const r2Context = {...context, storage_provider: 'cloudflare_r2', storage_url: r2};
  assert.equal(validate(r2Context, r2).exclusao_liberada, true);
  assert.equal(validate(r2Context, `${r2}?width=768`).exclusao_liberada, false);
});
