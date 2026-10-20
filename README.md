# Core de Migração de Mídias para Storage Externo

Automação n8n, procedimentos MySQL e integração WordPress usados para migrar as
imagens destacadas do portal **Energia Limpa** para provedores externos.

## Escopo atual

- reserva paginada dos candidatos no MySQL;
- upload para Cloudinary, Cloudflare R2 ou Backblaze B2;
- registro de mídia virtual no WordPress;
- associação da mídia virtual ao post;
- exclusão idempotente da mídia original;
- auditoria final e conclusão da migration;
- fechamento do checkpoint somente quando todos os candidatos da página foram
  resolvidos.

## Componentes

| Arquivo | Responsabilidade |
| --- | --- |
| `PEL _ Migração Featured IMG _ PAI.json` | Orquestra reserva, upload, associação, exclusão e checkpoint. |
| `PEL _ Featured Associação WP _ Sub 01 Fluxo.json` | Registra e associa a mídia virtual. |
| `PEL _ Featured Exclusão e Auditoria _ Sub 02.json` | Exclui a mídia original e confirma o resultado. |
| `SP_WP_*.sql` | Contratos transacionais e de checkpoint no MySQL. |
| `docs/runbooks/` | Procedimentos de operação e recuperação. |
| `BACKLOG.md` | Pendências priorizadas e critérios de aceite. |
| `CHANGELOG.md` | Registro das correções e decisões aplicadas. |

## Regras de segurança operacional

1. O banco é a fonte canônica para um storage já registrado.
2. Uma migration não pode trocar de provedor ou URL silenciosamente.
3. `404/rest_post_invalid_id` confirma que a mídia original foi excluída.
4. `429` e erros transitórios `5xx` não confirmam exclusão; deve-se repetir
   somente a consulta GET após o intervalo indicado.
5. `HTTP 200` na confirmação informa que a mídia ainda existe e exige novo
   DELETE antes da conclusão.
6. O checkpoint avança somente quando todos os candidatos da página estão
   resolvidos.

## Estado operacional

Consulte [STATUS.md](docs/STATUS.md) antes de executar ou retomar um lote. O
incidente e a recuperação da página 79 estão documentados em
[pagina-79-storage-e-exclusao.md](docs/incidentes/2026-10-20-pagina-79-storage-e-exclusao.md).

## Sincronização dos exports

Os JSONs são snapshots dos workflows n8n. Toda alteração aplicada diretamente
no n8n deve ser reexportada, validada e versionada. Códigos isolados usados em
recuperações ficam em `workflows/recovery/` para auditoria e reaplicação.
