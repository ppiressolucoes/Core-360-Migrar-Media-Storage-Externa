const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workflow = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../workflows/pel-featured-associacao-wp.json'), 'utf8'
));
const code = workflow.nodes.find(n => n.name === 'Monta | Notificação Lote').parameters.jsCode;

const migrated = (id, postId = 2823) => ({
  migration_id: id,
  post_id: postId,
  wp_media_id_original: 2826,
  wp_media_id_virtual: 87511,
  storage_url: 'https://res.cloudinary.com/example/image/upload/asset.jpg',
  status: 'MIGRATED'
});
const checkpoint = () => [
  {json: [{resultado: 'AVANCADO', total_candidatos: 6, total_resolvidos: 6, pagina_atual: 27}]},
  {json: {fieldCount: 0, affectedRows: 10}}
];

function run(exclusionItems, checkpointItems = checkpoint()) {
  const context = {
    $: name => {
      assert.equal(name, 'Chamar | Exclusão e Auditoria');
      return {all: () => exclusionItems};
    },
    $input: {all: () => checkpointItems}
  };
  const result = vm.runInNewContext(`(function () {\n${code}\n})()`, context);
  return JSON.parse(JSON.stringify(result));
}

test('aceita resultsets aninhados e ignora metadados MySQL', () => {
  const result = run([{json: [[migrated(186), migrated(187, 2830)], {fieldCount: 0}]}]);
  assert.equal(result[0].json.total_migrados_lote, 2);
  assert.equal(result[0].json.checkpoint_status, 'AVANCADO');
  assert.equal(result[0].json.pagina_atual, 27);
  assert.match(result[0].json.html, /\?p=2830/);
});

test('aceita objetos diretos e wrappers de resultado; deduplica por migration_id', () => {
  const result = run([
    {json: migrated(186)},
    {json: {results: [[migrated(186), {fieldCount: 0}], [migrated(187, 2830)]]}}
  ]);
  assert.deepEqual(result[0].json.posts.map(p => p.migration_id), [186, 187]);
});

test('não envia notificação sem migration MIGRATED', () => {
  assert.throws(() => run([{json: [{...migrated(186), status: 'FAILED'}, {fieldCount: 0}]}]), /não retornou migrations MIGRATED/);
});

test('não envia notificação sem resultado funcional do checkpoint', () => {
  assert.throws(() => run([{json: migrated(186)}], [{json: {fieldCount: 0}}]), /não retornou resultado funcional/);
});

test('recusa identidades conflitantes na deduplicação', () => {
  assert.throws(() => run([{json: [migrated(186), migrated(186, 2830)]}]), /contexto conflitante/);
});

test('recusa IDs inválidos, mesmo com status MIGRATED', () => {
  assert.throws(() => run([{json: migrated('186abc')}]), /migration_id inválido/);
});

test('recusa row de conclusão sem mídia virtual ou URL de storage', () => {
  assert.throws(() => run([{json: {...migrated(186), wp_media_id_virtual: null}}]), /wp_media_id_virtual/);
  assert.throws(() => run([{json: {...migrated(186), storage_url: null}}]), /storage_url/);
});

test('não envia automaticamente quando o checkpoint está aguardando ou já avançado', () => {
  for (const resultado of ['AGUARDANDO', 'JA_AVANCADO']) {
    const items = [{json: [{resultado, total_candidatos: 6, total_resolvidos: 6, pagina_atual: 27}]}];
    assert.throws(() => run([{json: migrated(186)}], items), /notificação automática não enviada/);
  }
});
