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

O usuário confirmou que o agendamento está pausado e que o histórico anterior foi eliminado. Ainda é necessário confirmar na interface do n8n que não há execução manual ativa para os IDs 457–462. O subfluxo Cloudinary fornecido calcula SHA-256 dos bytes recebidos e usa `public_id = <API-FOLDER>/<sha256>`, `overwrite=false` e `unique_filename=false`. Não há consulta prévia do asset. Um upload anterior pode ter sido concluído sem registro em `WP_migracao_featured`; uma repetição desse POST pode retornar erro de asset existente. A resposta exata depende do Worker, cujo código não foi fornecido.

O node `SHA-256 Featured IMG` do export recebido referenciava `items.length` sem definir `items` no modo padrão `runOnceForAllItems` do Code node. Isso produziria `ReferenceError` quando a execução chegasse a esse ponto. O export versionado declara `const items = $input.all();`; o teste local confirmou o SHA-256 de dois conteúdos conhecidos e a preservação do binário. É um defeito concreto no subfluxo recebido, mas não há log para provar que foi o último node das execuções das 03:00 e 04:00.

`SP_WP_recupera_migracao_featured_processing` já lista as migrations `PROCESSING` sem mídia virtual, mas nenhum dos cinco exports a chama. Recuperar essas linhas exige um caminho controlado de reconciliação; a procedure de reserva atual só aceita linhas novas, `PENDING` ou `ERROR`.

## Nova execução diagnóstica de um item

1. Manter `Start Agenda` pausado e confirmar ausência de execuções manuais ativas. Importar a versão corrigida do subfluxo em ambiente de revisão, religar a credencial MySQL, configurar `CLOUDINARY_PROXY_KEY` no n8n e apontar o node `Chamar Repositório Externo` para o ID correto. O export está inativo e não foi implantado na instância n8n.
2. Escolher uma única migration entre 457–462. Obter os mesmos bytes de mídia que o PAI baixa, calcular SHA-256 e identificar a conta Cloudinary que `SP_Get_Claudinary_API` seleciona para `pel/featured`. Consultar nessa conta o asset `pel/featured/<sha256>` e guardar ID, URL e resultado da consulta. Não incluir chaves ou `AUTHORIZATION` na evidência compartilhada.
3. Se o asset existir, não repetir o POST. Reconciliar o registro com o asset confirmado e retomar as etapas posteriores de associação e auditoria em execução controlada. O PAI atual não implementa esse caminho de reaproveitamento; é preciso validá-lo antes da operação. Se o asset não existir, liberar **somente essa migration** para reserva, com conferência de estado e identidade no banco. Não redefinir as seis em conjunto.
4. Com o item isolado e o fluxo corrigido, executar manualmente, anotar ID da execução, último node executado, erro sanitizado e outputs funcionais de reserva, upload, registro, associação e checkpoint antes da limpeza do histórico. Como os outros cinco seguem `PROCESSING`, é esperado que o checkpoint continue `AGUARDANDO` mesmo que esse item seja concluído. Não interpretar isso como falha do item nem como página concluída.
5. Reconciliar os cinco restantes pelo mesmo método; depois conferir estados finais e executar `SP_WP_fecha_checkpoint_featured` pelo caminho normal. Só reativar a agenda após um lote completo verificado. Verificar o envio de e-mail antes de repetir qualquer trecho de notificação.

Para o item que **comprovadamente não possui asset**, esta é uma forma de liberar a reserva com guarda de identidade e estado. Executar a transação apenas depois das verificações acima, substituindo os três IDs pelo item escolhido. Confirmar `ROW_COUNT() = 1` antes de `COMMIT`; caso contrário, `ROLLBACK` e nova investigação. Não alterar `WP_migracao_checkpoint` diretamente.

```sql
START TRANSACTION;

UPDATE WP_migracao_featured
SET status = 'ERROR',
    error_message = 'RETRY_DIAGNOSTICO_ASSET_AUSENTE',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 457
  AND post_id = 6514
  AND wp_media_id = 6519
  AND status = 'PROCESSING'
  AND wp_media_id_virtual IS NULL
  AND cloudinary_url IS NULL;

SELECT ROW_COUNT() AS linhas_liberadas;
-- COMMIT somente se linhas_liberadas = 1; senão ROLLBACK.
```

Esse `UPDATE` é um roteiro de operação e **não foi executado**. A consulta externa de asset não pode ser substituída pela ausência de `cloudinary_url` no banco.

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

Os testes locais cobrem o JSON de checkpoint enviado, o resultset vazio da reserva e o SHA-256 do subfluxo Cloudinary. A causa da inelegibilidade está confirmada (`PROCESSING` nos seis registros). A nova execução ainda não foi feita; a retomada segura depende da reconciliação dos assets e da captura imediata do novo resultado no n8n.
