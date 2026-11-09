# Reabertura controlada de lote sem storage

`SP_WP_reabre_migracao_featured_lote` permite reexecutar o PAI quando uma
migration ficou em `PROCESSING` antes do registro de storage e da mídia virtual.
Ela altera somente os alvos válidos para `ERROR`, estado elegível para a SP de
reserva. A procedure não altera o checkpoint e não marca itens como `SKIPPED`
ou `MIGRATED`.

## Escopo e pré-condições

- Usar somente quando não houver execução concorrente do PAI ou dos subfluxos
  para a mesma página. Conferir a versão ativa de
  `SP_WP_reserva_migracao_featured`: ela precisa aceitar `ERROR` e limpar
  `error_message` ao reservar. Para inspecionar a definição ativa:

  ```sql
  SHOW CREATE PROCEDURE SP_WP_reserva_migracao_featured;
  ```
- Confirmar que os candidatos ainda são os da página atual do WordPress. Ler o
  checkpoint e os registros no mesmo banco que o PAI usa:

  ```sql
  SELECT processo, pagina_atual, ultimo_post_id, updated_at,
         per_page, limite_execucao
  FROM WP_migracao_checkpoint
  WHERE processo = 'FEATURED';

  SELECT id, post_id, wp_media_id, wp_media_id_virtual, status,
         sha256, storage_provider, storage_key, storage_url,
         storage_asset_id, cloudinary_public_id, cloudinary_url,
         error_message, updated_at
  FROM WP_migracao_featured
  WHERE post_id IN (/* posts da página atual */)
  ORDER BY post_id, id;
  ```

- Cada alvo deve estar em `PROCESSING`, sem mídia virtual, SHA-256, storage
  canônico, campos Cloudinary legados ou erro registrado. Um objeto pode existir
  no provedor mesmo quando o banco está vazio; conferir reutilização ou
  conflito antes de repetir uploads. A falha HTTP 415 observada na página 132
  pode reaparecer e precisa de diagnóstico próprio.
- A procedure usa apenas colunas confirmadas na tabela ativa em 2026-11-09.
  O arquivo `SP_WP_registra_storage_lote.sql` do repositório usa colunas
  adicionais; comparar sua definição com o banco antes de implantá-lo.

## Implantação e chamada

O arquivo canônico está em
[`database/procedures/SP_WP_reabre_migracao_featured_lote.sql`](../../database/procedures/SP_WP_reabre_migracao_featured_lote.sql).
Ele contém `DELIMITER` para execução integral no Workbench. Criar a procedure
uma vez após comparar o esquema e as permissões do ambiente ativo. Não
substituir uma procedure homônima existente sem inspecionar sua definição.

A chamada exige a página, o último post e `updated_at` **atuais** do checkpoint;
todos os candidatos da página; os alvos com seus `updated_at` atuais; e um
motivo. Os alvos devem ser um subconjunto dos candidatos e não exceder
`limite_execucao`. Exemplo estrutural para a página 132 (substituir todos os
horários pelos valores recém-lidos; não copiar um snapshot antigo):

```sql
CALL SP_WP_reabre_migracao_featured_lote(
  132,
  11331,
  'AAAA-MM-DD HH:MM:SS',
  '[{"post_id":11358,"wp_media_id":11382},
    {"post_id":11365,"wp_media_id":11373},
    {"post_id":11380,"wp_media_id":11400}]',
  '[{"migration_id":798,"post_id":11358,"wp_media_id":11382,"updated_at":"AAAA-MM-DD HH:MM:SS"},
    {"migration_id":799,"post_id":11365,"wp_media_id":11373,"updated_at":"AAAA-MM-DD HH:MM:SS"},
    {"migration_id":800,"post_id":11380,"wp_media_id":11400,"updated_at":"AAAA-MM-DD HH:MM:SS"}]',
  'Reprocessamento autorizado apos falha de upload'
);
```

`REABERTO` indica que os alvos passaram a `ERROR`. Uma segunda chamada com o
mesmo snapshot e motivo retorna `JA_REABERTO` sem alterar as linhas. Qualquer
divergência de checkpoint, candidato, timestamp, estado ou storage aborta a
transação; reconsultar o banco antes de tentar novamente. O `error_message`
recebe o motivo, mas a SP de reserva o apaga no próximo PAI. Guardar a saída do
`CALL` no registro operacional.

## Reexecução do PAI

1. Iniciar o PAI uma vez pelo gatilho inicial. Conferir que `Normaliza | Lote
   Reservado` retornou os mesmos `migration_id` e `total_reservado` esperado.
2. Acompanhar download, upload e registro de storage. Se o upload falhar,
   capturar migration, provider, HTTP status, código e corpo da resposta. Não
   repetir chamadas em ciclo sem corrigir a causa.
3. Continuar Sub 01 e Sub 02 somente com o contrato canônico confirmado. A
   página avança pelo fechamento normal quando todos os candidatos chegam a
   estado terminal. `AGUARDANDO` ainda indica pendência; não atualizar o
   checkpoint diretamente.

Esta procedure não recupera migrations com storage ou mídia virtual já
registrados. Nesses casos, seguir a retomada auditada do Sub 01/Sub 02 ou
avaliar uma exceção administrativa separada para o lote específico.

## Validação do artefato

A procedure foi criada e chamada em MySQL 8.4 e MariaDB 10.11 isolados, com
uma tabela de teste contendo as colunas observadas no banco ativo. Os testes
cobriram `REABERTO` para três alvos, `JA_REABERTO` na segunda chamada,
re-reserva dos mesmos IDs pela SP de reserva, recusa de snapshot antigo e
recusa de um lote com storage parcial. Nenhum teste automatizado conectou ao
banco ativo.

## Aplicação observada na página 132

Em 2026-11-09, o operador criou a procedure no banco ativo e enviou o
resultado da chamada: 798, 799 e 800 retornaram `REABERTO`, em `ERROR`, às
13:31:38. O PAI seguinte reservou os três IDs em `PROCESSING` às 13:32:54.
Isso confirma a reabertura; não confirma o fechamento da página.

Na mesma execução, `Download | Featured IMG` retornou três binários. O
terceiro apareceu como `data.html`, MIME `text/html`, com 184 kB, e o upload
externo terminou em HTTP 400 (`ERR_BAD_REQUEST`). A captura não traz HTTP
status ou headers do download. Para investigar, executar isoladamente o GET
do terceiro item com resposta completa e anotar URL efetiva, status,
`Content-Type`, eventual `Location` e título/início não sensível do HTML.
Não passar o HTML para o subfluxo de storage. Antes de repetir o PAI, verificar
os dois primeiros uploads e o estado canônico das três migrations para evitar
uploads duplicados ou objetos sem registro.
