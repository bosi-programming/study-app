# HU-07 — Excluir conteúdo

**Épico:** Gestão · **Prioridade:** Should · **Estimativa:** 2 SP

## História

Como usuário, quero excluir um conteúdo, para remover o que não quero mais revisar.

## Valor de negócio

Mantém a lista enxuta & relevante, evitando ruído na fila de revisões.

## Critérios de aceite

```gherkin
Cenário: Excluir com confirmação
  Dado um cartão na lista
  Quando aciono o ícone "excluir"
  Então vejo um diálogo de confirmação
  Quando confirmo
  Então o cartão é removido do IndexedDB
  E a lista é atualizada

Cenário: Cancelar a exclusão
  Dado o diálogo de confirmação aberto
  Quando cancelo
  Então nenhum cartão é removido

Cenário: Última ocorrência de uma categoria
  Dado que excluo o único cartão de uma categoria
  Então essa categoria deixa de aparecer no filtro

Cenário: Falha ao remover
  Dado que a remoção falha
  Então vejo uma mensagem de erro
  E o cartão permanece na lista
```

## Regras de negócio
- `RB-04` (confirmação obrigatória).

## Requisitos não funcionais
- `RNF-01`, `RNF-06`, `RNF-08`, `RNF-13`.

## Caso de uso relacionado
- [CDU-06](../Casos%20de%20uso/CDU-06%20-%20Excluir%20conteúdo.md)

## Definition of Done
- [ ] Diálogo de confirmação.
- [ ] Remoção & atualização da lista.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
