# CORE-06 — Ordenação da lista

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01

## Resumo

Função pura de ordenação dos cartões para exibição na lista.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [x] Ordem ascendente por `dataProximaRevisao`.
- [x] Empate resolvido por `nome` ascendente (ordem alfabética pt-BR).
- [x] Função não muta a coleção de entrada.
- [x] Testes cobrindo ordenação & desempate.

## Entrega

Implementada como função pura em `packages/core/src/order.ts`, reexportada por `@study/core` (RNF-09): `sortCards(cards)` devolve um array **novo** com os cartões ascendentes por `dataProximaRevisao` (`Card.nextReviewDate`) & desempate por `nome` ascendente em pt-BR (`localeCompare(other, 'pt-BR')`, RB-03); não muta a entrada (`[...cards].sort(...)`); empate em data & nome preserva a ordem estável do input (sort estável ES2019+); lista vazia ⇒ `[]`. Comparação de data crua lexicográfica (`CalendarDay` é ISO `YYYY-MM-DD`, logo lexicográfico == cronológico — sem `Date`). *(Nomes de código em inglês, conforme AGENTS.md — o `dataProximaRevisao` do critério é o `nextReviewDate`.)* Testes em `packages/core/test/order.test.ts` (+ barrel): ordenação ascendente, desempate por nome com acentos pt-BR, não-mutação, bordas vazio/unitário/estabilidade; local gate verde (typecheck + lint + coverage 100%). PR: https://github.com/bosi-programming/study-app/pull/5

## Referências

- CDUs: CDU-02, CDU-03, CDU-07, CDU-08 · HUs: HU-02 · RN: RB-03 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md), [RNF-10](../web/Requisitos%20não%20funcionais/RNF-10%20-%20Desempenho.md)
