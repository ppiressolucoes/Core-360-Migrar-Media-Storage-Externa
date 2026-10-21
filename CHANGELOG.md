# Changelog

## 2026-10-20

### Corrigido

- contrato genérico de storage nos Sub 01 e Sub 02, cobrindo Cloudinary,
  Cloudflare R2 e Backblaze B2;
- normalização da resposta de criação da mídia virtual com validação de
  `provider`, `public_id`, `asset_id`, URL, SHA-256 e dimensões;
- recuperação das associações produzidas em diferentes `runIndex` do loop;
- confirmação de exclusão pelo par `404/rest_post_invalid_id`;
- distinção entre exclusão confirmada, confirmação pendente e mídia original
  ainda existente;
- recuperação do lote quando o MySQL devolve `[resultset, metadata]` ou repete
  o mesmo SELECT por item de entrada;
- retomada da página 79 preservando o storage canônico já registrado na
  migration 498.

### Operação validada

- migrations 473 a 478 concluídas com Cloudinary, Cloudflare R2 e Backblaze B2;
- migrations 479 a 484 concluídas após tratamento idempotente de DELETE e
  auditoria;
- migrations 491 a 496 concluídas e checkpoint avançado para a página 79;
- migrations 500 e 501 registradas em Cloudflare R2;
- migration 498 reconciliada com o storage Cloudinary canônico do banco;
- segundo DELETE da mídia 6952 retornou `deleted: true`; o GET de confirmação
  subsequente recebeu `429` e permanece pendente de nova confirmação.

### Documentado

- runbook de fechamento e retomada de lote;
- incidente de storage conflitante e timeout/rate limit na página 79;
- backlog para preflight canônico, retry com backoff e limpeza de órfãos.

### Repositório da sprint

- exports n8n separados entre `official` e `legacy`;
- 40 Code nodes extraídos e organizados por workflow;
- procedures MySQL reunidas em `database/procedures`;
- procedure genérica `SP_WP_registra_storage_lote` adicionada;
- contratos de associação e conclusão atualizados para os campos genéricos de
  storage;
- validador de integridade dos artefatos adicionado em
  `tools/validate_artifacts.py`.
- retry de exclusão evoluído para classificar GET 200 como
  `REPETIR_DELETE`, preservando 429/504 como `REPETIR_GET`.
- barreira de conclusão do Sub 02 adicionada para impedir `MIGRATED` sem
  auditoria final `404/rest_post_invalid_id` de todos os itens do lote.
