# Fechamento e retomada de lote

## Quando a confirmação do DELETE falhar

Classifique a resposta do GET de `/wp-json/wp/v2/media/{id}`:

| Resposta | Interpretação | Ação |
| --- | --- | --- |
| 404 + `rest_post_invalid_id` | Original ausente | Continuar para auditoria final. |
| 200 | Original ainda existe | Aguardar e repetir o DELETE uma vez. |
| 429 | Rate limit | Aguardar pelo menos 120 s e repetir somente o GET. |
| 504 retryable | Origem indisponível | Respeitar `retry_after` e repetir somente o GET. |
| Outro status | Estado desconhecido | Bloquear a conclusão e registrar a evidência. |

Nunca repita o DELETE apenas porque a resposta anterior foi 429 ou 504. Primeiro
consulte a mídia. O DELETE só deve ser repetido depois de um GET 200.

## Retomada idempotente do Sub 02

1. Use como entrada o lote confirmado pelo Sub 01.
2. Reexecute o Sub 02 desde `GET | Verifica Mídia Original`.
3. Itens já excluídos seguem pelo ramo `Original Já Excluída`.
4. Itens existentes seguem para DELETE.
5. Aguarde a auditoria final de todos os itens.
6. Execute `SP | Conclui Migração Lote`.
7. Execute `SP | Fecha Checkpoint`.

Não reexecute o Sub 01, `SP | Registra Lote` ou uploads já conciliados.

## Validações finais

```sql
SELECT
  id,
  post_id,
  wp_media_id,
  wp_media_id_virtual,
  status,
  storage_provider,
  error_message
FROM WP_migracao_featured
WHERE id IN (498, 500, 501)
ORDER BY id;
```

O lote pode fechar quando as três migrations estiverem em `MIGRATED` e os seis
candidatos da página estiverem resolvidos.
