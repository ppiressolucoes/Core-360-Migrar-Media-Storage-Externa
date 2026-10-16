# Agendamento Featured: página 73 aguardando

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

Antes de recuperar, pausar o agendamento e confirmar na interface do n8n que não há execução ativa do PAI ou dos subfluxos para os IDs 457–462. Como o histórico anterior foi eliminado, conferir se os assets já existem nas contas Cloudinary usando o public ID/SHA-256 que o subfluxo de upload efetivamente usa. Se existirem, reutilizar o asset e retomar a partir do registro em banco; se não existirem, uma nova tentativa de upload precisa ser idempotente. O export do subfluxo Cloudinary ainda não foi fornecido para verificar esse contrato. Não redefinir status nem avançar o checkpoint por `UPDATE` manual.

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

Os testes locais cobrem o JSON de checkpoint enviado e o resultset vazio da reserva. A causa da inelegibilidade está confirmada (`PROCESSING` nos seis registros); a recuperação segura ainda depende das execuções n8n que fizeram as reservas.
