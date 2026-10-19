# Contrato observado: M360 Core Media Storage External v0.1.9

Fonte: ZIP `m360-external-featured-media-wordpress-v0.1.9.zip` enviado pelo operador em 19/10/2026. A captura do WordPress mostra essa versão ativa. Esta nota descreve o código recebido; não substitui uma conferência da implantação efetiva.

## Registro `POST /m360/v1/external-featured-media`

- Exige usuário com `upload_files` e aceita `provider`, `sha256`, `asset_id`, `public_id`, `secure_url`, `width`, `height`, `mime_type` e `original_filename`.
- `sha256` deve ter 64 dígitos hexadecimais. O provider deve existir e estar habilitado no Storage Provider Registry. Sua URL precisa ser HTTPS e ter host autorizado pelo provider. O default do registry aceita `res.cloudinary.com` para Cloudinary e `*.r2.dev` para Cloudflare R2.
- `asset_id` e `public_id` **não podem estar vazios**; largura e altura devem ser positivas; MIME deve começar com `image/`. Essas validações ocorrem **antes** da busca por attachment existente. Portanto um `asset_id` nulo na chamada não permite recuperar nem mesmo um attachment já criado.
- Depois das validações, o plugin procura o primeiro attachment com meta `_m360_external_media_sha256` igual ao SHA. Se encontrar, retorna o attachment existente, **sem comparar** `provider`, `public_id`, `asset_id` ou `secure_url` recebidos com os metadados gravados. A retomada precisa comparar explicitamente a URL canônica e o provider retornados com a migration antes de seguir para `/assign` ou exclusão.
- Se não encontrar, cria attachment `inherit`, com `guid = secure_url`, e grava `_m360_external_storage_provider`, `_m360_external_storage_asset_id`, `_m360_external_storage_public_id`, `_m360_external_storage_url` e metadados de largura e altura. Para Cloudinary também preenche as chaves legadas `_m360_external_cloudinary_*`.

## Associação e entrega

`POST /m360/v1/external-featured-media/assign` exige `edit_posts`, `edit_post` no post e um attachment marcado como externo M360. Faz `set_post_thumbnail` e retorna `post_id`, `attachment_id`, `featured_media` e a URL canônica persistida. Esse endpoint não compara a URL do attachment com a migration; a validação de URL deve ocorrer no fluxo antes da exclusão.

Para Cloudinary, o plugin serve a URL com transformação `c_limit,w_768` (ou largura original se menor); para providers com `passthrough`, serve a URL canônica. A validação de exclusão versionada aceita apenas a transformação Cloudinary `c_limit,w_N` do mesmo cloud, versão e asset.

## Consequência para a página 74

As migrations 470 e 471 têm `storage_asset_id = NULL` porque o histórico da execução foi perdido. Não enviar `NULL` ao registro WP nem inventar um asset ID: o plugin devolve HTTP 400 `invalid_external_url` antes da deduplicação. Primeiro localizar attachments existentes por `_m360_external_media_sha256` e comparar seus metadados com o banco. Se não existirem, recuperar os asset IDs reais nas contas Cloudinary `gbjn0cjg` e `nksstmuv` correspondentes às URLs registradas. A migration 469 já possui attachment 89239, mas o post 6625 ainda usa a mídia original 6630.
