# Fechamento da página 75 — 20/10/2026

Registro dos resultados enviados pelo operador do n8n e MySQL. Não houve acesso direto deste repositório ao ambiente de produção.

## Resultado observado

| Migration | Post | Original | Virtual | Provider | Estado |
| ---: | ---: | ---: | ---: | --- | --- |
| 473 | 6644 | 6645 | 89376 | `cloudflare_r2` | `MIGRATED` |
| 474 | 6646 | 6667 | 89377 | `cloudflare_r2` | `MIGRATED` |
| 475 | 6691 | 6695 | 89378 | `cloudinary` | `MIGRATED` |
| 476 | 6697 | 6699 | 89383 | `backblaze_b2` | `MIGRATED` |
| 477 | 6705 | 6711 | 89384 | `cloudflare_r2` | `MIGRATED` |
| 478 | 6714 | 6722 | 89385 | `cloudflare_r2` | `MIGRATED` |

O fechamento do checkpoint retornou `AVANCADO`, `total_candidatos=6`, `total_resolvidos=6`, `pagina_atual=76` e `ultimo_post_id=6714`. O estado anterior da página 74 foi 469 `SKIPPED`, 470 e 471 `MIGRATED`.

## Correções incorporadas

1. O PAI lê `storage_provider`, `storage_key`, `storage_url` e `storage_asset_id` persistidos após `SP | Registra Lote`. `Recupera | Lote Repositório` compara cada linha com o upload antes de enviar o lote ao subfluxo WP. Isso impede que dados pinados antigos de outro provider sejam usados na associação.
2. Registro da mídia virtual e retry enviam o contrato `storage_*` da iteração atual. `Normaliza | Mídia Virtual Criada` confere identidade, URL, asset ID e dimensões com a resposta do WordPress.
3. `GET | Metadados Mídia Original` consulta o ID original em contexto público, evitando o 401 de `context=edit`. O título, descrição e legenda aceitam os campos `rendered`.
4. A associação recupera todas as iterações confirmadas, combina por `migration_id` com a entrada de `Start WP` e conserva provider e URL canônicos. O slug `backblaze_b2` é aceito.
5. A exclusão do original só é liberada após confirmação da associação, conferência de `featured_media` e comparação da URL pública da mídia virtual com a URL canônica. Cloudinary aceita a variante responsiva `c_limit,w_N` do mesmo objeto; os outros providers exigem igualdade exata.
6. Contrato de exclusão, auditoria final e lote de conclusão transportam `storage_provider` e `storage_url`. As procedures `03_SP_WP_registra_associacao_lote.sql` e `04_SP_WP_conclui_migracao_featured_lote.sql` foram aplicadas pelo operador e as respostas da página 75 confirmam associação e conclusão dos seis itens.

Os erros que motivaram a retomada foram: URL de download começando com `=`, lote pinado com Cloudinary enquanto o banco guardava R2, registro WP com campos Cloudinary nulos para R2, procedure de erro chamada com um JSON em vez de cinco parâmetros e validação de exclusão restrita a Cloudinary. Os artefatos de recuperação em `workflows/recovery/` são históricos; a página 75 já foi concluída.

## Próximo lote

O ponteiro observado está na página 76. Antes de iniciar a agenda, importar os três exports atualizados, conferir credenciais e referências aos subfluxos, remover pins de execução e confirmar que `DB | Recupera Storage Canônico` usa o mesmo banco de `SP | Registra Lote`. Não reenviar as migrations 473–478 já concluídas.
