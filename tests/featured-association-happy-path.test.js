const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflow = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../workflows/pel-featured-associacao-wp.json'), 'utf8'
));
const node = name => workflow.nodes.find(item => item.name === name);
const origin = {
  migration_id: 470, post_id: 6633, wp_media_id_original: 6639,
  storage_provider: 'cloudinary',
  storage_url: 'https://res.cloudinary.com/example/image/upload/featured.jpg'
};
const virtual = {
  ...origin, wp_media_id_virtual: 89030, media_virtual_url: origin.storage_url
};
const context = {
  'Loop1': origin,
  'Normaliza | Mídia Virtual Criada': virtual,
  'Wait 60': {...origin, external_attachment_id: 89030},
  'Roteia | Pós-Erro Associação': {...origin, wp_media_id_virtual: 89030}
};
const select = name => ({item: {json: context[name]}});

function run(name, input) {
  const code = node(name).parameters.jsCode;
  const inputItems = {all: () => [{json: input}]};
  return new Function('$json', '$input', '$', code)(input, inputItems, select)[0].json;
}

test('metadados usam o attachment da normalização após sucesso no retry', () => {
  const normalized = run('Normaliza | Mídia Virtual Criada', {
    statusCode: 201,
    body: {attachment_id: 89030, secure_url: origin.storage_url}
  });
  assert.equal(normalized.wp_media_id_virtual, 89030);
  assert.equal(normalized.storage_provider, 'cloudinary');
  assert.equal(normalized.storage_url, origin.storage_url);

  const fields = node('Metadados Featured IMG').parameters.assignments.assignments;
  const id = fields.find(field => field.name === 'external_attachment_id');
  assert.ok(id.value.includes("$('Normaliza | Mídia Virtual Criada')"));
  assert.ok(!id.value.includes("$('Registrar Mídia Virtual WP')"));
  const expression = id.value.slice(3, -2);
  assert.equal(new Function('$', `return ${expression}`)(select), 89030);
  for (const name of ['storage_provider', 'storage_url', 'media_virtual_url']) {
    assert.ok(fields.some(field => field.name === name), `${name} não propagado`);
  }
});

test('associação inicial e retry validam os IDs reais devolvidos por /assign', () => {
  const response = {
    statusCode: 200,
    body: {post_id: 6633, attachment_id: 89030, featured_media: 89030}
  };
  for (const classifier of ['Classifica | Resposta Associação WP', 'Classifica | Retry Associação WP']) {
    const classified = run(classifier, response);
    assert.equal(classified.response_post_id, 6633);
    assert.equal(classified.response_attachment_id, 89030);
    assert.equal(classified.response_featured_media, 89030);
    const validated = run('Valida | Associação WP', classified);
    assert.equal(validated.associacao_wp_confirmada, true);
    assert.equal(validated.wp_media_id_virtual, 89030);
    assert.equal(validated.storage_url, origin.storage_url);
  }
});

test('post divergente no body de /assign bloqueia a associação', () => {
  const classified = run('Classifica | Resposta Associação WP', {
    statusCode: 200,
    body: {post_id: 9999, attachment_id: 89030, featured_media: 89030}
  });
  assert.equal(classified.post_id, 6633); // Contexto esperado é mantido pelo classificador.
  assert.equal(classified.response_post_id, 9999); // Body real permanece separado.
  assert.throws(() => run('Valida | Associação WP', classified), /\/assign divergente/);
});
