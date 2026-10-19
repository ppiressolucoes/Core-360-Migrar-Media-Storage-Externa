# Isolamento do proxy da migração Featured

## Limite da mudança

O Worker `n8n-pel-proxy.core360.workers.dev` atende outros fluxos WordPress homologados. **Não alterar nem substituir esse Worker para a migração.** O código em `workers/n8n-pel-featured-proxy.js` é um Worker separado, proposto para o nome `n8n-pel-featured-proxy.core360.workers.dev`. Os três exports inativos `pel-featured-pai.json`, `pel-featured-associacao-wp.json` e `pel-featured-exclusao-auditoria.json` apontam apenas para esse novo host. Se o nome publicado for diferente, atualizar os três exports antes da importação; não criar uma rota que substitua a do Worker compartilhado.

O novo Worker atende somente às chamadas observadas nos três fluxos:

| Método | Rota `/energia/...` | Uso |
| --- | --- | --- |
| GET | `/health` | Diagnóstico do Worker |
| GET | `/wp-json/wp/v2/posts` e `/posts/{id}` | Paginação e validação |
| GET, DELETE | `/wp-json/wp/v2/media/{id}` | Validação e exclusão auditada |
| GET, HEAD | `/wp-content/uploads/*` | Leitura da imagem original |
| POST | `/wp-json/m360/v1/external-featured-media` | Registro da mídia virtual |
| POST | `/wp-json/m360/v1/external-featured-media/assign` | Associação ao post |

Outras rotas retornam 404 sem chamada à origem. POST e DELETE usam `redirect: 'manual'`: se o WordPress redirecionar, o Worker devolve `origin_redirect`, `origin_status` e `location` em HTTP 502, sem repetir o corpo ou a exclusão. GET e HEAD mantêm `redirect: 'follow'`. Um 503 com `status = origin_error` ainda é emitido pelo WordPress; o isolamento do código não isola a capacidade da origem.

## Publicação controlada

1. Criar **um novo Worker** no Cloudflare com `workers/n8n-pel-featured-proxy.js`. Conferir o host antes de publicar. Não editar o deployment de `n8n-pel-proxy` nem as rotas usadas pelos fluxos editoriais.
2. Testar `GET /energia/health` no host novo: HTTP 200, `proxy = n8n-pel-featured-proxy`. Testar uma leitura pequena: `GET /energia/wp-json/wp/v2/posts?per_page=1&_fields=id`. Se houver 503, comparar no mesmo horário com `https://energialimpa.live/wp-json/wp/v2/posts?per_page=1&_fields=id` e tratar a indisponibilidade da origem antes de fazer POST.
3. Conferir schema e procedures `sql/deploy/01` a `04` antes de importar a versão multi-provider dos fluxos. O banco de produção informado não possui colunas `storage_*`. Confirmar o contrato do endpoint WP para `provider`, SHA e URL canônica; o código do plugin não está neste repositório. Sem isso, não há validação do caminho R2 nem autorização técnica para excluir a mídia original.
4. Importar os subfluxos **inativos** de associação e exclusão/auditoria, religar credenciais e ajustar os IDs de chamada. Importar o PAI inativo por último. Conferir que os 16 campos URL desses três fluxos usam o host novo e que os outros fluxos n8n continuam no Worker compartilhado. Não importar o arquivo do Worker como workflow n8n.
5. Manter a agenda pausada e executar um item controlado depois de reconciliar no banco e no WordPress qualquer attachment virtual já criado. Para a página 74, os uploads de 469–471 já foram confirmados; não repetir o Loop de upload. A exclusão e o checkpoint só avançam após associação e auditoria válidas.

O teste local `node --test tests/featured-proxy-isolation.test.js` verifica a troca de host nos exports, as rotas usadas pelos três fluxos, o bloqueio de rota fora do escopo e o retorno de `Location` após um redirect de POST. Ele não demonstra que o Worker foi publicado nem que o WordPress está disponível.
