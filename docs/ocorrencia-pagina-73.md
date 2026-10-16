# Agendamento Featured: página 73 aguardando

## Observação recebida

O gatilho `Start Agenda` executou o PAI e chegou a `SP | Reserva Lote`. `Normaliza | Lote Reservado` produziu `SEM_CANDIDATOS_ELEGIVEIS`. A chamada de `SP_WP_fecha_checkpoint_featured` recebeu seis candidatos e retornou `AGUARDANDO`, `total_resolvidos = 0`, `pagina_atual = 73`, `ultimo_post_id = 6500`. O item separado com `fieldCount`/`affectedRows` é metadado do driver MySQL; `affectedRows = 9` não significa nove migrations concluídas.

O checkpoint não avançou, conforme o contrato da procedure. A saída completa de `SP | Reserva Lote` foi fornecida depois: `[[], {"fieldCount": 0, "affectedRows": 6, ...}]`. O resultset está realmente vazio; não houve row funcional que o normalizador deixou de reconhecer. `affectedRows = 6` é metadado do driver, não prova que seis migrations foram reservadas.

Pelo SQL de referência e pelo limite positivo exigido em `Monta | Candidatos [5]`, cada candidato válido deixou de satisfazer pelo menos uma condição de reserva: já tem migration em `PROCESSING`/`MIGRATED`/`SKIPPED`, ou aparece como mídia virtual do mesmo post. Ainda faltam as linhas de `WP_migracao_featured` para identificar qual condição se aplica a cada um e conferir que a procedure implantada corresponde à referência. O resultado `AGUARDANDO` com 0/6 resolvidos exige essa conciliação antes de qualquer retry.

## Ajuste no export

`Normaliza | Lote Reservado` agora percorre arrays e wrappers conhecidos, ignora metadados, valida IDs/status `PROCESSING` e recusa retornos desconhecidos. Ausência real de rows continua seguindo o caminho sem reserva. O novo `Valida | Checkpoint PAI` lê o resultado funcional da procedure após o fechamento: quando não houve reserva e o checkpoint retorna `AGUARDANDO`, a execução termina com erro explícito de página bloqueada. Isso evita que o agendamento pareça ter concluído a migração. A validação não reprocessa candidatos nem altera o checkpoint.

## Diagnóstico somente leitura

Para os seis pares de `Monta | Candidatos [5]`, usar o JSON completo como parâmetro `?` na consulta abaixo e comparar o resultado com a página do WordPress:

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
FROM JSON_TABLE(
    ?, '$[*]' COLUMNS (
        post_id BIGINT PATH '$.post_id',
        wp_media_id BIGINT PATH '$.wp_media_id'
    )
) AS c
LEFT JOIN WP_migracao_featured m
  ON m.post_id = c.post_id
 AND m.wp_media_id = c.wp_media_id
ORDER BY c.post_id, m.id;
```

Conferir também a linha `FEATURED` em `WP_migracao_checkpoint` e as execuções anteriores do PAI/subfluxos para esses IDs. `PROCESSING` com mídia virtual exige auditoria de associação/exclusão antes de concluir ou recuperar; `PROCESSING` sem mídia virtual exige rastrear onde a tentativa anterior parou. `ERROR` pode voltar à reserva, salvo bloqueio por mídia virtual. Não redefinir status nem avançar o checkpoint por `UPDATE` manual.

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

Os testes locais cobrem o JSON de checkpoint enviado e o resultset vazio da reserva. A causa concreta da inelegibilidade e a recuperação do agendamento ainda dependem dos estados dos seis candidatos no banco.
