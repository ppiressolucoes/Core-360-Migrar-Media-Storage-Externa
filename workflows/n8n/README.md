# Exports n8n

## `official/`

Contém os workflows que representam a linha oficial desta sprint. Antes de
substituir um arquivo, exporte o workflow salvo e publicado no n8n.

Consulte `official/STATUS.md`: o PAI, o Sub 02 e o subfluxo de upload possuem
evoluções aplicadas no ambiente que ainda aguardam novo export completo.

## `legacy/`

Contém versões anteriores mantidas para comparação. Não devem ser importadas em
produção sem uma revisão explícita.

Os Code nodes dos exports oficiais são espelhados em `../code/` para facilitar
diff, revisão e testes.
