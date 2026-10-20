# Rate limit na confirmação da exclusão — mídia 6778

Em 20/10/2026, o `GET | Confirma Exclusão Original` da migration 483 recebeu `statusCode=429`, `body.origin_status=429`, `body.target=https://energialimpa.live/wp-json/wp/v2/media/6778` e `origin_body` vazio. Não houve cabeçalho `Retry-After`. A resposta foi gerada pelo serviço de origem visto pelo Worker. Ela não informa se o DELETE anterior foi aplicado.

## Tratamento no subfluxo

`GET | Confirma Exclusão Original` entra em `Valida | Exclusão Confirmada`. Esse Code node devolve `confirmacao_pendente=true` e `exclusao_confirmada=false` para HTTP 429, sem lançar erro. O `IF | Confirmação Pendente?` testa `{{ $json.confirmacao_pendente === true }}`:

- **True:** `Wait | Rate Limit 180s` → `GET | Repete Confirmação Original` → `Valida | Confirmação após Retry` → `Wait 20` → `Loop | Exclusões`.
- **False:** `Wait 20` → `Loop | Exclusões`.

O GET repetido usa `{{ $json.wp_media_id_original }}` da saída do validador, a mesma credencial Basic Auth e `Include Response Headers and Status` com `Never Error`. Os validadores aceitam somente o 404 da origem com `origin_body.code=rest_post_invalid_id` para confirmar a exclusão; o primeiro 429 vira pendência e o segundo interrompe o subfluxo sem avançar a auditoria nem o checkpoint. O retry não passa pelo DELETE.

O export versionado liga o DELETE diretamente ao primeiro GET. Se o workflow publicado tiver `Wait 30s` entre eles, conservar esse node e inserir o ramo de rate limit **depois** do GET. O JSON versionado não publica alterações no n8n.

## Retomada da execução interrompida

Não repetir `Valida | Exclusão Confirmada` sobre o output 429 antigo. Repetir o GET da mídia 6778 após a espera. Se o n8n não permitir prosseguir a partir desse ponto, executar apenas o subfluxo de exclusão com os mesmos itens de entrada, sem reiniciar o PAI nem o subfluxo de associação. A verificação inicial do original decide se há algo a excluir; após 404 válido, o ramo `Original Já Excluída` dispensa novo DELETE. Conferir no banco o estado final da migration 483 e o checkpoint antes de abrir outro lote.
