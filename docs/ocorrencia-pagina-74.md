# Agendamento Featured: página 74 aguardando

## Evidência de 19/10/2026

O checkpoint da página 73 avançou: a execução atual iniciou com `pagina_atual = 74` e `ultimo_post_id = 6589`. `Monta | Candidatos [5]` informou seis candidatos para a página 74, com `ultimo_post_pagina = 6642`.

`Normaliza | Lote Reservado` retornou `tem_reserva = false`, `total_reservado = 0`, `etapa = SEM_CANDIDATOS_ELEGIVEIS`. `SP | Fecha Checkpoint` retornou `AGUARDANDO`, `total_candidatos = 6`, `total_resolvidos = 3`, `pagina_atual = 74`, `ultimo_post_id = 6589`. O item `affectedRows = 9` é metadado do driver MySQL e não altera a contagem de resolvidos.

`Monta | Candidatos [5]` retornou, em ordem: `(6593, 89027)`, `(6600, 89028)`, `(6610, 89029)`, `(6625, 6630)`, `(6633, 6639)` e `(6642, 6643)`. O limite de reserva é três. Os IDs de mídia 89027–89029 parecem ser mídias virtuais de migrações anteriores, mas isso ainda precisa ser confirmado no banco; os três últimos pares são os principais candidatos ao bloqueio.

A saída bruta de `SP | Reserva Lote` foi `[[], {"fieldCount": 0, "affectedRows": 6, ...}]`. O resultset funcional está realmente vazio; o normalizador não omitiu linhas. `affectedRows = 6` é metadado do driver e não significa seis reservas.

Esses dados mostram que **três candidatos da página 74 ainda não estão resolvidos e nenhum entrou na reserva**. A lista de pares permite consultar o estado correspondente no banco, mas ainda não confirma quais são os três pendentes nem por que foram excluídos. `Busca Posts` ordena por `date ASC`; não é seguro inferir os seis IDs a partir do intervalo entre `ultimo_post_id` e `ultimo_post_pagina`.

O export versionado do PAI contém `Valida | Checkpoint PAI`, que sinaliza erro quando há zero reservas e o checkpoint está `AGUARDANDO`. A captura da execução publicada termina no node `SP | Fecha Checkpoint` sem mostrar essa validação conectada. Conferir a versão publicada antes de reativar a agenda; esse guard torna o bloqueio visível, mas não resolve as três migrations.

## Diagnóstico antes de reprocessar

Executar a consulta **somente leitura** abaixo. Ela vincula cada featured media atual tanto pela mídia original quanto pela virtual, pois as três primeiras podem já ter sido migradas:

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

1. Manter o agendamento pausado e confirmar se há execução do PAI ou dos subfluxos ainda ativa.
2. Conferir o resultado da consulta acima e se cada mídia atual aparece como original ou virtual de uma migration do mesmo post.
3. Para linhas `PROCESSING`, localizar a última etapa persistida e verificar eventual asset Cloudinary antes de mudar status ou repetir upload. Se houver URL ou mídia virtual, retomar da etapa comprovada em vez de reiniciar o PAI para o item.
4. Processar apenas os itens reconciliados. O checkpoint da página 74 só deve avançar pelo caminho normal quando os seis candidatos forem contados como `MIGRATED` ou `SKIPPED`.

Não avançar a página manualmente: isso deixaria três candidatos sem resolução. Não reutilizar os IDs 457–462 da página 73 em SQL de recuperação da página 74.
