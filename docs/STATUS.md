# Estado operacional

Última evidência operacional recebida: 2026-10-23. A resposta de
`SP | Fecha Checkpoint` confirmou o avanço para a página 89, último post 7877.

## Página 88: processamento concluído

O PAI recebeu seis candidatos: posts 7749, 7762, 7841, 7849, 7864 e 7877;
`per_page=6`, `limite_execucao=3`, último post da página 7877. A primeira
reserva retornou `tem_reserva=true`, `total_reservado=3` e as migrations 553,
554 e 555, correspondentes aos posts 7749, 7762 e 7841, em `PROCESSING` às
15:13:56. O primeiro fechamento retornou `AGUARDANDO`, três de seis
resolvidos, mantendo página 88 e último post 7740.

Em execução posterior, `SP | Fecha Checkpoint` retornou `AVANCADO`, seis de
seis resolvidos, página 89, último post 7877 e
`updated_at=2026-10-23 15:41:01`. A saída da segunda reserva e uma leitura
SQL separada do checkpoint não foram fornecidas. O avanço é confirmado pelo
resultado da SP; a contagem não identifica individualmente o status final de
cada migration.

## Página 87: recuperação concluída por exceção administrativa

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
`updated_at=2026-10-23 15:06:05`. Em execução posterior do PAI,
`SP | Fecha Checkpoint` retornou `AVANCADO`, `total_candidatos=6`,
`total_resolvidos=6`, `pagina_atual=88`, `ultimo_post_id=7740` e
`updated_at=2026-10-23 15:11:49`. A resposta da SP comprova o fechamento;
não foi enviada leitura SQL separada do checkpoint. A exceção não comprova a
exclusão das originais. A captura anterior também não confirma se o
`DROP PROCEDURE` posterior foi executado. Essas duas verificações permanecem
no backlog de manutenção. Consultar [diagnóstico da página 87](runbooks/pagina-87-sem-reserva.md).
O checkpoint da página 82 abaixo é uma evidência histórica.

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
