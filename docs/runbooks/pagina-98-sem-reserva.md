# Página 98: desbloqueio concluído por exceção administrativa

## Diagnóstico recebido em 2026-10-27

`SP | Fecha Checkpoint` retornou `AGUARDANDO`, 3/6 candidatos resolvidos,
`pagina_atual=98` e `ultimo_post_id=8782`. A captura do PAI mostrou o ramo
falso de `IF RESERVA`. `Monta | Candidatos [3]` forneceu:

| Post | Mídia atual |
| ---: | ---: |
| 8827 | 90399 |
| 8834 | 90400 |
| 8846 | 90401 |
| 8860 | 90402 |
| 8874 | 90403 |
| 8889 | 90404 |

O checkpoint lido no banco estava na página 98, `per_page=6`,
`limite_execucao=3`, último post 8782 e `updated_at=2026-10-26 08:11:49`.
A leitura das seis migrations foi:

| Migration | Post | Original | Virtual | Estado antes da exceção | Provider |
| ---: | ---: | ---: | ---: | --- | --- |
| 613 | 8827 | 8829 | 90399 | `PROCESSING` | `cloudflare_r2` |
| 614 | 8834 | 8840 | 90400 | `PROCESSING` | `cloudinary` |
| 615 | 8846 | 8858 | 90401 | `PROCESSING` | `cloudflare_r2` |
| 616 | 8860 | 8869 | 90402 | `MIGRATED` | `cloudinary` |
| 617 | 8874 | 8878 | 90403 | `MIGRATED` | `cloudinary` |
| 618 | 8889 | 8895 | 90404 | `MIGRATED` | `cloudinary` |

Os seis IDs de mídia atuais correspondiam a mídias virtuais registradas.
A reserva exclui esses pares. O fechamento considerava resolvidas somente
616–618. A presença de `storage_url` nas três migrations em `PROCESSING` não
comprova a associação no WordPress nem a exclusão da mídia original.

## Decisão e execução

O operador decidiu priorizar o avanço global e tratar as originais 8829, 8840
e 8858 como residuais não verificadas. A autorização foi específica para
613–615. A definição da procedure com travas de checkpoint, IDs, estados,
provider, URL e `updated_at` está em
[`pagina98-cria-sp.sql`](../../database/recovery/pagina98-cria-sp.sql). Ela foi
executada no banco ativo em etapas separadas: criação, `CALL` e remoção da
procedure. O `CALL` retornou as três migrations em `SKIPPED`, com
`EXCECAO_P98_ORIGEM_NAO_VERIFICADA; auditoria posterior pendente;` e
`updated_at=2026-10-27 14:36:10`. O operador confirmou o `DROP PROCEDURE`.

Depois da exceção, o PAI foi iniciado e `SP | Fecha Checkpoint` retornou
`AVANCADO`, 6/6 candidatos resolvidos, página 99, último post 8889 e
`updated_at=2026-10-27 14:43:24`. Não foi enviada uma leitura SQL separada do
checkpoint. A procedure pontual não alterou o checkpoint diretamente.

## Residual e aprendizado

- Verificar posteriormente as mídias originais 8829, 8840 e 8858 no WordPress;
  registrar presença ou ausência e só decidir eventual limpeza após auditoria
  da associação e do storage canônico. `SKIPPED` não é evidência de exclusão.
- O PAI pode encerrar pelo ramo sem reserva mesmo quando o fechamento retorna
  `AGUARDANDO`. Registrar e sinalizar essa situação, distinguindo uma página
  parcial normal de uma página bloqueada sem candidatos elegíveis.
- Para novas ocorrências, usar o [plano de fluxo de recuperação](../planejamento/2026-10-27-recuperacao-lotes.md).
  Não reutilizar a procedure da página 98 nem marcar novas migrations como
  `SKIPPED` sem decisão explícita e verificações específicas do lote.
