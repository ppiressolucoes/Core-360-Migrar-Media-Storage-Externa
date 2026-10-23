# Estado operacional

Última confirmação operacional anterior: 2026-10-21. Relato em apuração
atualizado em 2026-10-23.

## Relato posterior em apuração

Em 2026-10-23 foi relatada uma execução agendada incompleta do PAI na página
87: seis candidatos, nenhuma reserva elegível e último post da página 7740.
O fechamento retornou `AGUARDANDO`: três dos seis candidatos estão resolvidos;
na resposta recebida, o checkpoint permaneceu na página 87 e o ponteiro em
7684. A leitura do banco fornecida depois identificou 547, 548 e 549 em
`PROCESSING` com mídia virtual; 550, 551 e 552 estão em `MIGRATED`. A exclusão
e auditoria das mídias originais das três pendentes ainda não foi confirmada.
O operador não consegue executar agora os GETs de verificação dos originais
7701, 7709 e 7717 pelo n8n; a recuperação permanece pendente.
Consultar [diagnóstico da página 87](runbooks/pagina-87-sem-reserva.md) antes
de retomar. O checkpoint da página 82 abaixo é o último estado **confirmado
neste documento**, não uma leitura atual.

## Checkpoint confirmado

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
