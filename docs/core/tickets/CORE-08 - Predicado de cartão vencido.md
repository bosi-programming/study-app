# CORE-08 — Predicado de cartão vencido

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01, CORE-02

## Resumo

Predicado puro que indica se um cartão está atrasado, usado p/ o destaque visual na lista.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [x] `estaVencido(cartao, hoje)` é `true` quando `dataProximaRevisao < hoje`.
- [x] `dataProximaRevisao == hoje` **não** é vencido (RB-07).
- [x] Considera apenas o dia de calendário (ignora hora).
- [x] Testes cobrindo passado, hoje & futuro.

## Entrega

Implementada como predicado puro em `packages/core/src/overdue.ts`, reexportado por `@study/core` (RNF-09): `isOverdue(card: Card, today: CalendarDay): boolean` devolve `card.nextReviewDate < today` (comparação lexicográfica sobre `CalendarDay` ISO `YYYY-MM-DD` — lexicográfico == cronológico, precedente CORE-06/CORE-07); `today` explícito & obrigatório (sem default) p/ pureza/determinismo — quem chama fornece o dia local (RB-07); `== today` ⇒ `false` (borda RB-07/RB-11); `> today` ⇒ `false`. Dia-only por construção (`CalendarDay` é brand de string): comparar strings de dia ignora hora. Função não muta o cartão & é independente do relógio do sistema. Fora do escopo: destaque visual (`--color-error`), ordenação (RB-03 inalterada por RB-11) & render da lista (UI/CDU-02). *(Nomes de código em inglês, conforme AGENTS.md; `estaVencido` do ticket é pt-BR.)* Testes em `packages/core/test/overdue.test.ts` (+ barrel `index.test.ts`): 15 casos por AC (passado, hoje, futuro, dia-only, pureza/determinismo/não-mutação/independência do relógio, barrel); local gate verde (vitest 137 passed, coverage 100%, typecheck + lint). PR: https://github.com/bosi-programming/study-app/pull/7

## Referências

- CDUs: CDU-02 · HUs: HU-02 · RN: RB-11, RB-07 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
