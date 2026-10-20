# Migration 492: auditoria final encontrou mídia original

O Sub 02 exportado em 20/10/2026 chegou a `Falha | Auditoria Final` com `migration=492`, mídia original 6902, `auditoria_status=ORIGINAL_EXISTE` e HTTP 200. A saída completa posterior confirmou `body.id=6902`. O `DELETE | Mídia Original` dessa migration recebeu HTTP **429** da origem para `/media/6902?force=true`; portanto não há evidência de exclusão. Este bloqueio é correto: a procedure de conclusão não deve ser executada enquanto a mídia original ainda aparece no GET final.

As saídas enviadas para os nodes de confirmação pertencem a outra iteração: `GET | Confirma Exclusão Original` recebeu HTTP 429 para **6907** e `Valida | Exclusão Confirmada` devolveu `migration_id=493`, `confirmacao_pendente=true`. Elas demonstram um segundo item pendente, mas não descrevem a confirmação da mídia 6902.

## Defeito observado no export do Sub 02

`Valida | Exclusão Confirmada` transforma HTTP 429 em `confirmacao_pendente: true`. O node seguinte, `IF | Confirmação Pendente?`, porém testa `Number($json.body?.origin_status ?? $json.statusCode ?? 0) === 429`. Na saída do validador esses campos já não existem. Portanto a condição é falsa mesmo quando a confirmação está pendente, e o loop pode avançar para a auditoria final sem um 404 confirmado.

Configurar o IF com tipo **Boolean**, operação **is true**, valor:

```text
={{ $json.confirmacao_pendente === true }}
```

O ramo **true** deve seguir para espera de 180 segundos, `GET | Repete Confirma Exclusão Original` e `Valida | Exclusão Confirmada Retry`. O ramo **false** segue ao loop somente quando `exclusao_confirmada === true`. O node `Wait 30s` exportado está configurado para 15 segundos; ajustar para 30 segundos se a intenção for esperar 30. O `DELETE` tem `batchSize=1` e `batchInterval=10000`, mas o loop entrega apenas um item por execução do node; essa opção não cria intervalo entre as iterações do loop. Use um Wait explícito entre itens se o rate limit persistir.

## Verificação antes da retomada

Após corrigir o IF, aguardar o rate limit cessar e consultar o estado das migrations 491–493 no banco. O Sub 02 pode receber novamente o mesmo lote se as migrations ainda estiverem em processamento: seu GET inicial classifica cada original já excluída como tal e tenta DELETE apenas nas que ainda existirem. A saída da auditoria de 6902 confirma que a migration 492 precisará de nova tentativa de DELETE. Para 6907, primeiro confirmar a situação após o 429; não presumir que o DELETE foi aplicado.

Antes da nova tentativa do DELETE de 6902, conferir novamente o post 6898 com `featured_media=89399` e a URL da mídia virtual R2. Retomar **somente o Sub 02** com o lote apropriado; não repetir o PAI nem o registro da mídia virtual por causa deste erro. Aceitar conclusão somente depois de GET 404 do WordPress com `origin_body.code=rest_post_invalid_id` e auditoria final 404. Não alterar `Falha | Auditoria Final` para aceitar HTTP 200.
