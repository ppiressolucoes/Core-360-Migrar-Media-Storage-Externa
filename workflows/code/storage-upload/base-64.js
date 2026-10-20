// Workflow: SUB | Midia Externa Cloudinary
// Node: BASE-64
// Extraído do export n8n oficial.

const apiKey = String($json['API-KEY'] ?? '').trim();
const apiSecret = String($json['API-SECRET'] ?? '').trim();
const apiFolder = String($json['API-FOLDER'] ?? '').trim();

if (!apiKey || !apiSecret) {
  throw new Error('API-KEY ou API-SECRET não informado');
}

// Basic Auth Cloudinary:
// API-KEY:API-SECRET
const credentials = `${apiKey}:${apiSecret}`;

const base64 = Buffer
  .from(credentials, 'utf8')
  .toString('base64');

return {
  json: {
    ...$json,

    // Mantém API-FOLDER disponível para o Upload,
    // mas NÃO inclui a pasta na autenticação
    'API-FOLDER': apiFolder,

    AUTHORIZATION: `Basic ${base64}`,
  },

  binary: $binary,
};
