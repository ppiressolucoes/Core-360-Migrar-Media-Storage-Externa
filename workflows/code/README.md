# Code nodes por fluxo

Os arquivos JavaScript deste diretório são extraídos dos workflows em
`workflows/n8n/official/`.

| Diretório | Workflow de origem |
| --- | --- |
| `featured-pai/` | PEL Migração Featured IMG PAI |
| `featured-associacao-sub01/` | PEL Featured Associação WP Sub 01 |
| `featured-exclusao-sub02/` | PEL Featured Exclusão e Auditoria Sub 02 |
| `storage-upload/` | Subfluxo de upload para storage externo |
| `core-cloudinary-contas/` | Gestão de contas Cloudinary |

O arquivo `valida-exclusao-confirmada.js` na raiz registra a evolução aplicada
durante a retomada do lote e ainda precisa ser incorporado a um novo export do
Sub 02.

O arquivo `valida-exclusao-confirmada-retry.js` registra a evolução do retry:
`HTTP 200` produz `REPETIR_DELETE`, enquanto 429/504 produzem `REPETIR_GET`.

O arquivo `monta-lote-conclusao-auditado.js` adiciona a barreira anterior à SP
de conclusão: todos os itens precisam ter auditoria `404/rest_post_invalid_id`.

Não edite simultaneamente o JSON e sua cópia extraída sem revalidar a
correspondência com `tools/validate_artifacts.py`.
