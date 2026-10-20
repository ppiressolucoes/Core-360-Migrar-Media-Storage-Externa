# Backlog

Atualizado em 2026-10-20.

## P0 — Operação atual

### Confirmar exclusão da migration 498 e fechar a página 79

- **Estado:** em andamento.
- **Evidência:** DELETE da mídia original 6952 retornou `deleted: true`.
- **Pendência:** o GET posterior recebeu HTTP 429.
- **Próxima ação:** aguardar o backoff e repetir somente o GET de
  `/wp-json/wp/v2/media/6952`.
- **Aceite:** resposta `404` com `rest_post_invalid_id`, auditoria final
  confirmada, migrations 498/500/501 em `MIGRATED` e checkpoint na página 80.

## P1 — Confiabilidade

### Preflight permanente do storage canônico

- Inserir leitura dinâmica do banco antes de `SP | Registra Lote`.
- Reutilizar storage completo quando a migration já estiver em `PROCESSING`.
- Enviar ao SP um lote reconciliado, mantendo o bloqueio contra troca silenciosa
  de provider, URL ou asset.
- Remover qualquer dependência de IDs fixos usada na recuperação da página 79.

### Retry unificado de confirmação de exclusão

- Tratar `408`, `425`, `429`, `500`, `502`, `503`, `504` e `520–524` como
  estados transitórios.
- Respeitar `retry_after` da origem, com mínimo de 120 segundos para 429/504.
- Repetir somente o GET enquanto o resultado for inconclusivo.
- Limitar tentativas e persistir a pendência sem abortar itens independentes.

### Recuperação por item sem rollback do restante do lote

- Avaliar uma SP que classifique cada linha como `INSERIDA`, `REUTILIZADA` ou
  `CONFLITO`.
- Preservar atomicidade por migration e evitar que uma linha já persistida
  impeça o registro de migrations novas.

## P2 — Manutenção

### Limpeza de objetos não canônicos

- Registrar objetos criados durante tentativas que perderam a reconciliação.
- Remover o objeto R2 não canônico produzido para a migration 498 somente após
  a conclusão e auditoria do lote.
- Exigir comparação por SHA-256, provider, key e asset antes da exclusão.

### Sincronização dos workflows n8n

- Reexportar o PAI após implantar o preflight definitivo.
- Substituir no repositório os exports legados `Sub Fluxo` pelas versões
  oficiais `Sub 01` e `Sub 02`, ou marcá-los como arquivados.
- Adicionar verificação automatizada de JSON e compilação dos Code nodes.

## P3 — Observabilidade

- Persistir tentativa, HTTP status, `retry_after`, target e ray ID dos erros da
  origem.
- Criar relatório de migrations em `PROCESSING` acima do SLA.
- Alertar quando o checkpoint não avançar após todas as migrations da página
  estarem em estado terminal.
