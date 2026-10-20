# Página 79: conflito de storage e confirmação de exclusão

Data: 2026-10-20.

## Resumo

O registro do lote 498/500/501 foi bloqueado porque a migration 498 já possuía
um storage Cloudinary canônico e a nova execução produziu um objeto no
Cloudflare R2. A SP rejeitou corretamente a troca de identidade do storage.

Depois da reconciliação, o Sub 02 encontrou respostas transitórias durante a
exclusão da mídia original 6952: primeiro `504`, depois um GET `200`, comprovando
que o DELETE anterior não havia terminado. Um segundo DELETE retornou
`deleted: true`; a confirmação seguinte recebeu `429`.

## Recuperação aplicada

1. `SP | Registra Lote` foi executada somente para as migrations 500 e 501.
2. O banco foi consultado para as três migrations.
3. `Recupera | Lote Repositório` reconciliou o lote usando o banco como fonte
   canônica:
   - 498: Cloudinary existente;
   - 500 e 501: Cloudflare R2 recém-registrado.
4. O Sub 01 processou os três itens.
5. No Sub 02, respostas 504/429 foram tratadas como inconclusivas; HTTP 200 foi
   tratado como evidência de que a mídia ainda existia.
6. O DELETE foi repetido somente depois de o GET confirmar a existência da
   mídia 6952.

## Evidências relevantes

- SHA-256 da migration 498:
  `74b71b38cb9e2cb3093e5595a9d64742d1b96e3f11c033cc422f0357d3119514`.
- Storage canônico: Cloudinary, public ID
  `pel/featured/74b71b38cb9e2cb3093e5595a9d64742d1b96e3f11c033cc422f0357d3119514`.
- Objeto não canônico produzido na tentativa: Cloudflare R2 com a mesma key.
- Segundo DELETE da mídia 6952: `deleted: true`.
- GET posterior: HTTP 429, portanto ainda não é evidência final de ausência.

## Decisões

- O storage já persistido nunca é substituído silenciosamente.
- Um timeout de DELETE ou de GET não implica sucesso nem falha definitiva.
- Somente `404/rest_post_invalid_id` libera a conclusão da exclusão.
- HTTP 200 exige novo DELETE; HTTP 429/504 exige backoff e novo GET.
- O objeto R2 não canônico da migration 498 será tratado por uma rotina de
  limpeza depois que o lote estiver concluído.
