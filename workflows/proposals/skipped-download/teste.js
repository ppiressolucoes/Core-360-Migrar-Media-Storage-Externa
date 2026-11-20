const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const compile = name => new Function('$input', '$', fs.readFileSync(path.join(__dirname, name), 'utf8'));
const prepara = compile('prepara-lote.js'), encaminha = compile('encaminha-validos.js');
function fixture(statuses, flags) {
  const origem = statuses.map((_, i) => ({json:{migration_id:i+1, post_id:i+11, wp_media_id:i+21, original_url:'https://example.org/a.jpg'}}));
  const reservas = origem.map(({json:r})=>({json:{...r, updated_at:'2026-11-18 12:00:00'}}));
  const items = statuses.map((statusCode,i)=>({json:{statusCode, origem_http_status:200, origem_rejeicao_confirmada:true, download_valido:flags[i], download_erro:flags[i] ? null : 'MIME_DIVERGENTE'}, binary:{data:{id:`bin${i}`}}, pairedItem:{item:i}}));
  const select = name => ({'Normaliza | Featured Media':{itemMatching:i=>origem[i]}, 'Normaliza | Lote Reservado':{all:()=>reservas}, 'Monta | Candidatos [3]':{first:()=>({json:{pagina_processada:166, candidatos:origem.map(x=>({post_id:x.json.post_id,wp_media_id:x.json.wp_media_id}))}})}}[name]);
  return {items, origem, reservas, select};
}
function run(f) {
  const plano = prepara({all:()=>f.items},f.select)[0].json;
  const saida = encaminha(null,n => n === 'Prepara | Lote Download' ? {first:()=>({json:plano})} : {all:()=>n === 'Valida Download Featured' ? f.items : f.origem});
  return {plano,saida};
}
test('lote misto preserva binário e prepara rejeitado auditável',()=>{
  const {plano,saida}=run(fixture([200,200],[true,false]));
  assert.equal(plano.rejeitados.length,1); assert.equal(plano.rejeitados[0].migration_id,2);
  assert.equal(saida[0].binary.data.id,'bin0'); assert.equal(saida[0].json.migration_id,1); assert.equal(plano.pendentes.length,0);
});
test('todos rejeitados geram sentinela para fechamento',()=>{
  const {plano,saida}=run(fixture([200,200],[false,false]));
  assert.equal(plano.rejeitados.length,2); assert.equal(saida[0].json.tem_validos,false);
});
test('522 e status ausente nunca geram SKIPPED',()=>{
  const {plano,saida}=run(fixture([522,null],[false,false]));
  assert.equal(plano.rejeitados.length,0); assert.equal(plano.pendentes.length,2); assert.equal(saida[0].json.tem_validos,false);
});
test('proxy 200 não autoriza SKIPPED sem confirmação da origem ou com origem 522',()=>{
  const a=fixture([200],[false]); a.items[0].json.origem_rejeicao_confirmada=false;
  assert.equal(run(a).plano.rejeitados.length,0); assert.equal(run(a).plano.pendentes.length,1);
  const b=fixture([200],[false]); b.items[0].json.origem_http_status=522;
  assert.equal(run(b).plano.rejeitados.length,0); assert.equal(run(b).plano.pendentes.length,1);
});
test('falha fechada quando pareamento, identidade ou snapshot divergem',()=>{
  const a=fixture([200],[false]); a.items[0].pairedItem.item=1; assert.throws(()=>run(a));
  const b=fixture([200],[false]); b.reservas[0].json.wp_media_id=88; assert.throws(()=>run(b));
  const c=fixture([200],[false]); c.reservas[0].json.updated_at=null; assert.throws(()=>run(c));
});
