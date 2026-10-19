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

## Retomada controlada das migrations 469–471

Manter a agenda pausada, confirmar que não há execução ativa e verificar possíveis assets Cloudinary para os bytes dessas três mídias. Ausência de URL no banco não confirma ausência externa. Se não houver asset a reaproveitar, o bloco abaixo libera apenas 469–471. Executar `START TRANSACTION`, `UPDATE` e `SELECT` juntos na mesma conexão. Usar o **Action Output** do Workbench: o `UPDATE` deve afetar **3 linhas** e o `SELECT` deve mostrar as três em `ERROR`. Fazer `COMMIT` somente nesse caso; caso contrário, `ROLLBACK`. Não usar `SET @linhas := ROW_COUNT()` para decidir, pois essa leitura devolveu `0` no Workbench após um `UPDATE` que afetou cinco linhas na página 73. O SQL é um roteiro e não foi executado por este repositório.

```sql
START TRANSACTION;

UPDATE WP_migracao_featured
SET status = 'ERROR',
    error_message = 'RETRY_CONTROLADO_P74',
    updated_at = CURRENT_TIMESTAMP
WHERE (id, post_id, wp_media_id) IN (
    (469, 6625, 6630),
    (470, 6633, 6639),
    (471, 6642, 6643)
)
  AND status = 'PROCESSING'
  AND sha256 IS NULL
  AND cloudinary_public_id IS NULL
  AND cloudinary_url IS NULL
  AND wp_media_id_virtual IS NULL;

SELECT id, post_id, wp_media_id, status, cloudinary_url, wp_media_id_virtual
FROM WP_migracao_featured
WHERE id IN (469, 470, 471)
ORDER BY id;
-- COMMIT somente após conferir 3 linhas afetadas e as 3 em ERROR.
```

Depois da liberação, executar o PAI manualmente. Com limite de reserva três, essas três migrations devem formar um lote. Se todas concluírem, o checkpoint esperado é `AVANCADO`, `total_resolvidos = 6`, `pagina_atual = 75`, `ultimo_post_id = 6642`. Conferir a notificação antes de reativar a agenda. Se o upload indicar asset já existente, interromper e reconciliar a partir do asset em vez de repetir o POST.

## Falha posterior em `Monta | Lote Uploads`

O usuário informou uma falha no node de montagem do lote após tentar reprocessar a página 74. A mensagem contém uma URL `//pub-...r2.dev/pel/featured/936704c6...jpg`. Esse node exige `cloudinary_url` no host `res.cloudinary.com` e extrai dele `cloudinary_cloud_name`. Logo, pelo menos um item de entrada contém URL R2 em um campo que o PAI trata como Cloudinary. Não adaptar apenas a expressão regular: `SP_WP_registra_cloudinary_lote`, a associação WordPress e a conclusão ainda usam o contrato Cloudinary.

As entradas de `Monta | Lote Uploads` identificaram o item: a migration **469** recebeu `cloudinary_url` no host `pub-2649da1456ae49a0b80d452844f9a4eb.r2.dev`, com SHA-256 `936704c6b5e4af2f443761458acf4c686f04f5dd9d24578b72c11387b17a7bcd` e `upload_ok = true`. A migration **470** recebeu Cloudinary, SHA-256 `05a5d58fea330c9cad8a3cc7b01268a7f56d6de31235b10753fd6d10a5336da4`, e a **471** também recebeu Cloudinary, SHA-256 `bbd70d36e970cedc1b4420e775f4a3d2a8f67a6e01ce02b47991ed84cdda7080`; ambas têm `upload_ok = true`. O lote misturou R2 e Cloudinary antes de chegar ao parser. Ainda falta confirmar qual workflow foi efetivamente chamado por `Chamar Repositório Externo` e por que o item 469 foi ao R2. O export do PAI versionado aponta para o subfluxo Cloudinary, mas a versão publicada pode diferir.

Como a falha aconteceu antes de `SP | Registra Cloudinary Lote`, o lote desta tentativa não foi registrado por esse caminho. Os três outputs indicam upload externo concluído; consultar a existência dos assets antes de qualquer retry. Manter a agenda pausada e não reclassificar novamente 469–471 antes de reconciliar os resultados do upload e o estado atual de cada migration. As migrations 470 e 471 podem seguir o caminho Cloudinary existente usando os resultados já capturados, desde que a retomada comece depois do upload e preserve o contexto da página. A 469 exige uma decisão explícita sobre Cloudinary ou um caminho R2 validado.

O export versionado agora valida o host logo em `Consolida | Resultado Upload`, após cada retorno do subfluxo. Ele falha no primeiro item que não vem do Cloudinary, antes de acumular o lote. Essa mudança está no repositório para revisão e não foi aplicada ao fluxo ativo. Se R2 for o destino pretendido, é necessário definir e validar o contrato de provider em todos os nodes e procedures seguintes antes de permitir essa URL.

Não avançar a página manualmente: isso deixaria três candidatos sem resolução. Não reutilizar os IDs 457–462 da página 73 em SQL de recuperação da página 74.
