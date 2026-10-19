# Core-360-Migrar-Media-Storage-Externa
Fluxo de migração de midia storage externa do portal Energia Limpa

## Artefatos disponíveis

- `workflows/`: cinco exports n8n fornecidos para esta sprint, preparados para revisão. Os exports estão inativos, sem dados de execução e sem vínculos de credenciais. É necessário vincular credenciais, configurar `CLOUDINARY_PROXY_KEY` e conferir os IDs de subfluxos antes de importar ou executar.
- `workflows/nodes/sha-256-featured-img.js`: código completo corrigido do node `SHA-256 Featured IMG`, pronto para colar no editor do n8n.
- `workflows/nodes/consolida-resultado-upload.js`: código do node `Consolida | Resultado Upload` com validação imediata do host Cloudinary antes de montar o lote.
- `tests/`: testes locais do node `Monta | Notificação Lote` e do contrato da procedure de erro. Execute com `node --test tests/*.test.js`.
- `workers/n8n-pel-proxy.js`: referência funcional compacta do Worker compartilhado; **não é a cópia literal do deployment original de 310 linhas**. Para restauração exata em produção, usar a versão anterior no histórico do Cloudflare. O histórico Git preserva o patch experimental de diagnóstico.
- `workers/n8n-pel-proxy-original-colado.js`: transcrição do código original que o usuário colou nesta conversa, com comentários e formatação. Como o texto enviado não contém as 310 linhas mencionadas, conferir o deployment anterior no Cloudflare antes de tratá-lo como cópia literal de produção.
- `sql/reference/`: nove procedures fornecidas como referência, sem `DEFINER` da instância de origem. Não são migrations prontas para aplicar.
- `docs/diagnostico.md`: mapa dos componentes, evidências, pendências e roteiro de validação controlada.
- `docs/banco.md`: tabelas e contratos das procedures usados pela migração.
- `docs/sprint.md`: objetivo, inventário dos insumos, ordem de trabalho e critérios de aceite da sprint.
- `docs/ocorrencia-pagina-73.md`: diagnóstico e ajuste seguro para o agendamento que parou com checkpoint `AGUARDANDO`.
- `docs/ocorrencia-pagina-74.md`: novo bloqueio com três de seis candidatos resolvidos e sem nova reserva; inclui as evidências e os dados necessários para identificar os pendentes.

Os arquivos versionados não representam o estado atual de produção. Nenhuma migração ou exclusão é executada pelos testes locais.

### Storage externo por mídia

A proposta multi-provider está em `workflows/sub-storage-media-external.json`, nos três exports `pel-featured-*.json` e em `sql/deploy/`. O subfluxo recebido foi saneado: configurar a chave do proxy como credencial gerenciada antes de importá-lo. Implantar o banco e os workflows em conjunto e validar o endpoint WordPress antes de retomar a página 74; consulte `docs/ocorrencia-pagina-74.md`.
