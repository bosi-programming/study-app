# Study Core — Visão geral

`@study/core` (`packages/core`) concentra as **regras de negócio** & o **código compartilhável** entre os apps (web, CLI, Desktop), conforme RNF-09.

## Objetivo

- Modelar o Cartão & implementar as regras de agendamento, validação, categorias, ordenação & filtros como funções puras.
- Ser consumido pelos apps; nenhum app reimplementa essas regras.

## Escopo

- Tipos & modelo do Cartão.
- Cálculo da próxima data de revisão (RB-01, RB-07).
- Transição "marcar como revisado" (RB-01).
- Validação de campos & limites (RB-06, RB-08, RB-10).
- Normalização & derivação de categorias (RB-02, RB-08).
- Ordenação (RB-03) & filtros (RB-02, RB-09).
- Predicado de cartão vencido (RB-07, RB-11).

## Fora de escopo

- UI, IndexedDB/persistência, notificações (ficam em cada app).

## Relacionados

- Código: `packages/core` (`@study/core`).
- RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md), [RNF-12](../web/Requisitos%20não%20funcionais/RNF-12%20-%20Cobertura%20de%20testes.md).
- Tickets: [tickets/index.md](./tickets/index.md).
