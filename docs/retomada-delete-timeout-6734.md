# Retomada após timeout no DELETE da mídia 6734

O timeout do primeiro `DELETE | Mídia Original` não revela se o WordPress executou a exclusão. Na tentativa seguinte, o proxy devolveu `origin_status=404` com `origin_body.code=rest_post_invalid_id`. Isso indica que a mídia 6734 não existia no momento dessa tentativa. A confirmação para prosseguir deve vir de um **GET posterior**, com o mesmo ID e o mesmo código.

## Retomada no n8n

1. Manter o PAI sem novo download ou upload. Recuperar o lote validado que entrou em `PEL | Featured Exclusão e Auditoria | Sub Fluxo`, com `migration_id`, `post_id`, mídia original 6734, mídia virtual e `storage_provider`/`storage_url`.
2. Executar o subfluxo de exclusão desde `Valida | Contrato Exclusão`, passando por `GET | Verifica Mídia Original`. Para 6734, exigir `origin_status=404` e `origin_body.code=rest_post_invalid_id`. `Classifica | Mídia Original` deve marcar `original_ja_excluida=true` e `precisa_excluir_original=false`.
3. Confirmar que a saída FALSE de `IF | Precisa Excluir Original?` passa por `Normaliza | Original Já Excluída`. O lote segue para `GET | Auditoria Final Original`; exigir novamente 404 com `rest_post_invalid_id` e `auditoria_confirmada=true` antes de `SP | Conclui Migração Lote`.
4. Após a conclusão, conferir `status=MIGRATED`, `wp_media_id_virtual`, `storage_provider` e `storage_url` da migration correspondente. Deixar `SP | Fecha Checkpoint` avançar somente quando todos os candidatos da página estiverem resolvidos. Não chamar o fechamento isoladamente para 6734.

O export versionado trata um DELETE repetido que receba HTTP 404: `Never Error` mantém a execução, e `GET | Confirma Exclusão Original` usa o ID original do loop, sem depender de `previous.id` no body do DELETE. `Never Error` só cobre respostas HTTP; um novo timeout ainda exige retomar pela leitura inicial.

## Consultas de conferência

No banco **da migração**:

```sql
SELECT id, post_id, wp_media_id, wp_media_id_virtual, status,
       storage_provider, storage_url, error_message
FROM WP_migracao_featured
WHERE wp_media_id = 6734;
```

Pelo proxy WordPress, `GET /energia/wp-json/wp/v2/media/6734` deve retornar 404 com `origin_status=404` e `origin_body.code=rest_post_invalid_id`. O GET do post correspondente deve continuar apontando `featured_media` para o ID virtual, cuja `source_url` deve concordar com `storage_url` antes de qualquer conclusão. Um 404 genérico do proxy, sem resposta da origem, não confirma exclusão.
