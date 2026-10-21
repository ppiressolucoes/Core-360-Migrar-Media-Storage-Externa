# Estado dos exports oficiais

Os arquivos deste diretório são os últimos exports completos disponíveis. Eles
preservam a linha oficial da sprint, mas há alterações feitas diretamente no n8n
que ainda exigem um novo export.

| Export | Estado | Divergência conhecida |
| --- | --- | --- |
| `PEL _ Migração Featured IMG _ PAI.json` | Reexportar | Ainda contém nomes Cloudinary no registro/recuperação do lote e não inclui o preflight canônico definitivo. |
| `PEL _ Featured Associação WP _ Sub 01 Fluxo.json` | Revisar versão publicada | Contém o contrato genérico usado na associação; confirmar o version ID após o fechamento do lote. |
| `PEL _ Featured Exclusão e Auditoria _ Sub 02.json` | Atualizado em 2026-10-21 | Export ativo `versionId=cb3f928c-c56f-4b69-a1e9-aca611674de4`, com Switch de retry, barreira de auditoria, fechamento do checkpoint e notificação. |
| `SUB _ Midia Externa Cloudinary.json` | Reexportar | O nome e parte do contrato ainda representam a fase somente Cloudinary. |
| `CORE _ Cloudinary Gestão de Contas.json` | Sem divergência registrada | Continua específico da gestão de contas Cloudinary. |

Até os novos exports serem capturados, use estes JSONs junto com os Code nodes,
procedures, changelog e runbooks desta sprint. Não trate o import isolado do PAI
ou Sub 02 como reprodução integral do ambiente ativo.
