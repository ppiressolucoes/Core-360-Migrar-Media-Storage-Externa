# Runbook: desbloqueio controlado de lote PAI

Use este procedimento quando o PAI permanecer em `AGUARDANDO` e migrations
continuarem em `PROCESSING`. Ele orienta diagnóstico e recuperação por estado;
não atualiza o checkpoint diretamente e não cria uma procedure por lote.

## Evolução aprovada: exceção automática para interrupção sem histórico

Em 2026-11-25 foi aprovada a evolução do PAI para a classe observada na
página 194: execução interrompida, migration ainda em `PROCESSING`, storage
canônico e mídia virtual já persistidos, e histórico de erro indisponível para
retomada segura. Nessa condição específica, o fluxo deverá registrar
`SKIPPED`, preservar storage e mídia virtual, guardar motivo e IDs para
auditoria residual, continuar os demais itens e fechar o checkpoint normalmente.

Essa regra ainda está pendente de implementação e homologação. Não aplique a
qualquer linha `PROCESSING` com storage: se for possível retomar e concluir o
Sub 02, siga o fluxo normal. Confirme que a execução não está ativa, que
identidade, mídia virtual e storage canônico correspondem e que não há
divergência. Se a URL original não puder ser recuperada, registre
`url_original=NAO_RECUPERADA` explicitamente e mantenha a auditoria pendente.
HTTP 522, 429, 5xx, timeout e falhas de rede permanecem transitórios e nunca
são elegíveis para `SKIPPED`.

Até que a automação seja implantada, siga a seção abaixo de exceção
administrativa manual e registre o resultado de cada etapa.

## 1. Registrar o snapshot antes de intervir

Colete e guarde, para a mesma página:

1. Saída de `SP | Fecha Checkpoint`: processo, página, último post,
   candidatos, resolvidos e resultado.
2. Lista completa de candidatos da página, incluindo `post_id` e
   `wp_media_id`.
3. Para cada candidato, resultado de `SP_WP_recupera_migracao_featured_processing`
   ou consulta equivalente: `migration_id`, `status`, `wp_media_id_virtual`,
   `sha256`, provider, key, URL, asset e erro.
4. Contexto do download/upload: URL original, status HTTP real, MIME e erro do
   validador. Guarde a saída anterior e posterior a cada mudança.

Não use somente a lista de “não resolvidos”: confirme a identidade e o estado
canônico de cada linha na tabela de migrations. A procedure
`SP_WP_recupera_migracao_featured_processing` é apenas leitura e filtra
`wp_media_id_virtual IS NULL`; portanto, ela não encontra casos PROCESSING
que já tenham mídia virtual.

## 2. Escolher a recuperação pelo estado

| Estado observado | Ação |
| --- | --- |
| `PROCESSING`, sem storage e sem mídia virtual; falha reprocessável | Corrigir a causa e usar a procedure genérica de reabertura, se implantada e validada no banco ativo; depois reexecutar o PAI. A reabertura não deve alterar o checkpoint. |
| Download comprovadamente rejeitado de forma permanente, sem storage e sem mídia virtual | Encaminhar ao tratamento de rejeição aprovado, com motivo e URL. Deixar os itens válidos seguirem para upload. HTTP 522, 429, 5xx, timeout e falhas de rede são transitórios: manter pendente/repetir conforme política, nunca marcar `SKIPPED`. |
| `PROCESSING` com storage e/ou mídia virtual | Não reabrir para repetir download/upload. Retomar associação, auditoria e conclusão pelo Sub 02 quando houver evidência suficiente. A SP de conclusão não substitui a auditoria da mídia original. |
| Storage/mídia virtual existe, mas a operação não pode ser concluída e o operador aceita um residual de auditoria | Somente com decisão administrativa explícita, atualizar em lote os alvos exatos para `SKIPPED`, registrando motivo, URL e auditoria pendente. Preserve os campos de storage e mídia virtual. O exemplo abaixo é uma intervenção manual para revisão; não é uma nova SP nem execução automática. |

`SKIPPED` encerra o item para a contagem do checkpoint; não afirma que a mídia
original foi verificada, excluída ou que o storage foi removido. A auditoria
residual continua aberta. Não altere storage, mídia virtual ou checkpoint como
efeito colateral do desbloqueio.

## 3. Exceção administrativa em lote — modelo SQL revisável

Use somente quando a decisão para os IDs listados já estiver registrada. Preencha
o JSON com `migration_id`, `post_id`, `wp_media_id`, motivo e URL por item.
O exemplo usa uma única atualização com `JSON_TABLE`: não cria SP, tabela
temporária ou linhas de staging.

Antes de executar, confirme nomes/tipos das colunas e tamanho de
`error_message` no schema ativo. Rode o preflight e compare a saída com a lista
autorizada. Se faltar, sobrar ou divergir qualquer alvo, faça `ROLLBACK`.

```sql
SET @alvos = JSON_ARRAY(
  JSON_OBJECT(
    'migration_id', 1100,
    'post_id', 15532,
    'wp_media_id', 15538,
    'motivo', 'EXCECAO_ADMIN_LOTE_BLOQUEADO',
    'url', 'https://origem.example/imagem.jpg'
  )
  -- Acrescente um JSON_OBJECT por migration explicitamente aprovada.
);

START TRANSACTION;

SELECT m.id AS migration_id, m.post_id, m.wp_media_id, m.status,
       m.wp_media_id_virtual, m.sha256, m.storage_provider, m.storage_key,
       m.storage_url, m.storage_asset_id, m.cloudinary_public_id,
       m.cloudinary_url, m.error_message
FROM JSON_TABLE(
  @alvos,
  '$[*]' COLUMNS (
    migration_id BIGINT PATH '$.migration_id',
    post_id BIGINT PATH '$.post_id',
    wp_media_id BIGINT PATH '$.wp_media_id'
  )
) jt
JOIN WP_migracao_featured m
  ON m.id = jt.migration_id
 AND m.post_id = jt.post_id
 AND m.wp_media_id = jt.wp_media_id
FOR UPDATE;

UPDATE WP_migracao_featured m
JOIN JSON_TABLE(
  @alvos,
  '$[*]' COLUMNS (
    migration_id BIGINT PATH '$.migration_id',
    post_id BIGINT PATH '$.post_id',
    wp_media_id BIGINT PATH '$.wp_media_id',
    motivo VARCHAR(160) PATH '$.motivo',
    url VARCHAR(2048) PATH '$.url'
  )
) jt
  ON m.id = jt.migration_id
 AND m.post_id = jt.post_id
 AND m.wp_media_id = jt.wp_media_id
SET m.status = 'SKIPPED',
    m.error_message = CONCAT(
      jt.motivo,
      '; auditoria_original_pendente; url=', jt.url
    ),
    m.updated_at = CURRENT_TIMESTAMP
WHERE m.status = 'PROCESSING'
  AND (
    m.wp_media_id_virtual IS NOT NULL
    OR m.sha256 IS NOT NULL
    OR m.storage_provider IS NOT NULL
    OR m.storage_key IS NOT NULL
    OR m.storage_url IS NOT NULL
    OR m.storage_asset_id IS NOT NULL
    OR m.cloudinary_public_id IS NOT NULL
    OR m.cloudinary_url IS NOT NULL
  );

SELECT ROW_COUNT() AS migrations_alteradas;
-- Compare com a quantidade de IDs aprovada.
-- COMMIT somente se a contagem e a leitura final corresponderem; caso contrário:
-- ROLLBACK;
```

Após a atualização, leia novamente cada ID e confirme que somente status,
`error_message` e `updated_at` mudaram. Se a contagem não for exatamente a
esperada, não prossiga com o fechamento até resolver a divergência. Não copie
este exemplo para execução sem substituir e revisar os dados demonstrativos.

## 4. Fechar e comprovar o lote

1. Execute novamente `SP | Fecha Checkpoint`; não faça `UPDATE` direto no
   checkpoint.
2. Se retornar `AGUARDANDO`, pare e compare novamente os candidatos e
   migrations ainda não resolvidos.
3. Se retornar `AVANCADO`, registre a resposta completa: total de candidatos,
   total resolvido, página seguinte, último post e horário.
4. Faça uma leitura final do checkpoint e das migrations, se disponível.
5. Registre IDs originais cuja auditoria ficou pendente em fila consultável e
   agende a verificação. O avanço do checkpoint não fecha essa auditoria.

## Ocorrência registrada: página 193 — 2026-11-25

O checkpoint foi informado como `AGUARDANDO`, 2/5 resolvidos, página 193,
último post 15560. Os candidatos eram 15532/96250, 15574/96251, 15590/96252,
15631/96253 e 15652/96254. As linhas recebidas mostravam migrations 1100–1102
em `PROCESSING`, com storage Cloudflare R2 e mídias virtuais 96250–96252;
15631 e 15652 já estavam resolvidos. O operador informou depois que o lote foi
desbloqueado.

A conversa não trouxe a leitura pós-intervenção, os status finais das migrations,
o número de linhas alteradas nem a saída final do checkpoint. Portanto, este
registro não afirma qual método foi aplicado nem que a página avançou. A
verificação das mídias originais 15538, 15583 e 15636 continua pendente até
haver evidência em contrário. A recorrência de páginas 87, 98 e 193 reforça
usar este procedimento genérico, sem criar procedures pontuais por ocorrência.

