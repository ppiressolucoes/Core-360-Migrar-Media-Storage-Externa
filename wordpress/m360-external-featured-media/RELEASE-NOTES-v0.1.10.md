# M360 - Core Media Storage External v0.1.10

## Registro de mídia virtual

O registro agora reutiliza um attachment somente quando SHA-256, provider, asset ID, public ID, URL canônica, dimensões e MIME correspondem à requisição. A busca examina todos os attachments com o mesmo SHA, pois os mesmos bytes podem estar armazenados em Cloudinary, R2 ou B2.

No caso da migration 493, o attachment Cloudinary 86711 deixa de ser retornado para a requisição R2. Uma nova chamada com os dados R2 cria um attachment próprio, ou reutiliza um attachment R2 integralmente correspondente se já existir. O attachment Cloudinary existente não é alterado.

## Compatibilidade e validação

- O formato das rotas e respostas REST permanece igual ao da v0.1.9.
- Attachments legados Cloudinary continuam elegíveis quando seus metadados correspondem integralmente à requisição.
- Repetir o mesmo POST retorna o attachment criado anteriormente com `existing: true`.
- Após instalar, repetir apenas o registro da migration 493 e verificar `provider: cloudflare_r2`, URL R2 e `attachment_id` diferente de 86711 antes de associar o post.
