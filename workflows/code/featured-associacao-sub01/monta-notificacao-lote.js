// Workflow: PEL | Featured Associação WP | Sub 01 Fluxo
// Node: Monta | Notificação Lote
// Extraído do export n8n oficial.

// =========================================================
// 1. RECUPERA MIGRATIONS CONCLUÍDAS PELO NOVO FILHO 2
// =========================================================

const retornoExclusao =
  $('Chamar | Exclusão e Auditoria').all();

const migrados = [];

// O subfluxo pode retornar:
// - um resultset como array
// - objetos individuais
// - metadata estrutural do MySQL
for (const item of retornoExclusao) {

  const value = item.json;

  // ResultSet MySQL
  if (Array.isArray(value)) {

    for (const registro of value) {

      if (
        registro?.migration_id &&
        registro?.status === 'MIGRATED'
      ) {
        migrados.push(registro);
      }

    }

    continue;
  }

  // Objeto funcional direto
  if (
    value?.migration_id &&
    value?.status === 'MIGRATED'
  ) {
    migrados.push(value);
  }
}


// =========================================================
// 2. REMOVE EVENTUAIS DUPLICIDADES
// =========================================================

const mapaMigrados = new Map();

for (const item of migrados) {
  mapaMigrados.set(
    Number(item.migration_id),
    item
  );
}

const loteConcluido =
  [...mapaMigrados.values()];


// =========================================================
// 3. VALIDA LOTE CONCLUÍDO
// =========================================================

if (loteConcluido.length === 0) {
  throw new Error(
    'Nenhuma migration MIGRATED retornada pelo subfluxo de Exclusão e Auditoria.'
  );
}


// =========================================================
// 4. RECUPERA RESULTADO DO CHECKPOINT
// =========================================================

const checkpointRaw = $input.all();

let checkpoint = null;

for (const item of checkpointRaw) {

  const value = item.json;

  // ResultSet retornado pela SP
  if (Array.isArray(value)) {

    const encontrado =
      value.find(x => x?.resultado);

    if (encontrado) {
      checkpoint = encontrado;
      break;
    }
  }

  // Compatibilidade com retorno direto
  if (value?.resultado) {
    checkpoint = value;
    break;
  }
}


// =========================================================
// 5. NORMALIZA POSTS MIGRADOS
// =========================================================

const posts = loteConcluido.map(item => {

  const postId =
    Number(item.post_id);

  return {

    migration_id:
      Number(item.migration_id),

    post_id:
      postId,

    url_publica:
      `https://energialimpa.live/?p=${postId}`,

    wp_media_id_original:
      Number(item.wp_media_id_original),

    wp_media_id_virtual:
      Number(item.wp_media_id_virtual),

    cloudinary_url:
      item.cloudinary_url
  };
});


// =========================================================
// 6. HTML DOS POSTS
// =========================================================

const listaHtml = posts
  .map(post => `
    <div style="margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #ddd;">
      <strong>Post ID:</strong> ${post.post_id}<br>

      <strong>Migration ID:</strong> ${post.migration_id}<br>

      <strong>URL:</strong>
      <a
        href="${post.url_publica}"
        target="_blank"
      >
        ${post.url_publica}
      </a>
    </div>
  `)
  .join('');


// =========================================================
// 7. CHECKPOINT
// =========================================================

const statusCheckpoint =
  checkpoint?.resultado ??
  'NÃO INFORMADO';

const totalResolvidos =
  checkpoint?.total_resolvidos ??
  '-';

const totalCandidatos =
  checkpoint?.total_candidatos ??
  '-';

const paginaAtual =
  checkpoint?.pagina_atual ??
  '-';


// =========================================================
// 8. SAÍDA PARA GMAIL
// =========================================================

return [
  {
    json: {

      assunto:
        `Migração Featured concluída | ${posts.length} posts`,

      total_migrados_lote:
        posts.length,

      checkpoint_status:
        statusCheckpoint,

      total_resolvidos:
        totalResolvidos,

      total_candidatos:
        totalCandidatos,

      pagina_atual:
        paginaAtual,

      posts,

      html: `
        <h2>Migração Featured concluída</h2>

        <p>
          <strong>Migrados nesta execução:</strong>
          ${posts.length}<br>

          <strong>Checkpoint:</strong>
          ${statusCheckpoint}<br>

          <strong>Resolvidos:</strong>
          ${totalResolvidos}/${totalCandidatos}<br>

          <strong>Página atual:</strong>
          ${paginaAtual}
        </p>

        <h3>Posts para conferência visual</h3>

        ${listaHtml}
      `
    }
  }
];
