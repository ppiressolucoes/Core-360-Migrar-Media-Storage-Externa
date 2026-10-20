# Core-360-Migrar-Media-Storage-Externa
Fluxo de migração de midia storage externa do portal Energia Limpa

**Estado informado em 20/10/2026:** página 78 concluída (migrations 491–496 `MIGRATED`), checkpoint na página 79, último post 6925. Consulte [fechamento da página 78](docs/retomada-checkpoint-pagina-78.md). Os exports versionados exigem importação e configuração no n8n; a atualização deste repositório não publica workflows.

Para retomar uma exclusão após timeout e resposta 404 no DELETE da mídia 6734, consulte [retomada após timeout](docs/retomada-delete-timeout-6734.md).

Para tratar HTTP 429 na confirmação da exclusão da mídia 6778, consulte [retomada após rate limit](docs/retomada-rate-limit-6778.md).

Para a colisão de SHA entre Cloudinary e R2 na migration 493, consulte [diagnóstico e retomada](docs/ocorrencia-migration-493.md). O plugin WordPress corrigido está em `wordpress/m360-external-featured-media-v0.1.10.zip`; o código completo do validador do Sub 01 está em `workflows/nodes/normaliza-midia-virtual-criada-sub01.js`.

O export operacional do Sub 02 recebido após essa atualização apresentou uma condição incorreta no `IF | Confirmação Pendente?`; veja [auditoria da migration 492](docs/ocorrencia-migration-492-auditoria.md). O export versionado neste repositório já usa `confirmacao_pendente` no IF.

Após a conclusão isolada do Sub 02 para 491–493, a execução agendada do PAI continua indisponível para fechar o checkpoint. Consulte [retomada da página 78](docs/retomada-checkpoint-pagina-78.md) para conferir os seis candidatos e processar os restantes ou chamar a procedure de fechamento quando todos estiverem resolvidos.

Na página 79, a migration 498 foi recuperada com storage Cloudinary já persistido enquanto a nova tentativa enviou o mesmo SHA para R2. Consulte [retomada do conflito de storage](docs/retomada-storage-conflitante-498.md) para registrar somente 500–501 e continuar usando o storage canônico do banco.

## Artefatos disponíveis

- `workflows/`: cinco exports n8n fornecidos para esta sprint, preparados para revisão. Os exports estão inativos, sem dados de execução e sem vínculos de credenciais. É necessário vincular credenciais, configurar `CLOUDINARY_PROXY_KEY` e conferir os IDs de subfluxos antes de importar ou executar.
- `workflows/nodes/sha-256-featured-img.js`: código completo corrigido do node `SHA-256 Featured IMG`, pronto para colar no editor do n8n.
- `workflows/nodes/consolida-resultado-upload.js`: código do node `Consolida | Resultado Upload` com validação imediata do host Cloudinary antes de montar o lote.
- `tests/`: testes locais dos contratos de storage, associação, exclusão e notificação. Execute com `node --test tests/*.test.js`.
- `workers/n8n-pel-proxy.js`: referência funcional compacta do Worker compartilhado; **não é a cópia literal do deployment original de 310 linhas**. Para restauração exata em produção, usar a versão anterior no histórico do Cloudflare. O histórico Git preserva o patch experimental de diagnóstico.
- `workers/n8n-pel-proxy-original-colado.js`: transcrição do código original que o usuário colou nesta conversa, com comentários e formatação. Como o texto enviado não contém as 310 linhas mencionadas, conferir o deployment anterior no Cloudflare antes de tratá-lo como cópia literal de produção.
- `workers/migrar-pel-featured-proxy.js`: proposta de Worker exclusivo da migração Featured; publicar como serviço separado, preservando o proxy WordPress compartilhado. Consulte `docs/isolamento-proxy-featured.md`.
- `docs/caminho-feliz-featured.md`: sequência de criação, aplicação das rotas e validação de um item sem repetir upload.
- `workflows/nodes/valida-associacao-wp.js`: código do node que compara a resposta real de `/assign` com o contexto da migration antes da exclusão.
- `sql/reference/`: nove procedures fornecidas como referência, sem `DEFINER` da instância de origem. Não são migrations prontas para aplicar.
- `docs/diagnostico.md`: mapa dos componentes, evidências, pendências e roteiro de validação controlada.
- `docs/banco.md`: tabelas e contratos das procedures usados pela migração.
- `docs/sprint.md`: objetivo, inventário dos insumos, ordem de trabalho e critérios de aceite da sprint.
- `docs/ocorrencia-pagina-73.md`: diagnóstico e ajuste seguro para o agendamento que parou com checkpoint `AGUARDANDO`.
- `docs/ocorrencia-pagina-74.md`: novo bloqueio com três de seis candidatos resolvidos e sem nova reserva; inclui as evidências e os dados necessários para identificar os pendentes.

Os arquivos versionados não representam o estado atual de produção. Nenhuma migração ou exclusão é executada pelos testes locais.

Os arquivos de `workflows/nodes/` contêm o código completo para cada node alterado; os mesmos códigos estão incorporados nos exports correspondentes. `workflows/recovery/` guarda somente exemplos históricos, que não devem ser executados novamente.

### Storage externo por mídia

O contrato multi-provider está em `workflows/sub-storage-media-external.json`, nos três exports `pel-featured-*.json` e em `sql/deploy/`. O subfluxo recebido foi saneado: configurar a chave do proxy como credencial gerenciada antes de importá-lo. As procedures de associação e conclusão foram aplicadas pelo operador durante a retomada. Antes de executar o próximo lote, conferir as versões dos três workflows no n8n e o ponteiro da página 79; consulte [fechamento da página 78](docs/retomada-checkpoint-pagina-78.md).
