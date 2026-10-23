# Página 87: reserva sem candidatos elegíveis

Relato recebido em 2026-10-23. A execução agendada do PAI não terminou. O nó
`Normaliza | Lote Reservado` retornou:

```json
{
  "tem_reserva": false,
  "total_reservado": 0,
  "etapa": "SEM_CANDIDATOS_ELEGIVEIS",
  "pagina_processada": 87,
  "per_page": 6,
  "ultimo_post_pagina": 7740,
  "total_candidatos": 6
}
```

`Monta | Candidatos [5]` enviou os pares abaixo, com `limite=3` e
`limite_execucao=3`:

| `post_id` | `wp_media_id` |
| ---: | ---: |
| 7697 | 89997 |
| 7691 | 89998 |
| 7714 | 89999 |
| 7721 | 90000 |
| 7729 | 90001 |
| 7740 | 90002 |

`SP | Fecha Checkpoint` também retornou `AGUARDANDO`, `total_candidatos=6`,
`total_resolvidos=3`, `pagina_atual=87` e `ultimo_post_id=7684`. Isso confirma
que o fechamento não avançou naquela chamada. O objeto de metadados do
conector MySQL informou `affectedRows=9`; esse número não representa nove
candidatos resolvidos e não substitui o result set da procedure. Ainda não há
o status de cada migration; o estado mais recente do banco também não foi
relido. O limite de três reservas por execução não explica, sozinho, por que
nenhum dos três candidatos ainda não resolvidos foi reservado. Não considerar
a página concluída ou recuperada com base apenas nessas saídas.

## O que o export permite afirmar

No export oficial do PAI, a ausência de reserva segue pelo ramo falso de `If`
para `Prepara | Fecha Checkpoint` e `SP | Fecha Checkpoint`. A normalização
devolve zero quando não encontra linhas de reserva na resposta recebida da SP;
ela não classifica por que cada candidato ficou de fora. A SP de reserva aceita
novos pares e pares em `PENDING` ou `ERROR`, mas exclui `PROCESSING`,
`MIGRATED` e pares cuja mídia atual já é virtual. A SP de fechamento retorna
`AVANCADO` somente quando todos os seis candidatos estão resolvidos como
`MIGRATED` ou `SKIPPED`; caso contrário retorna `AGUARDANDO`. A saída de
`SP | Fecha Checkpoint` não tem um nó seguinte no export PAI, então
`AGUARDANDO` pode encerrar a execução sem recuperação automática.

O export do PAI possui divergências conhecidas frente ao n8n ativo. Confirmar
o caminho efetivamente executado no histórico do n8n antes de editar ou
reimportar o fluxo.

## Coleta segura antes de retomar

1. Guardar a saída de `Monta | Candidatos [5]` com os seis pares e `limite`, a
   resposta bruta de `SP | Reserva Lote`, o ramo percorrido em `If` e as saídas
   ou erros de `Prepara | Fecha Checkpoint` e `SP | Fecha Checkpoint`.
2. Ler o checkpoint atual, sem alterá-lo:

   ```sql
   SELECT processo, pagina_atual, per_page, limite_execucao, ultimo_post_id,
          updated_at
   FROM WP_migracao_checkpoint
   WHERE processo = 'FEATURED';
   ```

3. Reconsultar a página do WordPress com o mesmo `status`, `orderby`, `order`,
   `per_page` e `page` da execução. Comparar os seis pares e o último post
   `7740`; a paginação por data pode mudar entre execuções.
4. Ler as migrations desses seis posts, incluindo registros de mídia virtual:

   ```sql
   SELECT id, post_id, wp_media_id, wp_media_id_virtual,
          status, storage_provider, updated_at
   FROM WP_migracao_featured
   WHERE post_id IN (7697, 7691, 7714, 7721, 7729, 7740)
   ORDER BY post_id, id;
   ```

5. Classificar os seis candidatos no banco. A consulta abaixo é somente leitura;
   vincular ao `?` o array JSON de `candidatos` obtido em
   `Monta | Candidatos [5]`:

   ```sql
   WITH candidatos AS (
       SELECT jt.post_id, jt.wp_media_id
       FROM JSON_TABLE(
           ?, '$[*]' COLUMNS (
               post_id BIGINT PATH '$.post_id',
               wp_media_id BIGINT PATH '$.wp_media_id'
           )
       ) AS jt
   )
   SELECT
       c.post_id,
       c.wp_media_id,
       m.id AS migration_id,
       m.status,
       m.wp_media_id_virtual,
       m.storage_provider,
       m.error_message,
       CASE WHEN (m.id IS NULL OR m.status IN ('PENDING', 'ERROR'))
                 AND NOT EXISTS (
                     SELECT 1 FROM WP_migracao_featured mv
                     WHERE mv.post_id = c.post_id
                       AND mv.wp_media_id_virtual = c.wp_media_id
                 )
            THEN 1 ELSE 0 END AS elegivel_reserva,
       CASE WHEN EXISTS (
           SELECT 1 FROM WP_migracao_featured mr
           WHERE mr.post_id = c.post_id
             AND mr.status IN ('MIGRATED', 'SKIPPED')
             AND (mr.wp_media_id = c.wp_media_id
                  OR mr.wp_media_id_virtual = c.wp_media_id)
       ) THEN 1 ELSE 0 END AS resolvido_checkpoint
   FROM candidatos c
   LEFT JOIN WP_migracao_featured m
     ON m.post_id = c.post_id AND m.wp_media_id = c.wp_media_id
   ORDER BY c.post_id;
   ```

## Decisão de recuperação

| Evidência | Ação |
| --- | --- |
| Checkpoint já passou da página 87 | Não repetir a reserva ou o fechamento; documentar o avanço já ocorrido e conferir o próximo lote. |
| Checkpoint na página 87, mesmos seis candidatos, todos `resolvido_checkpoint=1` | Usar o caminho existente `Prepara | Fecha Checkpoint` → `SP | Fecha Checkpoint` com o snapshot verificado. Confirmar retorno `AVANCADO`, página 88 e ponteiro 7740. Não usar `SP_WP_avanca_checkpoint_featured`, que não confere a resolução dos candidatos. |
| Um ou mais candidatos em `PROCESSING` sem resolução | Identificar a etapa real de cada migration, reconciliar storage com o banco e retomar apenas os itens pendentes pelo subfluxo apropriado. Exigir auditoria final da exclusão antes de marcar `MIGRATED`, conforme `fechamento-e-retomada-de-lote.md`. Depois repetir o fechamento. |
| Algum `elegivel_reserva=1`, mas a SP retornou zero | Conferir `limite_execucao`, resposta bruta da SP, versão ativa da procedure e transformação do conector MySQL. Não avançar o checkpoint; a elegibilidade e a resposta precisam ser reconciliadas. |
| Os seis candidatos da página mudaram ou o checkpoint está antes de 87 | Parar a recuperação pontual e investigar a paginação/ponteiro. Não fechar com um snapshot desatualizado. |
| Fechamento retornou `AGUARDANDO` | Registrar quais candidatos permanecem não resolvidos. A execução do PAI pode terminar nesse ponto sem resolver a causa. |

Não alterar status diretamente, repetir uploads, executar DELETE ou avançar o
checkpoint apenas porque `tem_reserva=false`. Atualizar `docs/STATUS.md`,
`BACKLOG.md` e `CHANGELOG.md` com os resultados confirmados após a recuperação.
