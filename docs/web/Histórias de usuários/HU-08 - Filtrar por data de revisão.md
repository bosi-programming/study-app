# HU-08 — Filtrar por data de revisão

**Épico:** Organização · **Prioridade:** Should · **Estimativa:** 3 SP

## História

Como usuário, quero filtrar conteúdos por data de revisão, para ver só o que preciso revisar num período.

## Valor de negócio

Deixa o usuário focar num horizonte (ex.: próximos 7 dias) em vez de olhar a lista inteira.

## Critérios de aceite

```gherkin
Cenário: Filtrar por intervalo
  Dado a lista exibida
  Quando informo um intervalo no filtro de data de revisão
  Então vejo apenas cartões com dataProximaRevisao dentro do intervalo

Cenário: Combinar com filtro de categoria
  Dado que tenho um filtro de data ativo
  Quando também aplico um filtro de categoria
  Então os dois filtros são aplicados em conjunto
  E a lista mantém a ordenação de RB-03

Cenário: Limpar o filtro
  Dado um filtro de data ativo
  Quando limpo o filtro
  Então a lista volta a exibir todos os cartões

Cenário: Sem resultados
  Dado um filtro de data ativo
  Quando nenhum cartão corresponde
  Então vejo a mensagem de que não há cartões para aqueles filtros

Cenário: Intervalo inválido
  Dado que informo início maior que fim
  Então o sistema ignora ou sinaliza o intervalo inválido
```

## Regras de negócio
- `RB-03` (ordenação), `RB-05` (estado vazio).

## Requisitos não funcionais
- `RNF-04`, `RNF-05`, `RNF-07`.

## Caso de uso relacionado
- [CDU-07](../Casos%20de%20uso/CDU-07%20-%20Filtrar%20por%20data%20de%20revisão.md)

## Definition of Done
- [ ] Campo `reviewDateFilter` filtrando por `dataProximaRevisao`.
- [ ] Combinação com o filtro de categoria.
- [ ] Estado vazio.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
