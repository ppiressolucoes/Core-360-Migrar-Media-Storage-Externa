// Workflow: PEL | Featured Exclusão e Auditoria | Sub 02
// Node: Falha | Auditoria Final
// Extraído do export n8n oficial.

const x = $json;

const migrationId =
  Number(x.migration_id ?? 0);

const mediaOriginal =
  Number(x.wp_media_id_original ?? 0);

const status =
  x.auditoria_status ?? 'DESCONHECIDO';

const http =
  Number(x.auditoria_http_status ?? 0);

throw new Error(
  `Auditoria final bloqueada | ` +
  `migration=${migrationId} | ` +
  `media_original=${mediaOriginal} | ` +
  `status=${status} | ` +
  `HTTP=${http || 'N/A'}`
);
