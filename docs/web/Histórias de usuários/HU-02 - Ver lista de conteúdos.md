# HU-02 — Ver lista de conteúdos

**Épico:** Gestão · **Prioridade:** Must · **Estimativa:** 3 SP

## História

Como usuário, quero ver a lista dos meus conteúdos ordenada pela próxima revisão, para saber no que focar primeiro.

## Valor de negócio

A lista é a tela principal; dá ao usuário a visão imediata da fila de revisões.

## Critérios de aceite

```gherkin
Cenário: Exibir lista ordenada
  Dado que existem cartões salvos
  Quando abro a lista
  Então os cartões aparecem em ordem ascendente de dataProximaRevisao
  E em caso de empate, em ordem ascendente de nome

Cenário: Exibir cabeçalho e ações por cartão
  Dado que vejo um cartão colapsado
  Então vejo próxima data de revisão, nome e categoria
  E vejo os ícones: marcar revisado, editar, excluir e expandir

Cenário: Lista sem cartões
  Dado que não há cartões cadastrados
  Quando abro a lista
  Então vejo a mensagem de que não há cartões

Cenário: Lista sem resultados para os filtros
  Dado que há filtros ativos
  Quando nenhum cartão corresponde
  Então vejo a mensagem de que não há cartões para aqueles filtros
```

## Regras de negócio
- `RB-03` (ordenação), `RB-05` (estados vazios).

## Requisitos não funcionais
- `RNF-01`, `RNF-04`, `RNF-05`, `RNF-06`, `RNF-08`, `RNF-10`.

## Caso de uso relacionado
- [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md)

## Definition of Done
- [ ] Leitura dos cartões do IndexedDB.
- [ ] Ordenação por próxima data & desempate por nome.
- [ ] Estados vazios (sem cartões / sem resultados filtrados).
- [ ] Icon buttons no cartão colapsado.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
