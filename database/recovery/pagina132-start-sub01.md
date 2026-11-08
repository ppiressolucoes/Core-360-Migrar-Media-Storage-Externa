# Start do Sub 01 para a página 132

Este arquivo é um **rascunho estrutural**, gerado em 2026-11-08 para as
migrations 798–800. Ele preserva os IDs reservados e o contexto da página, mas
os campos `original_url`, `sha256`, storage, MIME e dimensões estão `null`
porque a execução interrompida não chegou ao upload/preflight.

Não enviar este JSON ao Sub 01 enquanto esses campos estiverem nulos. Produzir
primeiro os dados canônicos pelo caminho de download/upload do PAI ou por um
preflight equivalente. O Sub 01 exige, no mínimo, URL original, SHA-256,
provider, key, URL, asset, MIME, largura e altura; não preencher por suposição.

Depois de preencher os três objetos com dados validados, usar o array como
entrada de `Start WP` e manter `pagina_processada=132`, `ultimo_post_pagina=11402`
e a mesma lista de três candidatos. O fechamento só deve ser executado depois
de as três migrations chegarem a estado terminal.
