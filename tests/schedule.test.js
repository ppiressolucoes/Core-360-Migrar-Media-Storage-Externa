const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workflow = JSON.parse(fs.readFileSync(
  path.join(__dirname, '../workflows/pel-featured-pai.json'), 'utf8'
));
const code = name => workflow.nodes.find(n => n.name === name).parameters.jsCode;
const page = {
  candidatos: [{post_id: 6514, wp_media_id: 6519}, {post_id: 6522, wp_media_id: 6534}],
  pagina_processada: 73, per_page: 6, ultimo_post_pagina: 6562
};
const reserved = (migrationId, postId, mediaId, ordem) => ({
  migration_id: migrationId, post_id: postId, wp_media_id: mediaId,
  ordem, status: 'PROCESSING'
});

function run(name, items, upstream) {
  const result = vm.runInNewContext(`(function () {\n${code(name)}\n})()`, {
    $input: {all: () => items.map(json => ({json}))},
    $: ref => {
      assert.equal(ref, name === 'Normaliza | Lote Reservado'
        ? 'Monta | Candidatos [5]' : 'Normaliza | Lote Reservado');
      return {first: () => ({json: upstream})};
    }
  });
  return JSON.parse(JSON.stringify(result));
}

test('reserva aceita resultset aninhado e ignora metadados MySQL', () => {
  const output = run('Normaliza | Lote Reservado', [
    [[reserved(201, 6514, 6519, 1), reserved(202, 6522, 6534, 2)]],
    {fieldCount: 0, affectedRows: 9}
  ], page);
  assert.deepEqual(output.map(item => item.json.migration_id), [201, 202]);
  assert.ok(output.every(item => item.json.tem_reserva));
});

test('reserva vazia produz um marcador, sem presumir página resolvida', () => {
  const output = run('Normaliza | Lote Reservado', [[], {fieldCount: 0}], page);
  assert.equal(output[0].json.tem_reserva, false);
  assert.equal(output[0].json.total_candidatos, 2);
});

test('reserva aceita wrapper conhecido e recusa retorno ou candidato incompatível', () => {
  const output = run('Normaliza | Lote Reservado', [{results: [[reserved(201, 6514, 6519, 1)]]}], page);
  assert.equal(output[0].json.migration_id, 201);
  assert.throws(() => run('Normaliza | Lote Reservado', [{unknown: 'payload'}], page), /desconhecido/);
  assert.throws(() => run('Normaliza | Lote Reservado', [[reserved(203, 9999, 6519, 1)]], page), /fora dos candidatos/);
});

const checkpoint = (resultado, resolvidos) => [
  [{resultado, total_candidatos: 6, total_resolvidos: resolvidos,
    pagina_atual: 73, ultimo_post_id: 6500}],
  {fieldCount: 0, affectedRows: 9, insertId: 0}
];

test('caso informado: sem reserva e checkpoint AGUARDANDO sinaliza bloqueio', () => {
  assert.throws(() => run('Valida | Checkpoint PAI', checkpoint('AGUARDANDO', 0), {tem_reserva: false}),
    /0 reservas e 0\/6 candidatos resolvidos/);
});

test('checkpoint já resolvido encerra normalmente sem nova reserva', () => {
  const output = run('Valida | Checkpoint PAI', checkpoint('JA_AVANCADO', 6), {tem_reserva: false});
  assert.equal(output[0].json.resultado, 'JA_AVANCADO');
});

test('checkpoint pendente durante processamento de reservas não interrompe o lote', () => {
  const output = run('Valida | Checkpoint PAI', checkpoint('AGUARDANDO', 0), {tem_reserva: true});
  assert.equal(output[0].json.resultado, 'AGUARDANDO');
});
