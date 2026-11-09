# Página 132: continuar 798/799 no Sub 01 e deixar 800 residual

Decisão operacional de 2026-11-09: preservar os uploads confirmados de 798
(Cloudinary) e 799 (Cloudflare R2), continuar essas duas migrations a partir
da associação no WordPress e registrar apenas a 800 como `SKIPPED`. O PAI
parou no terceiro laço: a mídia 11400 trouxe uma URL externa embutida em
`/wp-content/uploads/`, e `Download | Featured IMG` devolveu `text/html`.

## Estado confirmado antes da retomada

- `SP_WP_registra_storage_lote` retornou `STORAGE_REGISTRADO`, 2/2. A leitura
  posterior confirmou 798 e 799 em `PROCESSING`, com SHA-256, provider, key,
  URL e asset ID iguais aos uploads. Ambas ainda não tinham mídia virtual.
- 800 continuava `PROCESSING`, sem storage, SHA-256 ou mídia virtual.
- O checkpoint ainda não teve avanço confirmado da página 132.

## Sequência

1. Com o PAI parado, executar
   [`pagina132-residual-800.sql`](../../database/recovery/pagina132-residual-800.sql)
   no banco ativo. Exigir `linhas_alteradas_esperadas_1 = 1` e conferir a
   linha final da 800 em `SKIPPED`. O script não altera 798/799 nem o
   checkpoint. Se retornar zero, não continuar antes de reavaliar o estado.
2. Ler as três linhas e o checkpoint no mesmo banco:

   ```sql
   SELECT processo, pagina_atual, ultimo_post_id, updated_at
     FROM WP_migracao_checkpoint WHERE processo = 'FEATURED';
   SELECT id, post_id, wp_media_id, wp_media_id_virtual, status, sha256,
          storage_provider, storage_key, storage_url, storage_asset_id,
          error_message, updated_at
     FROM WP_migracao_featured WHERE id IN (798,799,800) ORDER BY id;
   ```

   Esperado: checkpoint página 132 / último post 11331; 798/799 em
   `PROCESSING` com o storage já confirmado e sem mídia virtual; 800 em
   `SKIPPED` sem storage.
3. Escolher **um** modo de iniciar a versão ativa do Sub 01:

   - **Execução manual no próprio Sub 01:** em `Start WP`, usar `Edit Output`
     no pin existente e substituir os três itens antigos pelo array de
     [`pagina132-start-sub01.json`](../../workflows/recovery/pagina132-start-sub01.json).
     Conferir na saída do `Start WP` que existem **dois itens**, 798 e 799,
     com SHA-256, provider, key, URL, asset ID, MIME e dimensões preenchidos.
     A 800 aparece somente em `candidatos_pagina`, não como terceiro item.
     Executar o Sub 01 manualmente e **remover o pin após a execução**.
   - **Workflow temporário chamador:** criar `Manual Trigger` → `Code`
     (`Run Once for All Items`) → `Execute Workflow`; colar no Code
     [`pagina132-start-sub01.js`](../../workflows/recovery/pagina132-start-sub01.js).
     O Code deve devolver exatamente dois itens. Configurar `Execute Workflow`
     para passar todos os itens ao Sub 01 ativo e aguardar sua conclusão.
     Nesse modo, **remover antes o pin do `Start WP`** no Sub 01, pois o pin
     substitui a entrada real nas execuções de teste.

   O `Start WP` ativo mostra `Accept all data`; não editar a lógica do Sub 01.
   Uma captura de 2026-11-09 mostrou três itens pinned antigos, com 798, 799
   e 800 e campos de storage nulos. Esses dados não podem ser executados.
4. Acompanhar registro da mídia virtual, associação com o post, Sub 02 e
   auditoria. O fechamento normal deve contar a 800 como `SKIPPED` e as duas
   restantes como `MIGRATED`, retornando `AVANCADO` para a página 133 e
   `ultimo_post_id = 11402`. Caso retorne `AGUARDANDO`, ler as três linhas e
   investigar a etapa pendente. Não atualizar o checkpoint diretamente.

O workflow temporário não chama download nem upload. Não repetir o PAI nem a
SP de registro de storage para 798/799. O export salvo do Sub 01 precisa ser
conferido com a versão publicada antes da execução, pois os exports do
repositório podem estar defasados em relação ao n8n ativo.

## Correção permanente pendente

O `IF Mídia Local?` do PAI usa apenas o prefixo da URL; ele aceitou o valor
malformado da mídia 11400 como upload local. Validar o caminho depois de
`/wp-content/uploads/` e rejeitar URL embutida; após o GET, bloquear
`text/html` ou outro formato inesperado antes de chamar o storage. Registrar
status HTTP e `Content-Type` no diagnóstico da mídia rejeitada.

## Resultado observado

O operador confirmou a 800 em `SKIPPED` às 14:08:18, com marcador
`EXCECAO_P132_URL_ORIGEM_INVALIDA` e sem storage. O Sub 01 manual terminou,
e o pin temporário do `Start WP` foi removido. A leitura final do banco mostrou:

| Migration | Resultado | Mídia virtual | Storage |
| --- | --- | --- | --- |
| 798 | `MIGRATED` às 14:55:25 | 93022 | Cloudinary |
| 799 | `MIGRATED` às 14:55:25 | 93024 | Cloudflare R2 |
| 800 | `SKIPPED` às 14:08:18 | Nenhuma | Nenhum |

`SP | Fecha Checkpoint` retornou `AVANCADO`, 3/3 resolvidos, página 133,
último post 11402 e `updated_at=2026-11-09 14:55:25`. O fechamento da página
está confirmado pela saída da SP; a auditoria da mídia 11400 continua pendente.
