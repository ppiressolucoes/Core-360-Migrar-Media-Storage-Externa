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
candidatos resolvidos e não substitui o result set da procedure. O limite de
três reservas por execução não explica, sozinho, por que nenhum dos três
candidatos ainda não resolvidos foi reservado.

Uma leitura de `WP_migracao_featured` fornecida em seguida mostrou:

| Migration | Post | Mídia original | Mídia virtual atual | Status | Provider |
| ---: | ---: | ---: | ---: | --- | --- |
| 548 | 7691 | 7709 | 89998 | `PROCESSING` | `cloudflare_r2` |
| 547 | 7697 | 7701 | 89997 | `PROCESSING` | `cloudinary` |
| 549 | 7714 | 7717 | 89999 | `PROCESSING` | `cloudflare_r2` |
| 550 | 7721 | 7728 | 90000 | `MIGRATED` | `cloudflare_r2` |
| 551 | 7729 | 7735 | 90001 | `MIGRATED` | `backblaze_b2` |
| 552 | 7740 | 7746 | 90002 | `MIGRATED` | `cloudflare_r2` |

Os seis `wp_media_id` recebidos do WordPress são IDs de mídia **virtual**.
A SP de reserva os exclui por já constarem em `wp_media_id_virtual`, mesmo
quando a migration ainda está em `PROCESSING`. A SP de fechamento só considera
as migrations 550–552 resolvidas. As migrations 547–549 precisam de retomada
ou auditoria; mídia virtual registrada não prova exclusão da mídia original.
Não considerar a página concluída ou recuperada com base apenas nessas saídas.

As saídas anteriores do Sub 02 não estavam disponíveis nesta revisão. Uma
tentativa de GET público, somente leitura, para as mídias originais 7701, 7709
e 7717 a partir deste ambiente recebeu `CONNECT tunnel failed, response 403`
do proxy de rede. Esse erro ocorreu antes de uma resposta do WordPress; não
informa se as mídias existem. Nenhum DELETE ou comando de alteração no banco
foi executado nesta investigação. O operador informou que não consegue
executar os três GETs pelo n8n neste momento. A recuperação fica pendente dessa
verificação; não há confirmação de exclusão, conclusão ou avanço da página 87.

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
reimportar o fluxo. A procedure
`SP_WP_recupera_migracao_featured_processing` existente no repositório só
retorna `PROCESSING` com `wp_media_id_virtual IS NULL`; ela não recupera
automaticamente as migrations 547–549, que já têm mídia virtual.

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

   A consulta direcionada da página 87 está em
   [`database/recovery/pagina87-contexto-pendente.sql`](../../database/recovery/pagina87-contexto-pendente.sql).
   Ela é somente leitura, confere os IDs originais e virtuais das migrations
   547–549 e sinaliza divergências antes de qualquer retomada.

   ```sql
   SELECT id, post_id, wp_media_id, wp_media_id_virtual,
          status, storage_provider, updated_at
   FROM WP_migracao_featured
   WHERE post_id IN (7697, 7691, 7714, 7721, 7729, 7740)
   ORDER BY post_id, id;
   ```

   Se a execução anterior do Sub 01 não estiver disponível, consultar também
   `storage_url` e os demais identificadores canônicos das migrations 547–549.
   Comparar cada registro com leituras atuais do post e da mídia virtual no
   WordPress, aplicando as mesmas validações de associação e URL do Sub 01.
   Não preencher `associacao_wp_confirmada` ou `exclusao_liberada` por suposição.

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
| Migrations 547–549 ainda em `PROCESSING`, com mídia virtual | Obter a execução anterior do Sub 01/Sub 02. Confirmar associação no WordPress, storage canônico e os sinais `associacao_wp_confirmada` e `exclusao_liberada` exigidos pelo Sub 02. Verificar por GET o estado das mídias originais 7701, 7709 e 7717. Retomar somente essas três migrations pelo Sub 02 com o contrato validado e a auditoria final exigida em `fechamento-e-retomada-de-lote.md`. Depois repetir o fechamento. |
| Algum `elegivel_reserva=1`, mas a SP retornou zero | Conferir `limite_execucao`, resposta bruta da SP, versão ativa da procedure e transformação do conector MySQL. Não avançar o checkpoint; a elegibilidade e a resposta precisam ser reconciliadas. |
| Os seis candidatos da página mudaram ou o checkpoint está antes de 87 | Parar a recuperação pontual e investigar a paginação/ponteiro. Não fechar com um snapshot desatualizado. |
| Fechamento retornou `AGUARDANDO` | Registrar quais candidatos permanecem não resolvidos. A execução do PAI pode terminar nesse ponto sem resolver a causa. |

Para obter a evidência faltante, usar no n8n ativo o mesmo GET somente leitura
de `GET | Verifica Mídia Original`, com a credencial já configurada, para os
IDs 7701, 7709 e 7717. Registrar HTTP status, código de origem e a migration
correspondente. `404/rest_post_invalid_id` significa original ausente e exige
passagem pela auditoria final do Sub 02; HTTP 200 significa original presente
e exige o fluxo controlado de DELETE e confirmação; 429/5xx são inconclusivos
e exigem espera e novo GET. Erros de autenticação ou de rede não autorizam
prosseguir. Recuperar o resultado do Sub 01 que confirmou a associação e
liberou a exclusão ou repetir suas verificações somente leitura com os dados
canônicos atuais; o Sub 02 exige esses sinais.

Não alterar status diretamente, repetir uploads, executar DELETE ou avançar o
checkpoint apenas porque `tem_reserva=false`. Ter mídia virtual no banco e no
post não libera, por si só, o DELETE: o Sub 02 exige confirmação da associação,
URL do storage canônico e liberação explícita do Sub 01. Atualizar `docs/STATUS.md`,
`BACKLOG.md` e `CHANGELOG.md` com os resultados confirmados após a recuperação.
