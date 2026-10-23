# Backlog

Atualizado em 2026-10-23.

Sequência proposta para a próxima evolução e evidências da revisão de
2026-10-23: [plano de execução](docs/planejamento/2026-10-23-evolucao-core.md).

## P0 — Operação concluída

### Confirmar exclusão da migration 498 e fechar a página 79

- **Estado:** concluído.
- **Evidência:** migrations 498/500/501 concluídas e o checkpoint avançou nas
  execuções posteriores até a página 82, último post 7185.

## P0 — Recuperação em diagnóstico

### Página 87: reserva sem candidatos elegíveis

- **Estado:** fechamento bloqueado (`AGUARDANDO`) em 2026-10-23; três dos seis
  candidatos permanecem sem resolução confirmada. Identidades e etapas desses
  três itens ainda não foram informadas.
- **Evidência recebida:** `Normaliza | Lote Reservado` retornou
  `SEM_CANDIDATOS_ELEGIVEIS`, `total_reservado=0`, `total_candidatos=6`,
  `pagina_processada=87` e `ultimo_post_pagina=7740`.
- **Fechamento recebido:** `SP | Fecha Checkpoint` retornou `AGUARDANDO`,
  `total_resolvidos=3`, `pagina_atual=87` e `ultimo_post_id=7684`.
- **Próximo passo:** classificar os seis pares de post/mídia, conferir o
  checkpoint atual e o resultado de `SP | Fecha Checkpoint`. Retomar somente os
  itens pendentes ou fechar a página se todos estiverem resolvidos.
- **Procedimento:** [diagnóstico e recuperação da página 87](docs/runbooks/pagina-87-sem-reserva.md).

## P1 — Confiabilidade

### Não encerrar silenciosamente sem reserva e com fechamento pendente

- Após `SP | Fecha Checkpoint`, tratar `AGUARDANDO` como pendência explícita,
  com identificação das migrations não resolvidas e sinalização operacional.
- Distinguir uma página integralmente resolvida de uma página bloqueada em
  `PROCESSING` ou por divergência entre elegibilidade e resposta da SP.
- Validar a alteração contra a versão ativa do PAI antes de reexportar, pois o
  snapshot atual possui divergências conhecidas.

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
- Limitar tentativas para impedir ciclos indefinidos entre GET e DELETE.
- Unificar o primeiro validador e o validador de retry no mesmo contrato de
  ações, reduzindo caminhos duplicados.

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
- O Sub 02 foi reexportado em 2026-10-21; repetir a captura após futuras
  mudanças no retry ou na auditoria.
- Confirmar que os IDs e versões dos exports oficiais correspondem aos workflows
  publicados no n8n após o fechamento da página 79.
- Capturar `SHOW CREATE PROCEDURE` das SPs genéricas do ambiente ativo e comparar
  com `database/procedures/` antes da próxima implantação.

## P3 — Observabilidade

- Persistir tentativa, HTTP status, `retry_after`, target e ray ID dos erros da
  origem.
- Criar relatório de migrations em `PROCESSING` acima do SLA.
- Alertar quando o checkpoint não avançar após todas as migrations da página
  estarem em estado terminal.
