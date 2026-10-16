# Agendamento Featured: página 73 aguardando

## Retomada observada em 16/10/2026

O usuário atualizou o node `SHA-256 Featured IMG` no n8n e reclassificou a migration 457 como `ERROR`. Uma consulta confirmou a 457 em `ERROR` e as migrations 458–462 ainda em `PROCESSING`, sem URL Cloudinary ou mídia virtual. Na execução manual seguinte, `SP | Reserva Lote` retornou **somente a 457**, agora `PROCESSING`, com seis candidatos na página 73.

O resultado funcional de `SP_WP_conclui_migracao_featured_lote` retornou a migration **457**, post **6514**, mídia original **6519**, mídia virtual **89007**, status **`MIGRATED`** e URL Cloudinary com public ID `pel/featured/d5c5c9184de49f5103723a4f4bb10a3b4f64d201a4fbc01bdd367d5d5e87ddc1`. `migrated_at` foi informado como `2026-10-16 18:14:19`, sem fuso horário identificado. O item separado `affectedRows = 3` é metadado do driver, não indica três migrations concluídas. O usuário informou que o fluxo terminou.

`SP | Fecha Checkpoint` retornou `AGUARDANDO`, `total_candidatos = 6`, `total_resolvidos = 1`, `pagina_atual = 73`, `ultimo_post_id = 6500`. Esse é o estado esperado após concluir apenas a 457. O item separado `affectedRows = 9` também é metadado do driver, não indica nove migrations resolvidas. A página só poderá avançar após resolver os outros cinco candidatos.

O Workbench mostrou `UPDATE ... 5 row(s) affected`, `COMMIT` e uma consulta posterior com **458–462 em `ERROR`**, sem URL Cloudinary nem mídia virtual. A liberação no banco está concluída; não repetir o `UPDATE`. A verificação de assets Cloudinary anteriores não foi informada. O próximo passo é executar o PAI manualmente com a agenda pausada; se o upload acusar asset existente, interromper e reconciliar esse item. O primeiro lote parcial deve manter o checkpoint `AGUARDANDO`; somente quando os seis candidatos estiverem `MIGRATED` ou `SKIPPED` a procedure poderá avançar a página. Conferir o checkpoint e a notificação antes de reativar a agenda.

O SQL abaixo registra o bloco aplicado pelo usuário às migrations 458–462. **Não executar novamente.** Este repositório não executou comandos no banco.

```sql
START TRANSACTION;

UPDATE WP_migracao_featured
SET status = 'ERROR',
    error_message = 'RETRY_DIAGNOSTICO_ASSET_AUSENTE',
    updated_at = CURRENT_TIMESTAMP
WHERE (id, post_id, wp_media_id) IN (
    (458, 6522, 6534),
    (459, 6537, 6549),
    (460, 6555, 6561),
    (461, 6562, 6566),
    (462, 6589, 6592)
)
  AND status = 'PROCESSING'
  AND sha256 IS NULL
  AND cloudinary_public_id IS NULL
  AND cloudinary_url IS NULL
  AND wp_media_id_virtual IS NULL;

SELECT id, post_id, wp_media_id, status, cloudinary_url, wp_media_id_virtual
FROM WP_migracao_featured
WHERE id BETWEEN 458 AND 462
ORDER BY id;
-- COMMIT somente se o UPDATE afetou 5 linhas e o SELECT mostra 5 em ERROR.
```

## Observação recebida

O gatilho `Start Agenda` executou o PAI e chegou a `SP | Reserva Lote`. `Normaliza | Lote Reservado` produziu `SEM_CANDIDATOS_ELEGIVEIS`. A chamada de `SP_WP_fecha_checkpoint_featured` recebeu seis candidatos e retornou `AGUARDANDO`, `total_resolvidos = 0`, `pagina_atual = 73`, `ultimo_post_id = 6500`. O item separado com `fieldCount`/`affectedRows` é metadado do driver MySQL; `affectedRows = 9` não significa nove migrations concluídas.

O checkpoint não avançou, conforme o contrato da procedure. A saída completa de `SP | Reserva Lote` foi fornecida depois: `[[], {"fieldCount": 0, "affectedRows": 6, ...}]`. O resultset está realmente vazio; não houve row funcional que o normalizador deixou de reconhecer. `affectedRows = 6` é metadado do driver, não prova que seis migrations foram reservadas.

O resultado somente leitura de `WP_migracao_featured` confirmou a causa da inelegibilidade: as seis migrations estão em `PROCESSING`. Nenhuma tem `wp_media_id_virtual` ou URL Cloudinary registrada; `ja_e_midia_virtual = 0` em todas. A procedure de reserva exclui `PROCESSING`, e a de checkpoint ainda não pode contá-las como resolvidas. Falta identificar em qual node cada tentativa anterior parou; os dados do banco não provam que nenhum upload externo tenha ocorrido antes de uma falha no registro.

O retorno de `Busca Posts` confirmou os seis pares da página: `(6514, 6519)`, `(6522, 6534)`, `(6537, 6549)`, `(6555, 6561)`, `(6562, 6566)` e `(6589, 6592)`. Esses são IDs do WordPress; o retorno não contém o estado das migrations no banco.

| Migration | Post | Mídia original | Estado | Última atualização informada |
| ---: | ---: | ---: | --- | --- |
| 457 | 6514 | 6519 | `PROCESSING`, sem URL ou mídia virtual | `2026-10-16 03:00:02` |
| 458 | 6522 | 6534 | `PROCESSING`, sem URL ou mídia virtual | `2026-10-16 03:00:02` |
| 459 | 6537 | 6549 | `PROCESSING`, sem URL ou mídia virtual | `2026-10-16 03:00:02` |
| 460 | 6555 | 6561 | `PROCESSING`, sem URL ou mídia virtual | `2026-10-16 04:00:01` |
| 461 | 6562 | 6566 | `PROCESSING`, sem URL ou mídia virtual | `2026-10-16 04:00:01` |
| 462 | 6589 | 6592 | `PROCESSING`, sem URL ou mídia virtual | `2026-10-16 04:00:01` |

Os horários são os valores informados pelo banco, sem fuso horário identificado. Os dois grupos coincidem com lotes de três itens. O histórico dessas execuções foi removido pela regra de limpeza do n8n, portanto não há evidência do último node executado nem confirmação de que o upload Cloudinary não ocorreu.

## Ajuste no export

`Normaliza | Lote Reservado` agora percorre arrays e wrappers conhecidos, ignora metadados, valida IDs/status `PROCESSING` e recusa retornos desconhecidos. Ausência real de rows continua seguindo o caminho sem reserva. O novo `Valida | Checkpoint PAI` lê o resultado funcional da procedure após o fechamento: quando não houve reserva e o checkpoint retorna `AGUARDANDO`, a execução termina com erro explícito de página bloqueada. Isso evita que o agendamento pareça ter concluído a migração. A validação não reprocessa candidatos nem altera o checkpoint.

Também foi corrigida uma associação por posição em `Normaliza | Featured Media`: após `IF Mídia Local?`, só as mídias locais chegam a esse node, mas o código anterior comparava sua quantidade e ordem com todos os posts reservados. O export agora usa o vínculo de item do n8n (`itemMatching`) e mantém a checagem do ID da mídia. Esse defeito pode afetar lotes mistos; o histórico removido não permite atribuir a ele esta ocorrência específica.

## Diagnóstico somente leitura

Executar a consulta abaixo em modo somente leitura para obter o estado de cada par, inclusive se ainda não houver linha na tabela:

```sql
SELECT
    c.post_id,
    c.wp_media_id,
    m.id AS migration_id,
    m.status,
    m.wp_media_id_virtual,
    m.cloudinary_url IS NOT NULL AS possui_cloudinary_url,
    m.updated_at,
    EXISTS (
        SELECT 1
        FROM WP_migracao_featured mv
        WHERE mv.post_id = c.post_id
          AND mv.wp_media_id_virtual = c.wp_media_id
    ) AS ja_e_midia_virtual
FROM (
    SELECT 6514 AS post_id, 6519 AS wp_media_id
    UNION ALL SELECT 6522, 6534
    UNION ALL SELECT 6537, 6549
    UNION ALL SELECT 6555, 6561
    UNION ALL SELECT 6562, 6566
    UNION ALL SELECT 6589, 6592
) AS c
LEFT JOIN WP_migracao_featured m
  ON m.post_id = c.post_id
 AND m.wp_media_id = c.wp_media_id
ORDER BY c.post_id, m.id;
```

O usuário confirmou que o agendamento está pausado e que o histórico anterior foi eliminado. Ainda é necessário confirmar na interface do n8n que não há execução manual ativa para os IDs 457–462. O subfluxo Cloudinary fornecido calcula SHA-256 dos bytes recebidos e usa `public_id = <API-FOLDER>/<sha256>`, `overwrite=false` e `unique_filename=false`. Não há consulta prévia do asset. Um upload anterior pode ter sido concluído sem registro em `WP_migracao_featured`; uma repetição desse POST pode retornar erro de asset existente. A resposta exata depende do Worker, cujo código não foi fornecido.

O node `SHA-256 Featured IMG` do export recebido referenciava `items.length` sem definir `items` no modo padrão `runOnceForAllItems` do Code node. Isso produziria `ReferenceError` quando a execução chegasse a esse ponto. O export versionado declara `const items = $input.all();`; o teste local confirmou o SHA-256 de dois conteúdos conhecidos e a preservação do binário. É um defeito concreto no subfluxo recebido, mas não há log para provar que foi o último node das execuções das 03:00 e 04:00.

A nova captura da tabela mostra que as migrations 447–456 estão `MIGRATED` e que 457–462 seguem `PROCESSING`, com `sha256`, `cloudinary_public_id`, `cloudinary_url` e `wp_media_id_virtual` nulos. Isso confirma que o registro de upload não ocorreu nessas seis linhas; não determina se houve POST externo antes da interrupção.

Antes de liberar uma migration, comparar o código do node `SHA-256 Featured IMG` da versão **ativa** do n8n com o export recebido. Se ele também usar `items` sem `const items = $input.all();`, esse erro pode ser reproduzido com uma imagem de teste executando apenas até o node SHA-256, sem acionar `Upload Cloudinary featured IMG` nem alterar a tabela. Capturar o erro sanitizado e o ID da execução imediatamente. Esse teste localiza um defeito concreto sem precisar mudar o checkpoint ou o estado das seis migrations.

`SP_WP_recupera_migracao_featured_processing` já lista as migrations `PROCESSING` sem mídia virtual, mas nenhum dos cinco exports a chama. Recuperar essas linhas exige um caminho controlado de reconciliação; a procedure de reserva atual só aceita linhas novas, `PENDING` ou `ERROR`.

## Histórico do diagnóstico da migration 457

A 457 foi liberada de `PROCESSING` para `ERROR`, reservada novamente e concluída como `MIGRATED`. O SQL usado nesse diagnóstico não deve ser repetido para a 457. O bloco atual para as migrations 458–462 está no início deste documento e exige confirmação prévia dos assets Cloudinary.

Na tentativa seguinte, o **Action Output** do Workbench informou `UPDATE ... 5 row(s) affected`, mas `SET @linhas_liberadas := ROW_COUNT()` seguido de `SELECT` mostrou `0`. Portanto, o `0` dessa variável não deve ser usado para concluir que o `UPDATE` falhou, nem para repetir a alteração. A consulta posterior ao `COMMIT` confirmou as cinco em `ERROR`.

| Estado encontrado | Próxima verificação |
| --- | --- |
| Nenhuma migration ou `PENDING`/`ERROR`, sem bloqueio de mídia virtual | O SQL de reserva deveria selecionar o candidato; conferir o output bruto e o `limite_execucao`. |
| `PROCESSING`, sem mídia virtual | Confirmar se outra execução ainda atua sobre o item; se não, localizar a etapa interrompida antes de decidir como retomá-la. |
| `PROCESSING`, com mídia virtual | Conferir associação WordPress e auditoria da mídia original. Não repetir registro/upload/exclusão sem verificar o resultado anterior. |
| `MIGRATED`/`SKIPPED` mas checkpoint ainda não conta o candidato | Comparar o par `(post_id, wp_media_id)` atual com a linha persistida e com a regra de contagem da procedure. |
| `ja_e_midia_virtual = 1` | O candidato pode ser uma mídia virtual já registrada; conferir o estado do post e a regra de exclusão na reserva. |

## Aceite do ajuste

- Um retorno de reserva com rows válidas entra no ramo de processamento, inclusive se vier em arrays aninhados.
- Um retorno vazio com checkpoint `AGUARDANDO` produz erro visível com página e contagem, sem avanço de página ou DELETE.
- Após reconciliar o estado real das seis migrations, um lote controlado termina com estados resolvidos e checkpoint consistente. A notificação é conferida separadamente para evitar envio duplicado.

Os testes locais cobrem o JSON de checkpoint enviado, o resultset vazio da reserva e o SHA-256 do subfluxo Cloudinary. A causa da inelegibilidade inicial está confirmada (`PROCESSING` nos seis registros). A migration 457 foi retomada e o resultado funcional de conclusão foi `MIGRATED`; o checkpoint confirmou `AGUARDANDO` com 1/6 resolvido. Restam 458–462.
