# Migration 492: auditoria final encontrou mídia original

O Sub 02 exportado em 20/10/2026 chegou a `Falha | Auditoria Final` com `migration=492`, mídia original 6902, `auditoria_status=ORIGINAL_EXISTE` e HTTP 200. Este bloqueio é correto: a procedure de conclusão não deve ser executada enquanto a mídia original ainda aparece no GET final.

## Defeito observado no export do Sub 02

`Valida | Exclusão Confirmada` transforma HTTP 429 em `confirmacao_pendente: true`. O node seguinte, `IF | Confirmação Pendente?`, porém testa `Number($json.body?.origin_status ?? $json.statusCode ?? 0) === 429`. Na saída do validador esses campos já não existem. Portanto a condição é falsa mesmo quando a confirmação está pendente, e o loop pode avançar para a auditoria final sem um 404 confirmado.

Configurar o IF com tipo **Boolean**, operação **is true**, valor:

```text
={{ $json.confirmacao_pendente === true }}
```

O ramo **true** deve seguir para espera de 180 segundos, `GET | Repete Confirma Exclusão Original` e `Valida | Exclusão Confirmada Retry`. O ramo **false** segue ao loop somente quando `exclusao_confirmada === true`. O node `Wait 30s` exportado está configurado para 15 segundos; ajustar para 30 segundos se a intenção for esperar 30.

## Verificação antes da retomada

Confirmar, na mesma execução da migration 492, as respostas de `DELETE | Mídia Original`, `GET | Confirma Exclusão Original`, `Valida | Exclusão Confirmada` e `GET | Auditoria Final Original`. A falha do IF explica o avanço indevido se o primeiro GET retornou 429; não prova, por si só, que esse foi o retorno da migration 492. Conferir que o GET final HTTP 200 tem `body.id=6902`.

Se o original 6902 ainda existir, conferir novamente o post 6898 com `featured_media=89399` e a URL da mídia virtual R2. Depois, retomar **somente o Sub 02** com o lote apropriado. A verificação inicial identifica os originais já excluídos e permite repetir apenas o DELETE necessário. Aceitar conclusão somente depois de GET 404 do WordPress com `origin_body.code=rest_post_invalid_id` e auditoria final 404. Não repetir o PAI nem o registro da mídia virtual por causa deste erro.
