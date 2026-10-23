# Estado operacional

Última evidência operacional recebida: 2026-10-23. O checkpoint da página 87
ainda precisa de nova confirmação após a exceção administrativa.

## Página 87: exceção aplicada, fechamento pendente

Em 2026-10-23 foi relatada uma execução agendada incompleta do PAI na página
87: seis candidatos, nenhuma reserva elegível e último post da página 7740.
O fechamento retornou `AGUARDANDO`: três dos seis candidatos estão resolvidos;
na resposta recebida, o checkpoint permaneceu na página 87 e o ponteiro em
7684. A leitura do banco fornecida depois identificou 547, 548 e 549 em
`PROCESSING` com mídia virtual; 550, 551 e 552 estão em `MIGRATED`. A exclusão
e auditoria das mídias originais das três pendentes ainda não foi confirmada.
O operador autorizou encerrar sem verificar nem excluir as originais 7701,
7709 e 7717. A captura do resultado do `CALL
SP_WP_excecao_p87_origem_nao_verificada()` no banco ativo mostra as migrations
547, 548 e 549 em `SKIPPED`, com motivo
`EXCECAO_P87_ORIGEM_NAO_VERIFICADA; auditoria posterior pendente;` e
`updated_at=2026-10-23 15:06:05`. Isso confirma a alteração de status, mas
não comprova a exclusão das originais nem o avanço do checkpoint. A última
leitura do checkpoint recebida foi página 87, ponteiro 7684, **antes** do
`CALL`. A captura não confirma se o `DROP PROCEDURE` posterior foi executado.

Próxima ação: iniciar o PAI desde o começo, conferir os candidatos atuais e a
saída de `SP | Fecha Checkpoint`, depois ler o checkpoint no banco. Consultar
[diagnóstico da página 87](runbooks/pagina-87-sem-reserva.md). O checkpoint da
página 82 abaixo é uma evidência histórica, não uma leitura atual.

## Checkpoint histórico de 2026-10-21

- Processo: `FEATURED`.
- Resultado: `AVANCADO`.
- Página atual: `82`.
- Último post confirmado: `7185`.
- Total de candidatos do último lote: `6`.
- Total de candidatos resolvidos: `6`.
- Atualizado em: `2026-10-21 05:10:07`.

O último lote foi concluído pelo fluxo PAI acionado pela agenda. Não há
pendência conhecida desse lote bloqueando a próxima reserva.

## Evidência do retry de exclusão

A migration `516`, post `7185`, mídia original `7188`, percorreu o ciclo de
confirmação e retornou:

- HTTP `404`;
- código `rest_post_invalid_id`;
- `exclusao_confirmada=true`;
- `confirmacao_pendente=false`;
- `exclusao_acao=CONFIRMADA`.

Essa execução confirma o roteamento do `Valida | Exclusão Confirmada Retry`
para o caminho `CONFIRMADA` do Switch.

## Export oficial do Sub 02

O export recebido em 2026-10-21 foi promovido para o repositório como versão
oficial `cb3f928c-c56f-4b69-a1e9-aca611674de4`. Ele contém:

- Switch das ações `REPETIR_GET`, `REPETIR_DELETE` e `CONFIRMADA`;
- barreira auditada em `Monta | Lote Conclusão`;
- fechamento do checkpoint;
- notificação do lote.
