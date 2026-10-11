# CORE-07 — Filtros (data inclusivo + categoria)

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01, CORE-05

## Resumo

Funções puras de filtragem dos cartões por intervalo de data de revisão & por categoria, combináveis.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [x] `filtrarPorData(cartoes, { inicio?, fim? })` seleciona `dataProximaRevisao` no intervalo **inclusivo** `[inicio, fim]`.
- [x] Aceita só `inicio`, só `fim` || ambos.
- [x] `filtrarPorCategoria(cartoes, categoria)` compara **case-insensitive** (RB-08).
- [x] Os filtros são combináveis em conjunção (E).
- [x] Testes cobrindo bordas do intervalo (pontas inclusas) & a combinação.

## Entrega

Implementada como funções puras em `packages/core/src/filter.ts`, reexportadas por `@study/core` (RNF-09): `filterByDateRange(cards, { start?, end? })` mantém cartões com `nextReviewDate` no intervalo **inclusivo** `[start, end]` (comparação lexicográfica sobre `CalendarDay` ISO `YYYY-MM-DD` — lexicográfico == cronológico, precedente CORE-06; borda ausente = aberta; ambas ausentes ⇒ array novo com todos os cartões; `start > end` ⇒ `[]`); `filterByCategory(cards, category)` mantém cartões em que `categoryKey(card.category) == categoryKey(category)` (reusa CORE-05: trim + lowercase, case-insensitive; arg vazio/após-trim vazio ⇒ `[]` sem branch especial). Combinação em conjunção por composição encadeada (`filterByCategory(filterByDateRange(...), cat)`), sem função dedicada. Funções não mutam a entrada, devolvem array **novo** & preservam a ordem de entrada (reordenação é de `sortCards`, CORE-06). *(Nomes de código em inglês, conforme AGENTS.md.)* Testes em `packages/core/test/filter.test.ts` (+ barrel `index.test.ts`): 8 casos de AC (intervalo inclusivo, bordas abertas, categoria case-insensitive, conjunção, pureza/ordem, intervalo inválido & dia único, lista vazia, barrel); local gate verde (typecheck + lint + coverage 100%). PR: https://github.com/bosi-programming/study-app/pull/6

## Referências

- CDUs: CDU-07, CDU-08 · HUs: HU-08, HU-09 · RN: RB-09, RB-02 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
