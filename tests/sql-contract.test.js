const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const workflow = JSON.parse(fs.readFileSync(
  path.join(root, 'workflows/pel-featured-associacao-wp.json'), 'utf8'
));
const procedure = fs.readFileSync(
  path.join(root, 'sql/reference/SP_WP_registra_erro_associacao.sql'), 'utf8'
);

test('os dois caminhos de erro usam os cinco parâmetros escalares da procedure', () => {
  const signature = procedure.match(/PROCEDURE\s+`?SP_WP_registra_erro_associacao`?\s*\(([^)]*)\)/i);
  assert.ok(signature);
  assert.equal((signature[1].match(/\bIN\s+p_/g) || []).length, 5);

  for (const name of ['SP | Registra Falha Associação WP', 'SP | Registra Falha Registro Mídia Virtual']) {
    const node = workflow.nodes.find(n => n.name === name);
    assert.ok(node, name);
    const query = node.parameters.query;
    assert.match(query, /CALL SP_WP_registra_erro_associacao\(/);
    assert.equal((query.match(/\{\{/g) || []).length, 5, name);
    assert.doesNotMatch(query, /JSON\.stringify/, name);
  }
});
