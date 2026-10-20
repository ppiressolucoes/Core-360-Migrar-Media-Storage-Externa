# Base da sprint: Core Media Store Externa (PEL)

**Atualização em 20/10/2026:** as migrations 479–484 também foram concluídas, e o checkpoint avançou para a página 77. Consulte [fechamento da página 76](fechamento-pagina-76.md). Os registros abaixo preservam o contexto inicial da sprint.

## Objetivo

Centralizar a manutenção e a evolução da migração de imagens Featured do portal Energia Limpa para armazenamento externo. Suportar qualquer provider escolhido pela reserva do storage ativo, preservando sua identidade e URL por mídia. A sprint começa pela estabilidade da associação, exclusão auditada, conclusão no banco, checkpoint e notificação do lote. Não inclui MIRROR ou replicação obrigatória.

## Fontes versionadas

| Material | Local | Tratamento |
| --- | --- | --- |
| Exports n8n fornecidos para a sprint | `workflows/` | Inativos, sem `pinData`, IDs de credenciais ou metadados de instância. O cabeçalho estático do proxy Cloudinary foi substituído por referência a variável de ambiente. IDs de subfluxos devem ser conferidos no destino. O export de upload recebeu a definição ausente de `items` no node SHA-256. |
| Nove procedures fornecidas | `sql/reference/` | Texto de referência, com `DEFINER` da origem removido. Não são migrations implantadas ou validadas contra o banco atual. |
| Esquema das tabelas informado | `docs/banco.md` | Transcrição resumida dos campos e contratos necessários. Índices adicionais não foram fornecidos. |
| Diagnóstico e testes locais | `docs/diagnostico.md`, `tests/` | Correções propostas nos exports e verificações executáveis com Node.js. Não representam homologação no n8n. |

Os anexos originais não devem ser publicados: contêm dados de execução, vínculos de credenciais e um valor estático de cabeçalho. Os arquivos em `workflows/` são cópias preparadas para revisão; importar requer religar as credenciais e confirmar as referências a outros workflows.

## Estado da evidência

- O export da procedure de conclusão define um `SELECT` final com `migration_id`, `post_id`, IDs das mídias, `cloudinary_url`, `status` e `migrated_at`. Ainda falta observar o wrapper desses resultsets no n8n real.
- O `pinData` recebido de `SP | Fecha Checkpoint` mostrava um resultado funcional `AVANCADO` e um item separado de metadados MySQL. Esse dado foi usado para testar o parser sem publicar o `pinData`.
- O export recebido já referencia `Chamar | Exclusão e Auditoria` no node de notificação. O erro histórico de node inexistente pertence a uma versão anterior ou a uma execução não incluída nos anexos.
- O caminho de falha do registro de mídia virtual chamava `SP_WP_registra_erro_associacao` com um JSON único. O contrato SQL exige cinco escalares; a chamada foi corrigida no export versionado.
- Não foram fornecidos código do plugin WordPress, Workers, procedures Core Storage nem logs de execução completos; o export `SUB | Storage Media External` foi recebido em 19/10/2026. As afirmações sobre esses componentes precisam de validação na origem. O subfluxo Cloudinary foi fornecido depois; usa `public_id` derivado do SHA-256 e `overwrite=false`, sem consulta prévia do asset.

## Ordem de trabalho

1. **Fechar o caminho Featured atual.** Comparar os outputs reais de `SP | Conclui Migração Lote`, `Chamar | Exclusão e Auditoria` e `SP | Fecha Checkpoint` com o parser. Confirmar que as procedures implantadas correspondem às referências. Revisar os IDs de subfluxos e as credenciais no n8n de homologação.
2. **Homologar um lote controlado.** Registrar os candidatos e a execução. Exigir associação WordPress válida, exclusão auditada, migrations `MIGRATED`, checkpoint `AVANCADO` e uma notificação Gmail confirmada. Conferir que não houve repetição de exclusão ou avanço. Quando o checkpoint já estiver avançado, recuperar apenas a notificação após verificar se ela já foi enviada.
3. **Proteger o controle de banco.** Verificar a chave única de `(post_id, wp_media_id)` usada pela reserva e impedir avanço de checkpoint com lista vazia de candidatos. Tratar alterações SQL como mudanças próprias, com teste em homologação antes de aplicar.
4. **Levantar as integrações ausentes.** Inspecionar plugin WordPress, dashboard M360, Worker Cloudinary, Worker R2 e Core Storage antes de definir mudanças nos contratos públicos.
5. **Evoluir providers e contas.** Especificar Storage Provider Registry e gestão/rotação Cloudinary a partir dos contratos existentes. Testar o caminho R2 com SHA-256, MIME e dimensões reais, associação WordPress, frontend, metadados sociais e deduplicação. Executar regressão Cloudinary antes de ampliar o piloto.

## Critério de aceite imediato

Um lote autorizado chega a `MIGRATED` para cada item migrado; itens já externos ficam `SKIPPED` quando aplicável; o checkpoint corresponde aos candidatos resolvidos; e o e-mail é enviado exatamente uma vez com IDs e links corretos. A execução e a conferência devem ser registradas sem repetir operações destrutivas de um lote já fechado.

## Verificação local

```sh
node --test tests/*.test.js
```

Esses testes exercitam a montagem da notificação e a assinatura da procedure de erro. A execução do lote, WordPress, banco, Workers e Gmail dependem do ambiente de homologação e não foram verificados neste repositório.

## Storage externo por item (19/10/2026)

A reserva de `SUB | Storage Media External` escolhe o provider ativo para cada mídia; hoje o router fornecido tem caminhos para `cloudinary`, `cloudflare_r2` e `backblaze_b2`. O PAI aceita o identificador retornado, sem lista fixa de providers ou domínios. O lote da página 74 confirmou a necessidade de persistir o provider por migration. Os exports e scripts em `sql/deploy/` implementam esse contrato como proposta de implantação conjunta; consultar [ocorrência da página 74](ocorrencia-pagina-74.md) antes de retomar a agenda.
