# Diagnóstico inicial da migração Featured

## Escopo e evidência

O repositório tinha somente o README. Os quatro exports n8n e as nove procedures SQL enviados pelo usuário foram colocados em `workflows/` e `sql/reference/` para permitir revisão e testes locais. Foram removidos `pinData`, vínculos de credenciais e metadados da instância; os fluxos foram marcados como inativos. O cabeçalho estático `X-Proxy-Key` do fluxo Cloudinary agora lê `$env.CLOUDINARY_PROXY_KEY`. Seu valor deve ser configurado com segurança no n8n antes de usar esse fluxo. Os IDs de subfluxos nos nodes `executeWorkflow` continuam apontando para a instância de origem e precisam ser conferidos antes de importar. As procedures de referência estão sem o `DEFINER` original; não foram aplicadas ao banco.

O export do subfluxo de associação continha um resultado fixado para `SP | Fecha Checkpoint`: um item com array de resultado funcional (`resultado = AVANCADO`, 6 candidatos, 6 resolvidos, página 27) e outro com metadados MySQL (`fieldCount`, `affectedRows`). Isso demonstra o formato desse checkpoint no export. Não há `pinData` nem log de execução do retorno de `Chamar | Exclusão e Auditoria` ou da procedure de conclusão; seu formato real ainda precisa ser capturado.

## Mapa dos componentes

| Componente | Presente | Papel e integração |
| --- | --- | --- |
| `pel-featured-pai.json` | Export n8n | Lê ponteiro e candidatos, reserva lote, obtém e baixa imagens, chama o repositório externo Cloudinary, registra mídia externa e chama o subfluxo de associação. Há também caminhos de fechamento de checkpoint no próprio PAI. |
| `pel-featured-associacao-wp.json` | Export n8n | Registra mídia virtual no WordPress, associa ao post, verifica a associação e chama o subfluxo de exclusão. Após seu retorno, chama `SP_WP_fecha_checkpoint_featured`, monta e envia a notificação Gmail. |
| `pel-featured-exclusao-auditoria.json` | Export n8n | Verifica a mídia original, exclui somente após liberação, audita e chama `SP_WP_conclui_migracao_featured_lote`. O último node é a chamada MySQL. |
| `core-cloudinary-gestao-contas.json` | Export n8n | Lê contas de `Config_API_IA`, consulta `/usage` pelo Worker Cloudinary e grava/classifica dados em `Cloudinary_Usage`. A implementação das tabelas e da API do Worker não está aqui. |
| Procedures SQL | Nove arquivos de referência | Os contratos de reserva, registro, conclusão e checkpoint estão disponíveis em `sql/reference/`; não há evidência de que sejam idênticos aos objetos implantados. Veja `docs/banco.md`. |
| Plugin WordPress, Workers, Core Storage, R2 | Ausentes | Os exports fazem chamadas a esses componentes, mas seu código e contratos não podem ser auditados neste repositório. O subfluxo de upload Cloudinary chamado pelo PAI também não foi fornecido. |

O PAI tem caminhos próprios de fechamento do checkpoint e o subfluxo de associação também o fecha após a exclusão. É preciso conferir com uma execução rastreada quais caminhos são mutuamente exclusivos e se não há avanço duplicado. Nenhum ajuste foi feito nessa lógica.

O fluxo de gestão de contas lê `api_key` e `api_secret` do banco e monta um cabeçalho de autorização no JSON de execução. Antes de habilitá-lo, conferir a retenção e o acesso aos dados de execução do n8n para evitar exposição dessas credenciais.

## Notificação do lote

O erro histórico `Referenced node doesn't exist` é compatível com a referência anterior a `Monta | Lote Conclusão`, node existente apenas dentro do subfluxo de exclusão. No export recebido, `Monta | Notificação Lote` já referencia `Chamar | Exclusão e Auditoria`, que existe no mesmo fluxo. A verificação estática não encontrou referências a nodes inexistentes nos scripts dos quatro exports. Sem o histórico de execução, não é possível afirmar que o erro ocorreu nessa versão exata do fluxo.

O código recebido aceitava rows diretas ou um array de primeiro nível. Um retorno MySQL com arrays de resultsets aninhados não seria reconhecido; metadados no mesmo retorno exigem filtragem. A procedure de conclusão fornecida confirma as colunas funcionais esperadas, mas não prova o formato do wrapper n8n na execução. A correção versionada percorre apenas wrappers e arrays conhecidos, aceita somente rows `MIGRATED` com os campos exigidos pela procedure, deduplica por `migration_id` e rejeita conflitos. O checkpoint é lido da entrada do node, separando resultado funcional dos metadados. O Gmail só é acionado quando o checkpoint retorna `AVANCADO` com todos os candidatos resolvidos. `AGUARDANDO` e `JA_AVANCADO` exigem análise ou recuperação isolada; um retry automático poderia duplicar o e-mail. A correção não chama WordPress, banco ou exclusão.

Teste local: `node --test tests/*.test.js`. Os casos cobrem arrays aninhados, metadados, wrappers, duplicatas, ausência de dados, identidades inválidas, estados do checkpoint e a assinatura da procedure de erro. São simulações e verificações estáticas; **não substituem a inspeção do retorno real do subfluxo**.

As procedures também revelaram uma chamada incompatível: `SP | Registra Falha Registro Mídia Virtual` passava um JSON único para `SP_WP_registra_erro_associacao`, que exige cinco argumentos escalares. O export versionado agora passa `migration_id`, `post_id`, `wp_media_id_original`, `wp_media_id_virtual` (ou `NULL`) e `error_message`, como o outro caminho de erro.

## Validação controlada pendente

1. Na instância n8n autorizada, inspecionar uma execução concluída de `SP | Conclui Migração Lote` e o output de `Chamar | Exclusão e Auditoria`. Comparar o formato real com o parser e ajustar somente se necessário. Confirmar que as procedures implantadas correspondem aos arquivos de referência.
2. Confirmar quais workflows e IDs estão ativos, as credenciais vinculadas e a política para `$env.CLOUDINARY_PROXY_KEY`. Conferir também os endpoints WordPress e a autenticação do Gmail. Não registrar valores de segredo.
3. Para recuperar **somente a notificação** de um lote já concluído, confirmar primeiro no banco migrations `MIGRATED` e checkpoint fechado, bem como se o Gmail já enviou a mensagem. Executar isoladamente o trecho de montagem/envio com as saídas registradas, sem reiniciar o PAI ou os subfluxos de associação e exclusão. A checagem prévia evita envio duplicado.
4. Para um novo lote piloto autorizado, registrar IDs dos candidatos e da execução; exigir associação WordPress válida, exclusão auditada, migrations `MIGRATED`, checkpoint consistente e confirmação de envio Gmail. Conferir que o mesmo lote não foi processado duas vezes.
5. Depois do caminho Featured validado, levantar código e contratos do plugin, Workers, Core Storage e procedures. Só então especificar o Storage Provider Registry e a entrada gradual do R2, mantendo a regressão Cloudinary.

Ainda não há evidência para afirmar que notificação, registro R2, frontend, Open Graph, Yoast ou deduplicação funcionam em produção. Os testes locais também não verificam esses componentes externos.
