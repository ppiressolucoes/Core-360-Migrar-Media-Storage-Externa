// Workflow: SUB | Midia Externa Cloudinary
// Node: Normaliza
// Extraído do export n8n oficial.

const items = $input.all();

// O primeiro item retornado pelo CALL contém o array com a API
const registro = items[0].json[0];

if (!registro) {
  throw new Error('A SP sp_get_api não retornou nenhuma API disponível.');
}

return [
  {
    json: registro
  }
];
