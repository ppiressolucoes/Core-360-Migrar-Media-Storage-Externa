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
| `workflows/n8n/official/` | Exports JSON dos workflows oficiais da sprint. |
| `workflows/n8n/legacy/` | Exports substituídos, mantidos somente para histórico. |
| `workflows/code/` | Code nodes JavaScript separados e organizados por fluxo. |
| `database/procedures/` | Stored procedures MySQL utilizadas pelo Core. |
| `database/legacy/` | Procedures substituídas pelo contrato genérico de storage. |
| `docs/runbooks/` | Procedimentos de operação e recuperação. |
| `BACKLOG.md` | Pendências priorizadas e critérios de aceite. |
| `docs/planejamento/` | Planos de execução, alinhamentos e evidências de acompanhamento. |
| `CHANGELOG.md` | Registro das correções e decisões aplicadas. |

## Registro da evolução

Avanços, alinhamentos, ações e aprendizados deste Core devem ser registrados no
repositório e publicados no remoto. O backlog contém as pendências; planos e
evidências datados ficam em `docs/planejamento/`; alterações efetivas entram no
`CHANGELOG.md`. O plano atual está em
[2026-10-23-evolucao-core.md](docs/planejamento/2026-10-23-evolucao-core.md).

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
O relato ainda em apuração da página 87 está em
[pagina-87-sem-reserva.md](docs/runbooks/pagina-87-sem-reserva.md).

## Sincronização dos exports

Os JSONs são snapshots dos workflows n8n. Toda alteração aplicada diretamente
no n8n deve ser reexportada, validada e versionada. Códigos isolados usados em
recuperações ficam em `workflows/recovery/` para auditoria e reaplicação.

O inventário completo da sprint está em [SPRINT-2026-10-20.md](SPRINT-2026-10-20.md).
