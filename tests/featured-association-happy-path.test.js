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
  sha256: '05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4',
  storage_provider: 'cloudinary',
  storage_key: 'pel/featured/05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4',
  storage_asset_id: 'daef082f0bf1b010c1c33232fb80d46c',
  storage_url: 'https://res.cloudinary.com/example/image/upload/featured.jpg',
  width: 840, height: 560
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
    body: {
      attachment_id: 89030,
      secure_url: origin.storage_url,
      sha256: origin.sha256,
      provider: origin.storage_provider,
      public_id: origin.storage_key,
      asset_id: origin.storage_asset_id,
      width: origin.width,
      height: origin.height
    }
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

test('normalização aceita dimensões width/height do item pinado e bloqueia divergência', () => {
  const r2 = {
    ...origin,
    migration_id: 473,
    storage_provider: 'cloudflare_r2',
    storage_url: 'https://pub-4fc4737db70147a8bec050dd7fb883d7.r2.dev/pel/featured/image.jpg',
    storage_asset_id: 'r2-asset',
    width: 480,
    height: 360
  };
  context.Loop1 = r2;
  const response = {
    statusCode: 200,
    body: {
      attachment_id: 89376,
      sha256: r2.sha256,
      provider: r2.storage_provider,
      public_id: r2.storage_key,
      asset_id: r2.storage_asset_id,
      secure_url: r2.storage_url,
      width: 480,
      height: 360
    }
  };
  assert.equal(run('Normaliza | Mídia Virtual Criada', response).wp_media_id_virtual, 89376);
  response.body.height = 359;
  assert.throws(() => run('Normaliza | Mídia Virtual Criada', response), /dimensões/);
  context.Loop1 = origin;
});

test('lote de associação preserva provider Backblaze B2 e URL canônica', () => {
  const b2 = {
    migration_id: 476, post_id: 6697, wp_media_id_original: 6699,
    storage_provider: 'backblaze_b2',
    storage_url: 'https://flow-b2-02-storage-proxy-hml.core360.workers.dev/pel/featured/a.jpg'
  };
  const confirmed = {
    migration_id: 476, post_id: 6697, wp_media_id_original: 6699,
    wp_media_id_virtual: 89383, associacao_wp_confirmada: true
  };
  const selectBatch = name => ({all: () => [{json: name === 'Start WP' ? b2 : confirmed}]});
  const code = node('Recupera | Lote Associação').parameters.jsCode;
  const output = new Function('$', code)(selectBatch);
  assert.equal(output[0].json.storage_provider, 'backblaze_b2');
  assert.equal(output[0].json.storage_url, b2.storage_url);
  assert.equal(output[0].json.wp_media_id_virtual, 89383);

  const wrong = {...confirmed, storage_url: 'https://example.org/different.jpg'};
  const selectWrong = name => ({all: () => [{json: name === 'Start WP' ? b2 : wrong}]});
  assert.throws(() => new Function('$', code)(selectWrong), /divergente/);
});

test('metadados editoriais vêm da mídia original em contexto público', () => {
  const url = node('GET | Metadados Mídia Original').parameters.url;
  assert.ok(url.includes('$json.wp_media_id_original'));
  assert.ok(!url.includes('context=edit'));
  const fields = node('Metadados Featured IMG').parameters.assignments.assignments;
  for (const name of ['m360_featured_title_pt_br', 'm360_featured_description_pt_br', 'm360_featured_caption_pt_br']) {
    assert.ok(fields.find(field => field.name === name).value.includes('?.rendered'));
  }
});

test('retry do registro usa o item correspondente do loop', () => {
  const fields = node('Retry | Registrar Mídia Virtual WP').parameters.bodyParameters.parameters;
  for (const field of fields) {
    assert.ok(field.value.includes("$('Loop1').item.json"), field.name);
    assert.ok(!field.value.includes("$('Loop1').first()"), field.name);
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
