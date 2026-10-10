# CORE-02 — Cálculo da próxima data de revisão

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01

## Resumo

Implementar como função pura o cálculo da próxima data de revisão a partir de `dataCriacao`/`dataUltimaRevisao` & `quantidadeRevisoes`.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [x] `intervalo = min(7 × 2^quantidadeRevisoes, 365)` dias (0→7, 1→14, 2→28, 3→56, 4→112, 5→224, 6→365, 7+→365).
- [x] `base = dataCriacao` quando `quantidadeRevisoes = 0`; senão `dataUltimaRevisao`.
- [x] `dataProximaRevisao = base + intervalo`.
- [x] Datas tratadas como dias de calendário no fuso local (RB-07).
- [x] Testes cobrindo toda a tabela de intervalos, o teto & as duas bases.

## Entrega

Implementada como função pura `nextReviewDate(createdDate, lastReviewDate, reviewCount)` em `packages/core/src/review.ts`, reexportada por `@study/core`; `createCard` passou a usá-la como fonte única da RB-01 (RNF-09). Testes em `packages/core/test/review.test.ts` (+2 em `card.test.ts`, +1 em `index.test.ts`); CI verde (typecheck + lint + coverage 100%). PR: https://github.com/bosi-programming/study-app/pull/2

## Referências

- CDUs: CDU-02, CDU-03 · HUs: HU-03 · RN: RB-01, RB-07 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md), [RNF-12](../web/Requisitos%20não%20funcionais/RNF-12%20-%20Cobertura%20de%20testes.md)
