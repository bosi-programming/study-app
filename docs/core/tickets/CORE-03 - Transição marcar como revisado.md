# CORE-03 — Transição "marcar como revisado"

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01, CORE-02

## Resumo

Função pura que, a partir de um cartão & de "hoje", produz o cartão revisado com a nova data recalculada.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [x] `marcarComoRevisado(cartao, hoje)` define `dataUltimaRevisao = hoje`.
- [x] Incrementa `quantidadeRevisoes` em 1.
- [x] Recalcula `dataProximaRevisao` via CORE-02 (respeitando o teto de 365).
- [x] Função imutável: retorna um novo `Cartao`, sem mutar a entrada.
- [x] Testes cobrindo 1ª revisão (→ +14) & revisões subsequentes.

## Entrega

- Implementada `markCardReviewed(card, today = todayLocal()): Card` em `packages/core/src/card.ts`, reexportada pelo barrel `@study/core` (`index.ts`).
- Recalcula `nextReviewDate` via CORE-02 (`nextReviewDate(createdDate, today, reviewCount + 1)`), com teto de 365; imutável (spread, entrada intocada).
- PR #8 — https://github.com/bosi-programming/study-app/pull/8 (base `core-08`, head `core-03`).
- Gates locais verdes: `pnpm test:coverage` 152 passed / 100% core; `pnpm typecheck` 0; `pnpm lint` 0.
- Registro completo: `recipes/core-03.md`.

## Referências

- CDUs: CDU-03 · HUs: HU-04 · RN: RB-01, RB-07 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md), [RNF-12](../web/Requisitos%20não%20funcionais/RNF-12%20-%20Cobertura%20de%20testes.md)
