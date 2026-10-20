# Estado operacional

Última atualização: 2026-10-20.

## Checkpoint conhecido

- Processo: `FEATURED`.
- Página confirmada antes do lote atual: `79`.
- Último post confirmado antes do lote atual: `6925`.
- Página em processamento: `79`.
- Último post da página em processamento: `6981`.

## Lote da página 79

| Migration | Post | Mídia original | Storage canônico | Estado observado |
| ---: | ---: | ---: | --- | --- |
| 498 | 6951 | 6952 | Cloudinary | DELETE confirmado pela resposta; GET posterior pendente por 429. |
| 500 | 6963 | 6966 | Cloudflare R2 | Storage registrado; seguir evidência final do Sub 02. |
| 501 | 6970 | 6974 | Cloudflare R2 | Storage registrado; seguir evidência final do Sub 02. |

## Condição para avançar

O checkpoint só pode avançar para a página 80 depois de:

1. confirmar a ausência da mídia 6952 por `404/rest_post_invalid_id`;
2. concluir a auditoria final das migrations 498, 500 e 501;
3. executar `SP | Conclui Migração Lote`;
4. executar `SP | Fecha Checkpoint` com seis candidatos resolvidos.

Até essa confirmação, não reexecutar `SP | Registra Lote` nem o Sub 01.
