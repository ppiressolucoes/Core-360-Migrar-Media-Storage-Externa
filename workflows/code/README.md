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

As evoluções de confirmação, retry e barreira de conclusão foram incorporadas
ao export oficial do Sub 02 de 2026-10-21. As versões canônicas estão em
`featured-exclusao-sub02/`.

Não edite simultaneamente o JSON e sua cópia extraída sem revalidar a
correspondência com `tools/validate_artifacts.py`.
