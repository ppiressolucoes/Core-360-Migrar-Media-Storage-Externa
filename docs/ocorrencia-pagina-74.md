# Agendamento Featured: página 74 aguardando

## Estado atualizado: 19/10/2026

O script de colunas `sql/deploy/01` foi aplicado em produção: o backfill atingiu 412 migrations `MIGRATED` Cloudinary e 469–471 ficaram com `storage_*` nulos. A migration 469 está em `ERROR`, com mídia virtual 89239 e URL Cloudinary `https://res.cloudinary.com/yezowpnj/image/upload/v1792420814/pel/featured/936704c6b5e4af2f443761458acf4c686f04f5dd9d24578b72c11387b17a7bcd.jpg`. O erro gravado é o 502 de retransmissão de POST após redirect no proxy compartilhado. O GET via Worker exclusivo confirmou que a mídia 89239 tem `source_url` Cloudinary com transformação `c_limit,w_768` para o mesmo cloud, versão e asset; o post 6625 ainda aponta para a mídia original 6630. Na captura mais recente, 470–471 estão em `PROCESSING`, com URL externa e sem ID virtual. O upload R2 anterior da 469 existe como evento observado, mas não é a URL atualmente gravada no banco.

As URLs Cloudinary atuais de 470 e 471 são, respectivamente, `gbjn0cjg/v1792420826` e `nksstmuv/v1792420837` para seus SHA-256 já registrados. Os outputs salvos dessa execução não estão disponíveis. Os outputs anteriores (`mlobcylk/v1792417675` e `sk9mbfyb/v1792417687`) são obsoletos; não os enviar à procedure. O script [reconcilia_storage_470_471.sql](../sql/maintenance/reconcilia_storage_470_471.sql) contém um `CALL` restrito às duas linhas atuais, com `storage_asset_id` nulo, aceito pela procedure. Conferir o SELECT antes, executar somente o CALL, e conferir o SELECT depois. Isso registra o storage; não comprova a criação ou associação das mídias virtuais no WordPress.

**Registro confirmado em produção:** `SP_WP_registra_storage_lote` retornou `2 / 2 / STORAGE_REGISTRADO`. O SELECT posterior mostra 470 e 471 ainda em `PROCESSING`, agora com `storage_provider = cloudinary`, `storage_key` e `storage_url` preenchidos; `storage_asset_id` e `wp_media_id_virtual` continuam nulos. Não repetir o `CALL` nem o upload. O PAI usa o contexto da execução perdida em `Recupera | Lote Cloudinary`; a próxima retomada deve fornecer entrada controlada diretamente ao subfluxo de associação. Antes do POST, verificar o contrato do endpoint WordPress quanto a `asset_id` nulo e deduplicação por SHA, e conferir se já há attachments virtuais para os dois SHA. O agendamento continua pausado.

**As instruções de retomada abaixo registram o diagnóstico anterior e não são executáveis para o estado atual.** Não reenviar o lote 469–471 à procedure: 469 está fora de `PROCESSING` e já possui mídia virtual. O GET confirmou que 469 precisa de associação ao post antes de qualquer exclusão. O backfill em `sql/deploy/01` limita-se a linhas `MIGRATED` Cloudinary identificáveis, deixando 469–471 para reconciliação individual. Manter a agenda pausada.

## Evidência de 19/10/2026

O checkpoint da página 73 avançou: a execução atual iniciou com `pagina_atual = 74` e `ultimo_post_id = 6589`. `Monta | Candidatos [5]` informou seis candidatos para a página 74, com `ultimo_post_pagina = 6642`.

`Normaliza | Lote Reservado` retornou `tem_reserva = false`, `total_reservado = 0`, `etapa = SEM_CANDIDATOS_ELEGIVEIS`. `SP | Fecha Checkpoint` retornou `AGUARDANDO`, `total_candidatos = 6`, `total_resolvidos = 3`, `pagina_atual = 74`, `ultimo_post_id = 6589`. O item `affectedRows = 9` é metadado do driver MySQL e não altera a contagem de resolvidos.

`Monta | Candidatos [5]` retornou, em ordem: `(6593, 89027)`, `(6600, 89028)`, `(6610, 89029)`, `(6625, 6630)`, `(6633, 6639)` e `(6642, 6643)`. O limite de reserva é três. A consulta posterior confirmou que as mídias 89027–89029 são virtuais e que os três últimos pares estão bloqueados.

A saída bruta de `SP | Reserva Lote` foi `[[], {"fieldCount": 0, "affectedRows": 6, ...}]`. O resultset funcional está realmente vazio; o normalizador não omitiu linhas. `affectedRows = 6` é metadado do driver e não significa seis reservas.

A consulta aos seis pares confirmou as migrations **466–468 `MIGRATED`**, com mídias virtuais 89027–89029 e URLs Cloudinary. As migrations **469** `(6625, 6630)`, **470** `(6633, 6639)` e **471** `(6642, 6643)` estão `PROCESSING`, com `sha256`, `cloudinary_public_id`, `cloudinary_url` e `wp_media_id_virtual` nulos. São elas que bloqueiam a página. Os horários de `updated_at` não estavam legíveis na captura; não há evidência do ponto exato em que as tentativas anteriores pararam nem de ausência de assets externos.

Esses dados mostram que **três candidatos da página 74 ainda não estão resolvidos e nenhum entrou na reserva**. A reserva exclui os três em `PROCESSING`; os três já `MIGRATED` são mídias virtuais e não devem ser reservados de novo. `Busca Posts` ordena por `date ASC`; não é seguro inferir os seis IDs a partir do intervalo entre `ultimo_post_id` e `ultimo_post_pagina`.

O export versionado do PAI contém `Valida | Checkpoint PAI`, que sinaliza erro quando há zero reservas e o checkpoint está `AGUARDANDO`. A captura da execução publicada termina no node `SP | Fecha Checkpoint` sem mostrar essa validação conectada. Conferir a versão publicada antes de reativar a agenda; esse guard torna o bloqueio visível, mas não resolve as três migrations.

## Consulta de diagnóstico usada

A consulta **somente leitura** abaixo vinculou cada featured media atual tanto pela mídia original quanto pela virtual:

```sql
SELECT
    c.post_id,
    c.wp_media_id AS featured_media_atual,
    m.id AS migration_id,
    m.wp_media_id AS wp_media_id_original,
    m.wp_media_id_virtual,
    m.status,
    m.sha256,
    m.cloudinary_public_id,
    m.cloudinary_url,
    m.error_message,
    m.updated_at,
    CASE
        WHEN m.id IS NULL THEN 'SEM_REGISTRO'
        WHEN m.wp_media_id_virtual = c.wp_media_id THEN 'MIDIA_VIRTUAL'
        WHEN m.wp_media_id = c.wp_media_id THEN 'MIDIA_ORIGINAL'
    END AS vinculo
FROM (
    SELECT 6593 AS post_id, 89027 AS wp_media_id
    UNION ALL SELECT 6600, 89028
    UNION ALL SELECT 6610, 89029
    UNION ALL SELECT 6625, 6630
    UNION ALL SELECT 6633, 6639
    UNION ALL SELECT 6642, 6643
) AS c
LEFT JOIN WP_migracao_featured m
  ON m.post_id = c.post_id
 AND (m.wp_media_id = c.wp_media_id
      OR m.wp_media_id_virtual = c.wp_media_id)
ORDER BY c.post_id, m.id;
```

## Falha posterior no lote misto

A tentativa seguinte enviou três objetos ao armazenamento externo e falhou em `Monta | Lote Uploads`, antes do registro no banco. O item **469** foi enviado ao `cloudflare_r2`, enquanto **470** e **471** foram ao `cloudinary`. Os três outputs têm `upload_ok = true`. O export `SUB | Storage Media External` confirma que a reserva ativa escolhe o provider e que o subfluxo devolve `provider`, `sha256`, `public_id`, `secure_url`, `asset_id` e `mime_type`. O PAI antigo perdia o campo `provider`, colocava URL R2 em `cloudinary_url` e exigia o host Cloudinary ao montar o lote.

O usuário forneceu também a resposta bruta do node `Upload S3R2 - Proxy` para a **469**: `success = true`, `existing = false`, `provider = cloudflare_r2`, `mime_type = image/jpeg`, `bytes = 59593`, dimensões `840 × 560` e `object_key = pel/featured/936704c6b5e4af2f443761458acf4c686f04f5dd9d24578b72c11387b17a7bcd.jpg`. O `public_id` não contém a extensão; a URL pública contém. Essa resposta confirma que o proxy informou sucesso no upload, mas não demonstra, sozinha, a associação WordPress ou a finalização da reserva. Uma tentativa de HEAD externo neste ambiente recebeu 403 do túnel de saída antes de chegar ao R2; não é uma verificação da disponibilidade do objeto.

| Migration | Post/mídia original | Provider | SHA-256 |
| --- | --- | --- | --- |
| 469 | 6625/6630 | `cloudflare_r2` | `936704c6b5e4af2f443761458acf4c686f04f5dd9d24578b72c11387b17a7bcd` |
| 470 | 6633/6639 | `cloudinary` | `05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4` |
| 471 | 6642/6643 | `cloudinary` | `bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080` |

**Manter o agendamento pausado. Não reclassificar 469–471 como `ERROR` nem reiniciar o PAI desde o upload:** isso pode repetir uploads já confirmados. Conferir o estado atual no banco, a existência dos três objetos externos e se há attachment virtual criado antes de retomar. O estado do banco após a falha ainda não foi enviado pelo usuário.

```sql
SELECT id, post_id, wp_media_id, status, sha256,
       cloudinary_public_id, cloudinary_url, wp_media_id_virtual, updated_at
FROM WP_migracao_featured
WHERE id IN (469, 470, 471)
ORDER BY id;
```

## Mudança proposta no repositório

O PAI versionado chama `SUB | Storage Media External`, preserva `storage_provider`, `storage_key`, `storage_url` e metadados por item; `Monta | Lote Uploads` reconhece também os três outputs antigos pela URL para permitir retomada da execução salva. A nova procedure `SP_WP_registra_storage_lote` grava o provider e a URL canônica; as procedures de associação e conclusão usam `storage_url`. O subfluxo WP envia `provider` ao endpoint `/m360/v1/external-featured-media`; a exclusão original só é liberada quando a URL da mídia virtual realmente servida pelo WordPress coincide com a URL canônica, inclusive o host.

### Plano anterior de registro do lote (histórico; não executar)

O PAI publicado **ainda não chegou a `SP | Registra Cloudinary Lote`** nesta tentativa. O contrato WordPress não bloqueia a verificação isolada de montagem e registro. Com a agenda pausada:

**Correção mínima no schema atual:** colar `workflows/nodes/monta-lote-uploads-compat-db-atual.js` no node `Monta | Lote Uploads` e manter a chamada existente a `SP_WP_registra_cloudinary_lote`. O código aceita qualquer repositório que devolva uma URL HTTPS, `public_id`, SHA-256 e confirmação de upload; não exige host ou caminho específicos. Preserva o `provider` explícito que vier do subfluxo e usa o host como identificador nos outputs antigos sem esse campo. Para satisfazer a procedure atual, preenche os campos legados `cloudinary_public_id` e `cloudinary_url` mesmo quando a URL é de outro repositório. Esses nomes no banco passam a representar o objeto externo, sem provar que o provider é Cloudinary. Executar primeiro somente o node de montagem com os três itens salvos, conferir o lote e depois somente o node de registro. Isso dispensa o DDL para **essa passagem**, mas não altera os contratos posteriores de WordPress, exclusão e auditoria. A validação de exclusão antiga ainda exige host Cloudinary e bloqueará a conclusão de uma URL R2; não contornar essa barreira sem validar a URL efetiva do attachment virtual no WP.

**Evolução com colunas genéricas:** os passos seguintes usam `storage_*` e `SP_WP_registra_storage_lote`. Aplicá-los quando for publicar o PAI e os subfluxos com contrato genérico completo. Não misturar o código de montagem genérico com a procedure antiga: nele, os campos `cloudinary_*` ficam nulos para R2.

1. Conferir `SELECT DATABASE()` para garantir que a conexão usa o schema de `WP_migracao_featured`. **Antes do DDL, não selecionar colunas `storage_*`: elas ainda não existem e causam erro 1054.** Usar a consulta abaixo. O registro controlado exige os três em `PROCESSING`, sem URL Cloudinary ou mídia virtual já gravada.

```sql
SELECT DATABASE() AS schema_atual;

SELECT id, post_id, wp_media_id, status, sha256,
       cloudinary_public_id, cloudinary_url, wp_media_id_virtual, updated_at
FROM WP_migracao_featured
WHERE id IN (469, 470, 471)
ORDER BY id;
```

2. Aplicar `sql/deploy/01_storage_columns.sql` e `sql/deploy/02_SP_WP_registra_storage_lote.sql` em ambiente controlado. O DDL é de execução única. O novo procedimento requer `PROCESSING` e bloqueia um storage diferente já registrado.
3. No PAI, atualizar apenas o código de `Monta | Lote Uploads` com `workflows/nodes/monta-lote-uploads.js` e alterar a query do node de registro para `CALL SP_WP_registra_storage_lote(...)`, mantendo o JSON do lote como argumento. Os três outputs antigos ainda trazem campos chamados `cloudinary_*`; o novo `Monta` identifica a 469 como R2 pela URL e emite `storage_*` sem marcar R2 como Cloudinary.
4. Executar **somente** `Monta | Lote Uploads` com os três itens já capturados. Esperado: `total_uploads = 3`, providers `[cloudflare_r2, cloudinary, cloudinary]`, IDs `[469,470,471]`. Executar então **somente** o node de registro com essa saída, sem disparar novamente o Loop/upload nem a associação WP. Esperado: `STORAGE_REGISTRADO`, `total_atualizados = 3`.
5. Conferir as três linhas no banco antes de prosseguir:

```sql
SELECT id, status, sha256, storage_provider, storage_key, storage_url,
       cloudinary_public_id, cloudinary_url, wp_media_id_virtual
FROM WP_migracao_featured
WHERE id IN (469, 470, 471)
ORDER BY id;
```

Esperado: 469 com `storage_provider = cloudflare_r2`, URL R2 e `cloudinary_url IS NULL`; 470–471 com `storage_provider = cloudinary` e URL Cloudinary. Os três permanecem `PROCESSING` até a associação e conclusão. Se a execução salva não permitir executar os nodes isoladamente, não reiniciar o PAI inteiro: reconstruir a entrada de `Monta` com os três outputs preservados e o contexto da página 74.

### Plano anterior para WordPress e conclusão (histórico; não executar)

Antes de avançar do registro para o subfluxo WP, conferir o contrato do endpoint `/m360/v1/external-featured-media` para `provider`, `secure_url`, `public_id` e deduplicação por SHA. Esse código não foi fornecido e os testes locais não provam o comportamento do WP. Instalar as procedures de associação e conclusão (`sql/deploy/03` e `04`) junto dos exports atualizados desses subfluxos. Se o endpoint reaproveitar attachment de outro repositório, a validação de URL deve bloquear a exclusão original. Confirmar associação WP, URL pública, auditoria e conclusão antes de avançar o checkpoint. O checkpoint esperado é `total_resolvidos = 6`, `pagina_atual = 75`, `ultimo_post_id = 6642`.

O export recebido do subfluxo Storage tinha uma chave literal no cabeçalho. A cópia versionada foi saneada; trocar a chave no serviço e configurar credencial gerenciada do n8n antes de importar esse export.

## Falha no subfluxo de associação WP: migration 470

Depois de o PAI avançar, a **primeira chamada** de `Registrar Mídia Virtual WP` para a migration 470 retornou HTTP **503** da origem `energialimpa.live`: body HTML "The server is temporarily busy, try again later!". O proxy informou `origin_status = 503`, `statusCode = 503` e `target = https://energialimpa.live/?rest_route=%2Fm360%2Fv1%2Fexternal-featured-media`; não houve `Location` nesse resultado. O node de classificação trata 503 como transitório e envia ao `Wait 120S`, seguido de retry. A saída bruta de `Retry | Registrar Mídia Virtual WP` confirmou depois **502 `proxy_error`**, com a mensagem de que o proxy não conseguiu retransmitir o corpo do POST após um redirecionamento. A resposta do retry não inclui `target` nem `Location`; não sabemos qual URL redirecionou. Nenhuma dessas respostas confirma criação do attachment virtual.

O export recebido chamava o proxy em `/energia` com `rest_route` na query. A versão proposta troca os quatro POSTs de registro/associação (incluindo retries) pelas rotas diretas `/energia/wp-json/m360/v1/external-featured-media` e `/energia/wp-json/m360/v1/external-featured-media/assign`. Isso remove uma possível fonte de redirecionamento, mas **não resolve por si só o 503 da origem**; também não prova que a rota antiga causou o 502. O usuário forneceu o código do Worker `n8n-pel-proxy`: ele passa `request.body` (stream de uso único) ao `fetch` com `redirect: 'follow'`. Esse par de opções causa o erro observado quando a origem responde com um redirecionamento que exige retransmitir o corpo. O destino do redirecionamento ainda é desconhecido.

O patch experimental do commit `04cb2e0` manteve as rotas existentes e usou `redirect: 'manual'` para métodos com corpo. Se a origem retornasse 3xx, devolvia HTTP 502 com `body.status = origin_redirect`, `origin_status`, `target` e `location`. Para GET/HEAD, conservava `redirect: 'follow'`. Os testes locais desse commit cobriam 307, sucesso 201 e erro 503; não representavam uma execução real do Cloudflare Worker nem demonstravam a disponibilidade do WordPress.

**Reversão em 19/10/2026:** após a publicação, outro fluxo recebeu HTTP 503 em `GET /wp-json/wp/v2/posts`. O corpo mostra `status = origin_error`, `origin_status = 503` e a página HTML "The server is temporarily busy" emitida pela origem. No código fornecido pelo usuário, GET já usava `redirect: 'follow'`; o patch também preservava esse comportamento, portanto essa evidência não demonstra que a mudança do Worker causou o 503. A pedido do usuário, o arquivo `workers/n8n-pel-proxy.js` voltou ao comportamento anterior para todas as rotas, inclusive `redirect: 'follow'` para POST, mas **é uma referência compacta, não a cópia literal do deployment original de 310 linhas**. Para restaurar o código exato em produção, usar o deployment anterior no histórico do Cloudflare. O problema de retransmissão do corpo em POST permanece nessa versão e o 503 da origem precisa ser investigado separadamente. O patch de diagnóstico continua disponível no commit `04cb2e0`, mas não é mais a versão recomendada para o Worker compartilhado.

Após restaurar o Worker compartilhado, verificar novamente `GET /energia/health` e uma chamada de leitura a `/energia/wp-json/wp/v2/posts`, comparando o resultado com uma chamada direta ao WordPress no mesmo horário. Se ambas retornarem 503, investigar a indisponibilidade/rate limit na origem. As rotas diretas dos POSTs no subfluxo n8n e a chamada SQL com cinco parâmetros permanecem propostas, mas o POST ainda pode encontrar o erro de redirect com o Worker revertido.

O node publicado `SP | Registra Falha Registro Mídia Virtual` então tentou chamar `SP_WP_registra_erro_associacao` com um único argumento JSON, mas a procedure do banco exige cinco argumentos escalares. A chamada falhou com `ER_SP_WRONG_NO_OF_ARGS` e **não registrou o erro** por esse caminho. O export versionado usa cinco placeholders SQL e `Query Parameters`; copiar a query e a opção correspondente desse node. A query também está em `workflows/nodes/sp-registra-falha-registro-midia-virtual.sql`. O parâmetro `wp_media_id_virtual` da 470 deve ser SQL `NULL`, não a string `'null'`.

Manter a agenda pausada. Conferir o estado atual da migration 470 e se o WordPress já criou um attachment para seu SHA antes de repetir o POST; um 502 de proxy não comprova ausência de efeito no destino. Não repetir o upload externo nem avançar o checkpoint manualmente. Depois de corrigir a URL do POST e a query de erro, retomar no passo de registro WP com o contexto já salvo, sem reiniciar a partir do Loop de upload.
