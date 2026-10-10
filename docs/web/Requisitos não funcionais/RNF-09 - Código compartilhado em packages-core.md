# RNF-09 — Código compartilhado em `packages/core`

**Categoria (ISO 25010):** Manutenibilidade / Portabilidade

## Requisito

- Toda **regra de negócio** & trecho de **código compartilhável entre os apps** (web, CLI, Desktop) deve residir em **`packages/core`** (`@study/core`).
- Os apps consomem `@study/core`; não reimplementam regras (ex.: RB-01).

## Métrica / critério de verificação

- Regras de negócio & modelos fora de `packages/core` == 0.
- Cálculo de agendamento (RB-01) & modelo do cartão importados de `@study/core`.

## Como verificar

- Revisão de imports; `pnpm -r typecheck`; testes de core cobrindo as regras.

## Relacionados

- RB: [RB-01](../Regras%20de%20negócio/RB-01%20-%20Cálculo%20da%20próxima%20data%20de%20revisão.md)
- RNFs: RNF-07 (stack), RNF-12 (cobertura)
