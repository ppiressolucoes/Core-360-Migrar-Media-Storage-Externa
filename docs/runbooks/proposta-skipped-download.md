# Proposta: downloads rejeitados no PAI

**Não implantada.** Em 2026-11-18 foi recebido o export do PAI ativo, ID
`nU8qHjDapJaZGIL3`, versão `89edd647-b749-44f5-b762-9db62f512735`. Ele
contém `Valida Download Featured` e `IF | Itens Validados`; o snapshot oficial
anterior não os contém. O schema ativo ainda não foi recebido. Os rascunhos
em `database/proposals/` e `workflows/proposals/skipped-download/` continuam
sem homologação e não são um fluxo pronto para importação.

A decisão atual permite registrar rejeições do validador como `SKIPPED`, com
motivo e URL, inclusive quando uma rejeição não prova ausência da origem. Isso
atualiza a restrição mais estreita registrada anteriormente no backlog. Falhas
de rede, status ausente, 408, 425, 429 e 5xx permanecem pendentes, inclusive
522. `SKIPPED` não significa que a origem foi excluída ou migrada.

## Contrato e ligação proposta

O validador recebido retorna `download_valido` e `download_erro`, com binário
e pareamento. O Code node proposto recupera identidade e URL de `Normaliza |
Featured Media` pelo pareamento e o timestamp de `Normaliza | Lote Reservado`.
Ele exige o timestamp como `YYYY-MM-DD HH:mm:ss`; conferir o formato real do
driver antes da integração. Ele só classifica conteúdo se receber status HTTP
2xx explícito em `statusCode` ou `status_code`; ausência, 522 e demais respostas
não 2xx permanecem pendentes.

Para marcar um rejeitado, o rascunho também exige `origem_http_status` 2xx e
`origem_rejeicao_confirmada=true`, emitidos por uma verificação independente
e confiável da resposta e do conteúdo da origem. Esses campos são um contrato
proposto: **o export recebido não os produz** e a implementação dessa
verificação ainda falta. A simples observação de HTTP 200 no proxy não deve
ser convertida nesse sinal. Sem essa evidência, a saída é pendente, não
`SKIPPED`.

O HTTP Request recebido está em formato `file` e não habilita a inclusão de
headers e status. Em ambiente de teste, habilitar **Include Response Headers
and Status** e conferir o formato efetivamente entregue, a preservação do
binário e o pareamento. A [documentação do n8n](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/#response)
explica essa opção e informa que erros não 2xx interrompem por padrão. Testar a
captura de erros por item sem confundir falha de transporte com sucesso.
Verificar também se o proxy repassa o status da origem: se transformar um 522
em 200, o status do proxy não basta para identificar a falha transitória. Sem
essa garantia, não marcar o item `SKIPPED`.

1. Após o validador, preparar o lote uma vez para todos os itens.
   Ele produz um plano com rejeitados, contagem de válidos e pendentes. Falhar
   se o lote ou a identidade não forem íntegros.
2. Se houver rejeitados, chamar a procedure de lote homologada com página,
   lista completa de candidatos e lista de rejeitados,
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

- Comparar o export recebido com a versão atualmente publicada e obter o schema
  completo e `SHOW CREATE PROCEDURE` da reserva,
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

Os testes JavaScript do rascunho cobrem lote misto, todos rejeitados, 522,
status ausente, origem não confirmada e entradas inválidas. Eles não
exercitam MySQL, n8n, concorrência ou o fechamento real do checkpoint. O
ambiente local não tinha servidor MySQL nem n8n; as validações integradas acima
permanecem pendentes.
