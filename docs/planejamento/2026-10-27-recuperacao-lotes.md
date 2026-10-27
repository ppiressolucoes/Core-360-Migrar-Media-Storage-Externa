# Proposta: diagnóstico e recuperação de lotes bloqueados

Em 2026-10-23, a página 87 parou com três de seis candidatos resolvidos e
nenhuma reserva elegível. Em 2026-10-27, o mesmo padrão ocorreu na página 98.
Nos dois casos havia migrations em `PROCESSING` com mídia virtual registrada;
a SP de reserva exclui essas mídias e a SP de fechamento exige estado terminal.
As exceções administrativas resolveram o bloqueio pontual, mas deixaram seis
mídias originais sem verificação de presença ou exclusão.

## Recomendação

Criar um fluxo **manual** de diagnóstico e recuperação, acionado pelo operador
quando o PAI retornar `AGUARDANDO` sem reserva. O PAI também deve sinalizar
esse resultado, incluindo página, quantidade resolvida e candidatos pendentes.
O fluxo de recuperação deve priorizar a retomada auditada; uma exceção que
marca `SKIPPED` depende de decisão humana para o lote específico. Não há base
para transformar `AGUARDANDO` em `SKIPPED` automaticamente.

## Contrato proposto

1. Ler novamente o checkpoint `FEATURED`, a página de posts e as migrations;
   comparar os pares atuais com o snapshot que gerou `AGUARDANDO`.
2. Classificar cada par como resolvido (`MIGRATED` ou `SKIPPED`), elegível para
   reserva, `PROCESSING` com mídia virtual, ou divergente. Exibir IDs originais
   e virtuais, provider, URL canônica, idade do estado e motivo da classificação.
3. Para `PROCESSING` com mídia virtual, reconstruir e validar os sinais de
   associação e storage exigidos pelo Sub 01/Sub 02. Consultar a origem e
   retomar o Sub 02 com auditoria final quando a evidência permitir.
4. Se o operador escolher uma exceção administrativa, exigir identificação do
   lote, motivo e confirmação específica. A transação deve conferir checkpoint,
   seis pares, estados e dados canônicos observados; alterar somente os itens
   autorizados para `SKIPPED` e registrar as originais como residuais.
5. Buscar os candidatos novamente e usar `SP_WP_fecha_checkpoint_featured`.
   Registrar `AVANCADO`, `AGUARDANDO` ou divergência; nunca atualizar o ponteiro
   diretamente para contornar candidatos pendentes.
6. Manter uma fila consultável dos residuais com migration, mídia original,
   motivo, data, decisão e estado da auditoria posterior.

## Critérios de aceite

- `AGUARDANDO` após uma reserva limitada e `AGUARDANDO` sem nenhuma reserva
  aparecem como situações distintas, com migrations pendentes identificadas.
- Uma mudança de página, par, status, URL canônica ou checkpoint entre o
  diagnóstico e a alteração cancela a tentativa sem atualizar parcialmente o
  lote; uma repetição não duplica a exceção.
- A retomada normal exige os sinais e a auditoria final já previstos no Sub 02.
  A exceção registra `SKIPPED` e a pendência da origem; não declara `MIGRATED`.
- O fluxo não contém IDs fixos de página ou migration e conserva o limite de
  três reservas do PAI.
- O fechamento da página continua na SP existente, com seis pares atuais e
  evidência do resultado. A fila residual permite localizar todas as originais
  não verificadas das páginas 87 e 98.

Antes de implementar, exportar o PAI publicado e comparar os contratos ativos
com o repositório. A captura de 2026-10-27 mostra `Monta | Candidatos [3]` e
`DB | Recupera Storage Canônico`; o export oficial salvo aqui ainda contém
`Monta | Candidatos [5]` e não inclui esse nó de preflight. Validar o novo fluxo
contra a versão ativa, depois publicar e reexportar os artefatos oficiais.
