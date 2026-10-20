# Retomada do checkpoint FEATURED da página 78

O Sub 02 do lote 491–493 foi concluído após a execução agendada do PAI ter falhado. A execução interrompida não pode continuar até `SP | Fecha Checkpoint`; isso não autoriza avançar o ponteiro sem conferir a página completa.

O `Start WP` pinado do Sub 01 preserva o contexto original da página 78: `ultimo_post_pagina=6925` e seis candidatos:

| Post | Mídia original |
| ---: | ---: |
| 6847 | 6891 |
| 6898 | 6902 |
| 6906 | 6907 |
| 6908 | 6913 |
| 6915 | 6923 |
| 6925 | 6928 |

## Conferência no banco

```sql
SELECT processo, pagina_atual, per_page, limite_execucao, ultimo_post_id
FROM WP_migracao_checkpoint
WHERE processo = 'FEATURED';

SELECT id, post_id, wp_media_id, wp_media_id_virtual,
       status, storage_provider, error_message
FROM WP_migracao_featured
WHERE post_id IN (6847, 6898, 6906, 6908, 6915, 6925)
ORDER BY post_id, id;
```

Se o checkpoint ainda estiver na página 78 e apenas 491–493 estiverem resolvidas, o resultado correto do fechamento seria `AGUARDANDO`, aproximadamente `3/6`. Executar uma **nova execução do PAI**, sem os pins temporários de upload/associação e sem repetir o Sub 01 ou Sub 02 para 491–493. Antes de `SP | Reserva Lote`, conferir que `Monta | Candidatos [5]` corresponde aos mesmos seis posts e que `ultimo_post_pagina=6925`. As três featured media já atualizadas podem aparecer com IDs virtuais; `SP_WP_reserva_migracao_featured` as exclui pela associação anterior, e `SP_WP_fecha_checkpoint_featured` as conta por `wp_media_id_virtual`. A reserva deve trazer apenas as três migrations ainda pendentes.

Se a página lida do WordPress tiver outros posts ou outro `ultimo_post_pagina`, não reservar esse lote: recuperar o contexto original da página 78 de forma controlada antes de prosseguir.

## Fechamento isolado, somente com seis candidatos resolvidos

Se a consulta mostrar as seis migrations como `MIGRATED` ou `SKIPPED` e o ponteiro ainda estiver em 78, é possível chamar a procedure diretamente no MySQL, sem depender da execução perdida do PAI:

```sql
CALL SP_WP_fecha_checkpoint_featured(
  '[{"post_id":6847,"wp_media_id":6891},
    {"post_id":6898,"wp_media_id":6902},
    {"post_id":6906,"wp_media_id":6907},
    {"post_id":6908,"wp_media_id":6913},
    {"post_id":6915,"wp_media_id":6923},
    {"post_id":6925,"wp_media_id":6928}]',
  78,
  6925
);
```

Resultado esperado: `AVANCADO`, `total_candidatos=6`, `total_resolvidos=6`, `pagina_atual=79`, `ultimo_post_id=6925`. Se retornar `AGUARDANDO`, não executar atualização manual do ponteiro: identificar os candidatos pendentes. `JA_AVANCADO` significa que a procedure já foi aplicada. A procedure valida os seis candidatos e impede avanço enquanto algum não estiver resolvido.
