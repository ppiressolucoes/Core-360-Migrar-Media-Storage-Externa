# Contratos do banco para migração Featured

Esta documentação descreve o esquema informado pelo usuário e as nove procedures SQL anexadas. Os arquivos em `sql/reference/` são referências para revisão, com o `DEFINER` removido; não foram executados ou comparados com o banco implantado.

## Tabelas informadas

| Tabela | Chave e campos de controle |
| --- | --- |
| `WP_migracao_checkpoint` | `processo` (PK), `pagina_atual`, `per_page`, `limite_execucao`, `ultimo_post_id`, `updated_at`. A procedure de fechamento usa `processo = 'FEATURED'`. |
| `WP_migracao_featured` | `id` (PK), `post_id`, `wp_media_id`, `wp_media_id_virtual`, `original_url`, `sha256`, `cloudinary_public_id`, `cloudinary_url`, `status`, `error_message`, `created_at`, `updated_at`, `migrated_at`. `status` aceita `PENDING`, `PROCESSING`, `MIGRATED`, `ERROR` e `SKIPPED`. |

Índices adicionais, constraints e dados não foram fornecidos. `SP_WP_reserva_migracao_featured` usa `ON DUPLICATE KEY UPDATE` para `(post_id, wp_media_id)`; verificar no banco qual chave única garante essa condição antes de homologar retries.

Em `SP_WP_fecha_checkpoint_featured`, uma lista vazia ou sem candidatos válidos produz `v_total = 0` e `v_resolvidos = 0`, permitindo `AVANCADO` se a página coincidir. Os chamadores devem garantir uma lista válida; para proteger o contrato no banco, essa entrada precisa de validação explícita antes de produção.

## Procedures e transições

| Procedure | Entrada | Resultado ou efeito confirmado pelo SQL fornecido |
| --- | --- | --- |
| `SP_WP_reserva_migracao_featured` | candidatos JSON, limite | Reserva candidatos novos, `PENDING` ou `ERROR` como `PROCESSING`; exclui mídias virtuais já registradas; retorna linhas reservadas. |
| `SP_WP_recupera_migracao_featured_processing` | candidatos JSON | Lista migrations `PROCESSING` ainda sem mídia virtual. Não há chamada nos cinco exports recebidos. |
| `SP_WP_registra_cloudinary_lote` | uploads JSON | Grava SHA-256, public ID e URL Cloudinary somente em `PROCESSING`; retorna totais. |
| `SP_WP_registra_midia_externa` | migration, post, mídia original, URL | Marca como `SKIPPED` quando a origem já é externa. |
| `SP_WP_registra_associacao_lote` | associações JSON | Grava `wp_media_id_virtual` somente em `PROCESSING` com URL Cloudinary; rejeita ID virtual divergente. |
| `SP_WP_registra_erro_associacao` | cinco valores escalares | Marca `ERROR` e grava mensagem, sem rebaixar `MIGRATED`; retorna estado. |
| `SP_WP_conclui_migracao_featured_lote` | lote JSON | Valida post, mídia original, mídia virtual e URL; muda `PROCESSING` para `MIGRATED` em transação; aceita replay de `MIGRATED` com o mesmo contexto; retorna `migration_id`, `post_id`, IDs das mídias, `cloudinary_url`, `status`, `migrated_at`. |
| `SP_WP_fecha_checkpoint_featured` | candidatos JSON, página processada, último post | Conta candidatos com `MIGRATED` ou `SKIPPED`; responde `AGUARDANDO`, `AVANCADO` ou `JA_AVANCADO`. Só avança quando todos foram resolvidos e a página atual coincide. |
| `SP_WP_avanca_checkpoint_featured` | página, último post | Avança diretamente a página após validar o ponteiro; não é chamada nos cinco exports recebidos. |

`SP_WP_fecha_checkpoint_featured` efetua `COMMIT` antes de retornar `AVANCADO`. Uma falha posterior no Gmail não deve causar repetição do PAI, da exclusão ou do avanço. Um retry dessa procedure pode retornar `JA_AVANCADO`; a notificação deve ser recuperada isoladamente após conferir se já foi enviada.

## Extensão proposta para múltiplos provedores

`sql/deploy/01_storage_columns.sql` adiciona `storage_provider`, `storage_key`, `storage_url` e `storage_asset_id` a `WP_migracao_featured`, com backfill apenas dos registros `MIGRATED` identificados como Cloudinary. Em produção, o backfill afetou 412 linhas. A procedure `sql/deploy/02` foi instalada; depois, as migrations 470–471 foram reconciliadas individualmente como Cloudinary (`2 / 2 / STORAGE_REGISTRADO`), mantendo `storage_asset_id` e `wp_media_id_virtual` nulos. A 469 permanece `ERROR`, com mídia virtual 89239 e sem `storage_*` reconciliado. Os campos `cloudinary_*` continuam como legado e recebem valores apenas de uploads Cloudinary novos no contrato genérico. `sql/deploy/03` e `04` ainda não têm instalação confirmada em produção.
