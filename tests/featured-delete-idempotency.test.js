const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = JSON.parse(fs.readFileSync(path.join(
  __dirname, '../workflows/pel-featured-exclusao-auditoria.json'
)));
const node = name => workflow.nodes.find(item => item.name === name);
const ctx = {
  migration_id: 479, post_id: 6729, wp_media_id_original: 6734,
  wp_media_id_virtual: 89386, storage_provider: 'cloudflare_r2',
  storage_url: 'https://pub-example.r2.dev/pel/featured/test.jpg',
  associacao_wp_confirmada: true, associacao_validada: true,
  exclusao_liberada: true
};
const absent = {
  statusCode: 404,
  body: {
    origin_status: 404,
    origin_body: JSON.stringify({code: 'rest_post_invalid_id'})
  }
};

test('DELETE repetido segue para GET pelo ID original do loop', () => {
  const deleteNode = node('DELETE | Mídia Original');
  assert.equal(deleteNode.parameters.options.response.response.neverError, true);
  assert.equal(deleteNode.onError, 'continueErrorOutput');
  assert.equal(workflow.connections['DELETE | Mídia Original'].main[0][0].node,
    'GET | Confirma Exclusão Original');
  assert.equal(workflow.connections['DELETE | Mídia Original'].main[1][0].node,
    'GET | Confirma Exclusão Original');
  const confirm = node('GET | Confirma Exclusão Original');
  assert.ok(confirm.parameters.url.includes("$('Loop | Exclusões').item.json.wp_media_id_original"));
  assert.ok(!confirm.parameters.url.includes('$json.previous.id'));
});

test('GET 404 rest_post_invalid_id usa o ramo de original já excluída', () => {
  const select = name => ({
    all: () => [{json: ctx}],
    item: {json: ctx}
  });
  const classified = new Function('$input', '$', node('Classifica | Mídia Original').parameters.jsCode)(
    {all: () => [{json: absent}]}, select
  )[0].json;
  assert.equal(classified.precisa_excluir_original, false);
  assert.equal(classified.original_ja_excluida, true);
  const normalized = new Function('$input', node('Normaliza | Original Já Excluída').parameters.jsCode)(
    {all: () => [{json: classified}]}
  )[0].json;
  assert.equal(normalized.exclusao_original_confirmada, true);
  assert.equal(normalized.wp_media_id_original, 6734);
});

test('GET de confirmação 404 valida a exclusão mesmo após DELETE sem body de sucesso', () => {
  const result = new Function('$json', '$', node('Valida | Exclusão Confirmada').parameters.jsCode)(
    absent, () => ({item: {json: ctx}})
  )[0].json;
  assert.equal(result.exclusao_confirmada, true);
  assert.equal(result.wp_media_id_original, 6734);
});

test('429 da origem aguarda e repete somente o GET uma vez', () => {
  const first = workflow.connections['GET | Confirma Exclusão Original'].main[0][0].node;
  assert.equal(first, 'IF | Confirmação 429?');
  const condition = node(first).parameters.conditions.conditions[0];
  assert.equal(condition.rightValue, 429);
  assert.match(condition.leftValue, /origin_status/);
  assert.equal(workflow.connections[first].main[0][0].node, 'Wait | Rate Limit 180s');
  assert.equal(node('Wait | Rate Limit 180s').parameters.amount, 180);
  assert.equal(workflow.connections['Wait | Rate Limit 180s'].main[0][0].node,
    'GET | Repete Confirmação Original');
  assert.equal(workflow.connections['GET | Repete Confirmação Original'].main[0][0].node,
    'Valida | Exclusão Confirmada');
  assert.equal(workflow.connections[first].main[1][0].node,
    'Valida | Exclusão Confirmada');
  assert.equal(workflow.connections['Valida | Exclusão Confirmada'].main[0][0].node,
    'Wait 20');
  assert.equal(node('GET | Repete Confirmação Original').parameters.url,
    node('GET | Confirma Exclusão Original').parameters.url);
});

test('429 persistente não confirma nem repete DELETE', () => {
  const response = {
    statusCode: 429,
    body: {
      origin_status: 429,
      target: 'https://energialimpa.live/wp-json/wp/v2/media/6734',
      origin_body: ''
    }
  };
  assert.throws(() => new Function('$json', '$',
    node('Valida | Exclusão Confirmada').parameters.jsCode)(
    response, () => ({item: {json: ctx}})
  ), /Confirmação pendente por rate limit/);
});

test('404 de outra mídia não confirma a exclusão', () => {
  const response = {
    ...absent,
    body: {
      ...absent.body,
      target: 'https://energialimpa.live/wp-json/wp/v2/media/6778'
    }
  };
  assert.throws(() => new Function('$json', '$',
    node('Valida | Exclusão Confirmada').parameters.jsCode)(
    response, () => ({item: {json: ctx}})
  ), /Resposta de outra mídia/);
});
