# Proposta: downloads rejeitados no PAI

**Não implantada.** O export oficial não contém `Valida Download Featured` nem
`IF | Itens Validados`; o contrato real desses nós e o schema ativo ainda não
foram recebidos. Uma procedure e Code nodes foram reconstruídos localmente como
rascunho, mas não foram publicados neste repositório. Esta documentação registra
o desenho proposto; não é um export nem uma instrução para alterar o fluxo ativo.

A decisão atual permite registrar rejeições do validador como `SKIPPED`, com
motivo e URL, inclusive quando uma rejeição não prova ausência da origem. Isso
atualiza a restrição mais estreita registrada anteriormente no backlog. Falhas
de rede, status ausente, 408, 425, 429 e 5xx permanecem pendentes, inclusive
522. `SKIPPED` não significa que a origem foi excluída ou migrada.

## Contrato e ligação proposta

O validador precisa emitir uma única lista completa, uma entrada por download,
com `migration_id`, `post_id`, `wp_media_id`, `original_url`, `http_status`,
`classificacao` (`VALIDO` ou `REJEITADO`), `motivo` para rejeitados e
`reserva_updated_at` da reserva, no formato `YYYY-MM-DD HH:mm:ss`. Preservar
os binários e o pareamento dos itens válidos. Adaptar explicitamente a saída
real do nó ativo; não presumir que ela já usa esses nomes. Configurar o HTTP
Request para que status e erros transitórios cheguem ao classificador sem
serem confundidos com rejeições definitivas. Não converter falhas de transporte
em status 200. A captura do timestamp deve ser adicionada ao contexto, pois o
export antigo o descarta em `Recupera | Contexto Post`.

1. Após o validador, preparar o lote uma vez para todos os itens.
   Ele produz um plano com rejeitados, contagem de válidos e pendentes. Falhar
   se o lote ou a identidade não forem íntegros.
2. Se houver rejeitados, chamar uma procedure de lote homologada
   usando parâmetros SQL vinculados; somente após sucesso seguir adiante. Se
   não houver, desviar da SP. Erro de banco deve interromper, sem liberar upload
   nem fechamento. Nunca interpolar URLs em SQL.
3. Após ambos os caminhos, encaminhar os itens válidos
   para o loop/upload existente; o sentinela `tem_validos=false` vai para
   `Prepara | Fecha Checkpoint` e a SP de fechamento existente. Para lote misto,
   o Sub 01 fecha após concluir uploads, como no fluxo atual. Não acionar ambos
   os fechamentos. Pendentes devem ser sinalizados ao operador; ao fechar, a SP
   retornará `AGUARDANDO` enquanto permanecerem não resolvidos.

Usar o mesmo conjunto de entrada no plano e no encaminhamento; os nomes dos
nós nas referências devem ser conferidos contra o export ativo. O contrato de
`IF | Itens Validados` precisa ser reconciliado com este desenho para evitar
perda de ramo ou execução duplicada. O plano não carrega binários no JSON; o
segundo Code node recupera os itens de origem apenas após o sucesso da SP.

## Homologação obrigatória antes de propor produção

- Obter export ativo, schema completo e `SHOW CREATE PROCEDURE` da reserva,
  storage e fechamento; verificar tipo/capacidade de `error_message`, precisão
  de `updated_at`, índices e garantias de unicidade. A auditoria JSON deve caber
  integralmente; a solução deve detectar truncamento e reverter a transação.
- Executar a procedure em MySQL compatível, em base isolada com schema real.
  Testar rollback de lote inteiro, repetição idêntica, alterações de estado,
  identidade e timestamp, storage/mídia virtual, concorrência com registro de
  storage, perda de conexão e erro SQL. Avaliar bloqueios, isolamento e a
  possibilidade de outra migration representar a mídia como virtual.
- Testar no n8n real lotes só válidos, mistos, só rejeitados, rejeição com URL
  longa ou caracteres especiais, 522, falha de rede, erro do banco, ausência de
  reserva e execução repetida. Confirmar upload somente dos válidos, auditoria
  integral e checkpoint `AVANCADO` somente quando todos estiverem resolvidos.
  Confirmar `AGUARDANDO` para os transitórios e sinalização operacional.
- Reexportar o fluxo homologado. A procedure proposta não deve avançar o
  checkpoint nem excluir originais. Não aplicar a solução em produção enquanto
  os testes e a reconciliação acima não forem concluídos.

## Evidência de testes locais

Em 2026-11-18, quatro testes JavaScript do rascunho passaram: lote misto,
todos rejeitados, 522 e outros transitórios, e entradas inválidas. Eles não
exercitam MySQL, n8n, concorrência ou o fechamento real do checkpoint. O
ambiente local não tinha servidor MySQL e o export ativo não foi disponibilizado;
as validações acima permanecem pendentes.
