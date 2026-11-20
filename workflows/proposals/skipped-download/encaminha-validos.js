// Somente após sucesso da SP ou desvio explícito quando rejeitados estiver vazio.
const plano = $('Prepara | Lote Download').first().json;
const entrada = $('Valida Download Featured').all();
if (!Array.isArray(plano.validos) || !Array.isArray(plano.pendentes)) throw new Error('Plano inválido.');
if (!plano.validos.length) return [{json:{tem_validos:false, pendentes:plano.pendentes}}];
return plano.validos.map(({indice:i, media}) => {
  if (!Number.isInteger(i) || !entrada[i] || !media || entrada[i].json.download_valido !== true) throw new Error('Plano divergente.');
  return {...entrada[i], json:{...entrada[i].json, ...media, tem_validos:true}, pairedItem:{item:0}};
});
