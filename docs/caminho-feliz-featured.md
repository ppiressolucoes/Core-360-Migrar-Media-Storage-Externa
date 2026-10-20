# Ativação controlada da migração Featured

**Atualização em 20/10/2026:** as páginas 74 e 75 já foram concluídas. O ponteiro informado está na página 76. Este roteiro registra o diagnóstico histórico; para o estado confirmado e as correções incorporadas, consulte [fechamento da página 75](fechamento-pagina-75.md).

Este roteiro usa somente o Worker `migrar-pel-featured-proxy`. O Worker compartilhado `n8n-pel-proxy` e os fluxos editoriais permanecem na versão publicada. A agenda do PAI fica pausada até o fechamento de um item controlado.

## 1. Validar o Worker novo

Publicar `workers/migrar-pel-featured-proxy.js` como **novo** Worker com o nome `migrar-pel-featured-proxy`. Consultar:

1. `https://migrar-pel-featured-proxy.core360.workers.dev/energia/health` → HTTP 200, `proxy = migrar-pel-featured-proxy`.
2. `https://migrar-pel-featured-proxy.core360.workers.dev/energia/wp-json/wp/v2/posts?per_page=1&_fields=id` → resposta REST do WordPress. Um `origin_error` 503 vem da origem; não iniciar POST enquanto persistir.

O host novo ainda não foi acessível deste ambiente por bloqueio do túnel de saída. O retorno do operador no Cloudflare/navegador é a evidência para passar à etapa seguinte.

## 2. Aplicar as rotas apenas nos três fluxos

Os exports em `workflows/` estão inativos e já apontam para o novo host. No n8n, conferir as URLs destes nodes ao importar ou atualizar a versão de migração:

| Fluxo | Nodes HTTP | Quantidade |
| --- | --- | ---: |
| PAI | `Busca Posts`, `GET | Featured Media`, `Download | Featured IMG` | 3 |
| Associação | registro e retry, associação e retry, GET de metadados, post e mídia virtual, confirmação pós-erro | 8 |
| Exclusão/auditoria | DELETE original e quatro GETs de confirmação e auditoria | 5 |

Nos quatro POSTs da associação, usar `/energia/wp-json/m360/v1/external-featured-media` ou `/assign`, sem `Send Query Parameters/rest_route`. Manter Basic Auth e o corpo JSON. Conferir referências aos IDs dos subfluxos e credenciais depois da importação; o export não contém credenciais utilizáveis. Não ativar a agenda ao importar.

## 3. Confirmar contrato antes de executar

As procedures `sql/deploy/01` a `04` e os exports multi-provider formam um único contrato. `01_storage_columns.sql` foi aplicado em produção: 412 migrations `MIGRATED` Cloudinary receberam backfill. `02_SP_WP_registra_storage_lote.sql` também foi instalada e registrou o storage das migrations 470–471, com `storage_asset_id` nulo por perda do histórico da execução. A 469 permanece para reconciliação. As procedures `03` e `04` ainda não têm instalação confirmada em produção. O código recebido do plugin WordPress v0.1.9 confirma que `asset_id` não pode ser vazio e que o registro deduplica apenas por SHA após validar o payload. Consulte [contrato do plugin](contrato-plugin-wp-v0.1.9.md) antes de retomar a associação; o ZIP não comprova sozinho a resposta real do WordPress para R2.

No subfluxo de associação, `Metadados Featured IMG` recebe o ID de `Normaliza | Mídia Virtual Criada`, inclusive após retry. Os classificadores de `/assign` preservam `response_post_id`, `response_attachment_id` e `response_featured_media` separadamente dos IDs esperados; `Valida | Associação WP` confere os valores reais. `Valida | Featured Atual` exige que o GET posterior do post retorne esse mesmo ID virtual antes de liberar exclusão. `Valida | Exclusão Liberada` aceita igualdade exata de URL para qualquer provider e, apenas para Cloudinary, a variante responsiva `c_limit,w_N` do mesmo cloud, versão e asset. Os códigos para esses nodes estão em `workflows/nodes/`. Os dois nodes de erro chamam `SP_WP_registra_erro_associacao` com cinco parâmetros SQL.

## 4. Executar um item salvo, sem repetir upload

As migrations 469–471 já tiveram upload externo confirmado na execução da página 74. O upload observado da 469 foi para R2; os de 470–471 foram para Cloudinary. Uma consulta posterior do banco mostra 469 em `ERROR`, com `wp_media_id_virtual = 89239` e URL `https://res.cloudinary.com/yezowpnj/image/upload/v1792420814/pel/featured/936704c6b5e4af2f443761458acf4c686f04f5dd9d24578b72c11387b17a7bcd.jpg`; 470–471 estão em `PROCESSING`, com URL gravada e sem ID virtual. A mensagem de erro da 469 é o 502 de retransmissão do corpo pelo proxy compartilhado. O GET via Worker exclusivo confirmou que o attachment 89239 existe e seu `source_url` contém a variante `c_limit,w_768` do mesmo asset Cloudinary; o post 6625 ainda usa `featured_media = 6630` (original). A 469 ainda não está associada e não pode seguir para exclusão. Antes de repetir `Registrar Mídia Virtual WP` para qualquer item, conferir no banco e no WordPress se já existe attachment virtual para a mesma mídia/SHA; HTTP 503/502 anterior não prova ausência de criação. Iniciar por **um** item com o contexto de storage persistido, sem executar de novo `Download`, `Chamar Repositório Externo` ou `Monta | Lote Uploads`.

Sequência esperada para cada item: `Registrar Mídia Virtual WP` (200/201 + `attachment_id`) → `Normaliza | Mídia Virtual Criada` → GET metadados → `/assign` (post, attachment e featured iguais aos esperados) → `SP | Registra Associação WP` → GET post e mídia virtual → confirmação do ID virtual no post e da identidade do asset em `source_url` → exclusão original auditada → `SP | Conclui Migração Lote` (`MIGRATED`). O checkpoint da página 74 só deve avançar após os seis candidatos estarem resolvidos; não avançá-lo manualmente.

Se houver `origin_redirect`, inspecionar `location` e corrigir a URL antes de novo POST. Se houver `origin_error` 503, tratar a disponibilidade do WordPress. Se `/assign` devolver IDs divergentes ou a URL virtual divergir da URL canônica, interromper antes da exclusão original.
