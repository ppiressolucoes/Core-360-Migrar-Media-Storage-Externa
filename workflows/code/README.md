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

Não edite simultaneamente o JSON e sua cópia extraída sem revalidar a
correspondência com `tools/validate_artifacts.py`.
