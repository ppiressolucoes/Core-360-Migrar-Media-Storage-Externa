# Agendamento Featured: página 74 aguardando

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

### Etapa imediata: montar e registrar o lote

O PAI publicado **ainda não chegou a `SP | Registra Cloudinary Lote`** nesta tentativa. O contrato WordPress não bloqueia a verificação isolada de montagem e registro. Com a agenda pausada:

1. Consultar o estado atual de 469–471 no banco. O registro controlado exige os três em `PROCESSING`, sem outra URL de storage já gravada. Se as colunas `storage_*` ainda não existem, usar a consulta anterior; após o DDL, incluir `storage_provider`, `storage_key` e `storage_url`.
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

### Etapa seguinte: WordPress e conclusão

Antes de avançar do registro para o subfluxo WP, conferir o contrato do endpoint `/m360/v1/external-featured-media` para `provider`, `secure_url`, `public_id` e deduplicação por SHA. Esse código não foi fornecido e os testes locais não provam o comportamento do WP. Instalar as procedures de associação e conclusão (`sql/deploy/03` e `04`) junto dos exports atualizados desses subfluxos. Se o endpoint reaproveitar attachment de outro repositório, a validação de URL deve bloquear a exclusão original. Confirmar associação WP, URL pública, auditoria e conclusão antes de avançar o checkpoint. O checkpoint esperado é `total_resolvidos = 6`, `pagina_atual = 75`, `ultimo_post_id = 6642`.

O export recebido do subfluxo Storage tinha uma chave literal no cabeçalho. A cópia versionada foi saneada; trocar a chave no serviço e configurar credencial gerenciada do n8n antes de importar esse export.
