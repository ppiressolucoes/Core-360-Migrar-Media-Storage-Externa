const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const sharedHost = 'n8n-pel-proxy.core360.workers.dev';
const featuredHost = 'n8n-pel-featured-proxy.core360.workers.dev';

function workerWith(originFetch) {
  const source = fs.readFileSync(path.join(__dirname, '../workers/n8n-pel-featured-proxy.js'), 'utf8');
  const context = {module: {exports: {}}, URL, Headers, Request, Response, fetch: originFetch};
  vm.runInNewContext(source.replace('export default', 'module.exports ='), context);
  return context.module.exports;
}

test('somente os três exports Featured apontam para o proxy exclusivo', () => {
  for (const name of ['pel-featured-pai', 'pel-featured-associacao-wp', 'pel-featured-exclusao-auditoria']) {
    const workflow = JSON.parse(fs.readFileSync(
      path.join(__dirname, `../workflows/${name}.json`), 'utf8'
    ));
    const urls = workflow.nodes.map(node => node.parameters?.url).filter(Boolean);
    assert.ok(urls.length > 0, `${name}: sem URLs`);
    assert.ok(urls.every(url => !url.includes(sharedHost)), `${name}: usa Worker compartilhado`);
    assert.ok(urls.some(url => url.includes(featuredHost)), `${name}: sem Worker exclusivo`);
  }
});

test('proxy Featured aceita as rotas usadas pelos três fluxos e bloqueia outras', async () => {
  const calls = [];
  const worker = workerWith(async (url, init) => {
    calls.push({url, method: init.method, redirect: init.redirect});
    return new Response('{"ok":true}', {status: 200, headers: {'Content-Type': 'application/json'}});
  });
  const cases = [
    ['GET', '/energia/wp-json/wp/v2/posts?per_page=6', 'follow'],
    ['GET', '/energia/wp-json/wp/v2/posts/6633', 'follow'],
    ['GET', '/energia/wp-json/wp/v2/media/6639?context=edit', 'follow'],
    ['GET', '/energia/wp-content/uploads/2024/03/photo.jpg', 'follow'],
    ['POST', '/energia/wp-json/m360/v1/external-featured-media', 'manual'],
    ['POST', '/energia/wp-json/m360/v1/external-featured-media/assign', 'manual'],
    ['DELETE', '/energia/wp-json/wp/v2/media/6639?force=true', 'manual']
  ];
  for (const [method, route, redirect] of cases) {
    const response = await worker.fetch(new Request(
      `https://${featuredHost}${route}`,
      {method, ...(method === 'POST' ? {body: '{}'} : {})}
    ));
    assert.equal(response.status, 200, `${method} ${route}`);
    assert.equal(calls.at(-1).redirect, redirect);
    assert.equal(new URL(calls.at(-1).url).host, 'energialimpa.live');
  }
  const previousCalls = calls.length;
  const blocked = await worker.fetch(new Request(
    `https://${featuredHost}/energia/wp-json/wp/v2/users`
  ));
  assert.equal(blocked.status, 404);
  assert.equal(calls.length, previousCalls);
});

test('redirect de POST retorna Location sem retransmitir corpo', async () => {
  let calls = 0;
  const worker = workerWith(async () => {
    calls++;
    return new Response(null, {status: 307, headers: {Location: 'https://energialimpa.live/canonical'}});
  });
  const response = await worker.fetch(new Request(
    `https://${featuredHost}/energia/wp-json/m360/v1/external-featured-media`,
    {method: 'POST', body: '{}'}
  ));
  assert.equal(response.status, 502);
  assert.equal(calls, 1);
  const body = await response.json();
  assert.equal(body.status, 'origin_redirect');
  assert.equal(body.origin_status, 307);
  assert.equal(body.location, 'https://energialimpa.live/canonical');
});
