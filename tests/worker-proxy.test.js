const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function workerWith(originFetch) {
  const source = fs.readFileSync(
    path.join(__dirname, '../workers/n8n-pel-proxy.js'), 'utf8'
  );
  const context = {
    module: {exports: {}},
    URL, Headers, Request, Response,
    fetch: originFetch
  };
  vm.runInNewContext(source.replace('export default', 'module.exports ='), context);
  return context.module.exports;
}

test('POST mantém a configuração anterior de redirect automático', async () => {
  const worker = workerWith(async (url, init) => {
    assert.equal(url, 'https://energialimpa.live/wp-json/m360/v1/external-featured-media');
    assert.equal(init.method, 'POST');
    assert.equal(init.redirect, 'follow');
    assert.ok(init.body instanceof ReadableStream);
    return new Response('{"id":89030}', {status: 201});
  });

  const response = await worker.fetch(new Request(
    'https://proxy.example/energia/wp-json/m360/v1/external-featured-media',
    {method: 'POST', body: JSON.stringify({migration_id: 470})}
  ));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {id: 89030});
});

test('POST concluído repassa a resposta da origem', async () => {
  const worker = workerWith(async (_url, init) => {
    assert.equal(init.redirect, 'follow');
    return new Response('{"id":89030}', {
      status: 201, headers: {'Content-Type': 'application/json'}
    });
  });
  const response = await worker.fetch(new Request(
    'https://proxy.example/energia/wp-json/m360/v1/external-featured-media',
    {method: 'POST', body: '{}'}
  ));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), {id: 89030});
  assert.equal(response.headers.get('X-Origin-Status'), '201');
});

test('503 da origem continua identificado como erro da origem', async () => {
  const worker = workerWith(async () => new Response('temporarily busy', {
    status: 503, statusText: 'Service Unavailable'
  }));
  const response = await worker.fetch(new Request(
    'https://proxy.example/energia?rest_route=%2Fm360%2Fv1%2Fexternal-featured-media',
    {method: 'POST', body: '{}'}
  ));
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.status, 'origin_error');
  assert.equal(body.origin_status, 503);
  assert.equal(body.target, 'https://energialimpa.live/?rest_route=%2Fm360%2Fv1%2Fexternal-featured-media');
});
