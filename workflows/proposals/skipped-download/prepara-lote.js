// Run Once for All Items; entrada: Valida Download Featured do export de 18/11.
const items = $input.all();
const reservas = $('Normaliza | Lote Reservado').all();
const pagina = $('Monta | Candidatos [3]').first().json;
if (!items.length) throw new Error('Lote de downloads vazio.');
const porId = new Map();
for (const item of reservas) {
  const r = item.json;
  const id = Number(r.migration_id);
  if (!Number.isSafeInteger(id) || id <= 0 || porId.has(id)) throw new Error('Reserva inválida ou duplicada.');
  porId.set(id, r);
}
const validos = [], rejeitados = [], pendentes = [], ids = new Set();
for (let i = 0; i < items.length; i++) {
  const resultado = items[i].json;
  const media = $('Normaliza | Featured Media').itemMatching(i).json;
  if (items[i].pairedItem?.item !== i) throw new Error('Pareamento do download divergente.');
  const id = Number(media.migration_id), post = Number(media.post_id), wp = Number(media.wp_media_id);
  if (resultado.migration_id != null && Number(resultado.migration_id) !== id) throw new Error('Download associado à migration errada.');
  if (![id, post, wp].every(n => Number.isSafeInteger(n) && n > 0) || ids.has(id)) throw new Error('Identidade inválida ou duplicada.');
  ids.add(id);
  const reserva = porId.get(id);
  if (!reserva || Number(reserva.post_id) !== post || Number(reserva.wp_media_id) !== wp) throw new Error(`Reserva divergente: ${id}`);
  // Não presumir 200 quando o nó HTTP não fornecer status explícito.
  const raw = resultado.statusCode ?? resultado.status_code;
  const status = raw === null || raw === undefined || raw === '' ? null : Number(raw);
  if (!Number.isInteger(status) || status < 200 || status >= 300) {
    pendentes.push({migration_id:id, http_status:status, motivo:'HTTP_NAO_CONFIRMADO'});
    continue;
  }
  if (resultado.download_valido === true) { validos.push({indice:i, media}); continue; }
  // Este sinal deve vir de verificação independente e confiável da origem.
  // O HTTP 200 do proxy, por si só, pode mascarar um erro da origem.
  const origemStatus = Number(resultado.origem_http_status);
  if (resultado.origem_rejeicao_confirmada !== true ||
      !Number.isInteger(origemStatus) || origemStatus < 200 || origemStatus >= 300) {
    pendentes.push({migration_id:id, http_status:status, motivo:'ORIGEM_NAO_CONFIRMADA'});
    continue;
  }
  if (resultado.download_valido !== false || typeof resultado.download_erro !== 'string' ||
      !/^[A-Z0-9_]{1,80}$/.test(resultado.download_erro) ||
      typeof media.original_url !== 'string' || !/^https?:\/\//i.test(media.original_url) ||
      media.original_url.length > 2048 || typeof reserva.updated_at !== 'string' ||
      !/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(reserva.updated_at))
    throw new Error(`Rejeição ou snapshot inválido: ${id}`);
  rejeitados.push({migration_id:id, post_id:post, wp_media_id:wp, updated_at:reserva.updated_at,
    http_status:status, origem_http_status:origemStatus, origem_rejeicao_confirmada:true,
    motivo:resultado.download_erro, original_url:media.original_url});
}
const page = Number(pagina.pagina_processada);
if (!Number.isSafeInteger(page) || page <= 0 || !Array.isArray(pagina.candidatos) || !pagina.candidatos.length) throw new Error('Página ou candidatos inválidos.');
return [{json:{pagina_processada:page, candidatos:pagina.candidatos, rejeitados, validos, pendentes}}];
