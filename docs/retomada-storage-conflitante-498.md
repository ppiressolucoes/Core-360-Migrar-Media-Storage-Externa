# Página 79: storage conflitante na migration 498

Na nova execução do PAI, `SP | Registra Lote` recebeu 498, 500 e 501 em uma única transação. A consulta posterior mostrou:

- 498 em `PROCESSING`, com SHA e storage Cloudinary já registrados;
- 500 e 501 em `PROCESSING`, com campos de storage nulos;
- o lote novo tentou registrar 498 em Cloudflare R2 e 500–501 em R2.

A procedure bloqueou corretamente a troca do storage canônico da 498 e fez rollback do lote inteiro. O novo objeto R2 da 498 não substitui o Cloudinary já persistido.

## Retomada da execução atual

No node `SP | Registra Lote`, manter a query:

```sql
CALL SP_WP_registra_storage_lote($1);
```

Usar temporariamente em **Query Parameters**:

```javascript
={{ [JSON.stringify(
  $json.uploads.filter(item => [500, 501].includes(Number(item.migration_id)))
)] }}
```

Executar somente esse node e esperar `total_recebidos=2`, `total_atualizados=2`, `etapa=STORAGE_REGISTRADO`. Depois conferir 498, 500 e 501 no banco. A 498 deve permanecer Cloudinary; 500–501 devem aparecer em R2.

Antes de associar a 498, validar por GET que sua `storage_url` Cloudinary canônica responde e corresponde ao SHA esperado. Não usar a URL R2 desta tentativa para 498. Não apagar agora o objeto R2 não canônico: registrar a ocorrência para limpeza posterior, depois da página concluída.

O node seguinte `DB | Recupera Storage Canônico` continua consultando os três IDs a partir de `Monta | Lote Uploads`. Substituir temporariamente o código completo de `Recupera | Lote Repositório` por `workflows/recovery/pagina79-recupera-lote-repositorio.js`. Esse código exige igualdade de migration, post, mídia original e SHA, mas usa provider, chave, URL e asset ID persistidos no banco. Ele marca a divergência da 498 para auditoria e entrega os três itens ao Sub 01 com o storage correto.

Após a recuperação, restaurar o Query Parameters original de `SP | Registra Lote`:

```javascript
={{ [JSON.stringify($json.uploads)] }}
```

Não executar novamente o upload nem alterar manualmente o storage da 498. A correção permanente deve separar itens com storage canônico completo antes do upload; esta retomada é restrita à execução atual.
