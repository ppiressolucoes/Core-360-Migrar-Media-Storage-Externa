# Rate limit na confirmação da exclusão — mídia 6778

Em 20/10/2026, o `GET | Confirma Exclusão Original` da migration 483 recebeu `statusCode=429`, `body.origin_status=429`, `body.target=https://energialimpa.live/wp-json/wp/v2/media/6778` e `origin_body` vazio. Não houve cabeçalho `Retry-After`. A resposta foi gerada pelo serviço de origem visto pelo Worker. Ela não informa se o DELETE anterior foi aplicado.

## Tratamento no subfluxo

Após `GET | Confirma Exclusão Original`, `IF | Confirmação 429?` testa `Number($json.body?.origin_status ?? $json.statusCode ?? 0) === 429`:

- **True:** `Wait | Rate Limit 180s` → `GET | Repete Confirmação Original` → `Valida | Exclusão Confirmada`.
- **False:** `Valida | Exclusão Confirmada`.

O GET repetido usa o ID de `Loop | Exclusões`, a mesma credencial Basic Auth e `Include Response Headers and Status` com `Never Error`. O node de validação aceita somente o 404 da origem com `origin_body.code=rest_post_invalid_id`; um segundo 429 ou qualquer resposta diferente interrompe o subfluxo sem avançar a auditoria nem o checkpoint. O retry não passa pelo DELETE.

O export versionado liga o DELETE diretamente ao primeiro GET. Se o workflow publicado tiver `Wait 30s` entre eles, conservar esse node e inserir o ramo de rate limit **depois** do GET. O JSON versionado não publica alterações no n8n.

## Retomada da execução interrompida

Não repetir `Valida | Exclusão Confirmada` sobre o output 429 antigo. Repetir o GET da mídia 6778 após a espera. Se o n8n não permitir prosseguir a partir desse ponto, executar apenas o subfluxo de exclusão com os mesmos itens de entrada, sem reiniciar o PAI nem o subfluxo de associação. A verificação inicial do original decide se há algo a excluir; após 404 válido, o ramo `Original Já Excluída` dispensa novo DELETE. Conferir no banco o estado final da migration 483 e o checkpoint antes de abrir outro lote.
