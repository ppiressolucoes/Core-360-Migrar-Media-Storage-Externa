# Agendamento Featured: página 74 aguardando

## Evidência de 19/10/2026

O checkpoint da página 73 avançou: a execução atual iniciou com `pagina_atual = 74` e `ultimo_post_id = 6589`. `Monta | Candidatos [5]` informou seis candidatos para a página 74, com `ultimo_post_pagina = 6642`.

`Normaliza | Lote Reservado` retornou `tem_reserva = false`, `total_reservado = 0`, `etapa = SEM_CANDIDATOS_ELEGIVEIS`. `SP | Fecha Checkpoint` retornou `AGUARDANDO`, `total_candidatos = 6`, `total_resolvidos = 3`, `pagina_atual = 74`, `ultimo_post_id = 6589`. O item `affectedRows = 9` é metadado do driver MySQL e não altera a contagem de resolvidos.

Esses dados mostram que **três candidatos da página 74 ainda não estão resolvidos e nenhum entrou na reserva**. Ainda não identificam quais são os três nem por que foram excluídos. A saída bruta de `SP | Reserva Lote` e a lista dos seis pares `(post_id, wp_media_id)` de `Monta | Candidatos [5]` são necessárias para distinguir resultset vazio de falha no normalizador e consultar o estado correspondente no banco. `Busca Posts` ordena por `date ASC`; não é seguro inferir os seis IDs a partir do intervalo entre `ultimo_post_id` e `ultimo_post_pagina`.

O export versionado do PAI contém `Valida | Checkpoint PAI`, que sinaliza erro quando há zero reservas e o checkpoint está `AGUARDANDO`. A captura da execução publicada termina no node `SP | Fecha Checkpoint` sem mostrar essa validação conectada. Conferir a versão publicada antes de reativar a agenda; esse guard torna o bloqueio visível, mas não resolve as três migrations.

## Diagnóstico antes de reprocessar

1. Manter o agendamento pausado e confirmar se há execução do PAI ou dos subfluxos ainda ativa.
2. Capturar os seis pares de `Monta | Candidatos [5]` e a saída bruta de `SP | Reserva Lote` da mesma execução. A saída do normalizador sozinha não prova que a procedure devolveu zero linhas funcionais.
3. Consultar `WP_migracao_featured` para cada par: `id`, `post_id`, `wp_media_id`, `status`, `sha256`, `cloudinary_public_id`, `cloudinary_url`, `wp_media_id_virtual`, `error_message`, `updated_at`. Conferir também se a mídia atual já aparece como `wp_media_id_virtual` de outra migration do mesmo post.
4. Para linhas `PROCESSING`, localizar a última etapa persistida e verificar eventual asset Cloudinary antes de mudar status ou repetir upload. Se houver URL ou mídia virtual, retomar da etapa comprovada em vez de reiniciar o PAI para o item.
5. Processar apenas os itens reconciliados. O checkpoint da página 74 só deve avançar pelo caminho normal quando os seis candidatos forem contados como `MIGRATED` ou `SKIPPED`.

Não avançar a página manualmente: isso deixaria três candidatos sem resolução. Não reutilizar os IDs 457–462 da página 73 em SQL de recuperação da página 74.
