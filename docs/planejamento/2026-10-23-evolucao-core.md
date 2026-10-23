# Planejamento da evolução do Core — 2026-10-23

## Alinhamento e fonte

O repositório remoto deste chat é o registro permanente dos avanços,
alinhamentos, ações e aprendizados do Core. Publicar nele as próximas decisões,
evidências de validação e mudanças de estado. `BACKLOG.md` é a fonte das
pendências priorizadas; este documento registra a sequência proposta para
executá-las. A proposta ainda não representa implantação no ambiente ativo.

## Estado conhecido na revisão

- A branch `main` estava no commit `8710cea` e foi recuperada para o checkout
  local por avanço linear, sem alterações locais anteriores.
- O P0 da página 79 está documentado como concluído no backlog.
- `docs/STATUS.md`, atualizado em 2026-10-21, registra o checkpoint `FEATURED`
  na página 82, último post 7185, com seis candidatos resolvidos de seis.
  Esse é o último estado documentado, não uma leitura atual do banco ou n8n.
- `python3 tools/validate_artifacts.py` passou, conferindo cinco workflows
  oficiais, 41 Code nodes e nove procedures. É uma validação de artefatos, não
  um teste de integração ou da operação em produção.
- A versão pública de `BACKLOG.md` na `main` foi comparada ao arquivo local e
  tinha conteúdo idêntico. A página pública de issues não mostrou issues
  abertas ou fechadas. O acesso deste ambiente à API do GitHub retornou
  `Forbidden`; isso não indica que o repositório seja privado.

## Sequência proposta

| Etapa | Trabalho | Critério para avançar |
| --- | --- | --- |
| 0. Conferir base ativa | Ler o checkpoint e migrations pendentes no banco; obter IDs/versões dos workflows publicados no n8n; comparar `SHOW CREATE PROCEDURE` com `database/procedures/`. | Divergências registradas antes de alterar workflows ou procedures. |
| 1. Preflight canônico (P1) | Consultar o storage persistido antes de `SP | Registra Lote`; reconciliar o lote e remover IDs fixos da recuperação da página 79. | Uma migration em `PROCESSING` reutiliza provider, URL, asset e demais dados canônicos; conflitos explícitos bloqueiam a troca silenciosa; itens novos seguem normalmente. |
| 2. Retry de exclusão (P1) | Unificar os contratos dos validadores, aplicar `retry_after` e limites de tentativas, tratar os HTTP transitórios do backlog. | GET inconclusivo não conclui exclusão; HTTP 200 exige novo DELETE; `404/rest_post_invalid_id` confirma exclusão; um item pendente não interrompe os independentes. |
| 3. Recuperação por item (P1) | Definir e testar uma SP que classifique `INSERIDA`, `REUTILIZADA` ou `CONFLITO` por migration. | Uma linha existente não causa rollback de migrations novas; cada migration mantém atomicidade e conflitos são reportados. |
| 4. Sincronizar artefatos (P2) | Reexportar o PAI depois do preflight, Sub 02 depois do retry e os demais fluxos alterados; comparar versões e procedures com o ambiente ativo. | Exports, Code nodes e procedures correspondem às versões publicadas e passam pelo validador do repositório. |
| 5. Limpar órfãos (P2) | Inventariar objetos não canônicos e auditar o objeto R2 associado à migration 498. | Nenhuma exclusão antes de confirmar o lote concluído e comparar SHA-256, provider, key e asset do objeto candidato com o registro canônico, comprovando que o alvo da exclusão não é o objeto canônico. |
| 6. Observabilidade (P3) | Persistir dados de tentativa/erro e criar relatório de `PROCESSING` acima do SLA e alerta de checkpoint parado. | É possível identificar item, tentativa, HTTP status, `retry_after`, target e ray ID, e localizar lotes sem avanço. |

## Dependências e cuidados

- As etapas 1 a 3 exigem dados representativos de banco e resultados da origem
  para validar retomada, conflitos e rate limit. A etapa 0 confirma o estado
  atual antes de qualquer implantação.
- O export do PAI ainda não contém o preflight definitivo; o Sub 01 precisa de
  confirmação da versão publicada; o Sub 02 está exportado na versão
  `cb3f928c-c56f-4b69-a1e9-aca611674de4` conforme
  `workflows/n8n/official/STATUS.md`.
- A sincronização da etapa 4 acompanha cada implantação correspondente; não
  usar um export isolado como reprodução integral do ambiente ativo.
- Registrar neste repositório o resultado de cada etapa, incluindo falhas e
  decisões, e atualizar `BACKLOG.md`, `docs/STATUS.md` e `CHANGELOG.md` quando o
  estado de pendências, operação ou implementação mudar.
