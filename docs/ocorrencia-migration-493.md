# Migration 493: SHA compartilhado entre Cloudinary e R2

O lote pinado em `Start WP` na página 78 contém a migration 493 para o post 6906, mídia original 6907, SHA `d5a00dcebe0a12c3d5e18453c0231529af4526a3f2a0d692740ae938997d477b`, `storage_provider=cloudflare_r2` e URL `pub-43dc3ba28cba479abf3287dc11405d82.r2.dev`.

O registro WordPress respondeu HTTP 200, `existing=true`, `attachment_id=86711`, porém `provider=cloudinary` e URL `res.cloudinary.com/yezowpnj`. O node `Normaliza | Mídia Virtual Criada` recusou corretamente essa resposta. O plugin v0.1.9 recuperava o primeiro attachment pelo SHA sem conferir storage. Esse comportamento também pode devolver a URL errada quando há duas contas do mesmo provider.

A versão v0.1.10 em `wordpress/m360-external-featured-media` busca todos os candidatos com o SHA e reutiliza apenas um attachment com a identidade completa do storage. O validador do n8n deve continuar comparando provider, chave, asset ID, URL e dimensões. Não gravar 86711 como `wp_media_id_virtual` da migration 493 nem associá-lo ao post 6906.

## Retomada

1. Conferir a linha atual da migration 493 no banco e a saída efetiva do `Loop` para garantir que ainda apontam ao mesmo R2:

   ```sql
   SELECT id, post_id, wp_media_id, status, sha256,
          storage_provider, storage_key, storage_url,
          storage_asset_id, wp_media_id_virtual
   FROM WP_migracao_featured
   WHERE id = 493;
   ```

2. Instalar a v0.1.10 do plugin e repetir somente `Registrar Mídia Virtual WP vs0.2` para a migration 493, com os valores `storage_*` do banco. O resultado esperado é HTTP 201 com novo ID R2 ou HTTP 200 `existing=true` com ID R2 compatível.
3. Executar o validador do n8n. Prosseguir à associação e à exclusão original somente após o validador confirmar a identidade completa e a auditoria WP liberar a exclusão. Não reiniciar o upload nem fechar o checkpoint da página 78 enquanto houver candidatos pendentes.

O ZIP do plugin v0.1.9 enviado pelo operador é a base desta alteração; o deploy efetivo precisa ser conferido no WordPress antes da retomada.
