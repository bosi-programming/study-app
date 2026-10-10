# RB-04 — Confirmação de exclusão

**Categoria:** UI

## Regra

- Excluir um cartão exige **confirmação** antes de remover.

## Contexto

A exclusão é irreversível & local (sem backend/lixeira); a confirmação evita perda acidental.

## Exemplos

- Acionar o ícone "excluir" abre um diálogo; só após confirmar o cartão é removido.

## Exceções / bordas

- Cancelar o diálogo não altera os dados.
- Falha ao remover mantém o cartão & exibe erro.

## CDUs & HUs relacionados

- CDUs: [CDU-06](../Casos%20de%20uso/CDU-06%20-%20Excluir%20conteúdo.md)
- HUs: [HU-07](../Histórias%20de%20usuários/HU-07%20-%20Excluir%20conteúdo.md)

## Racional

Operação destrutiva sem undo exige confirmação explícita.
