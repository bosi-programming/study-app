# RNF-12 — Cobertura de testes

**Categoria (ISO 25010):** Manutenibilidade

## Requisito

- Cobertura de testes **≥ 90%** em `packages/core` (limite já configurado no `vitest.config.ts`).
- `lint` & `typecheck` verdes.

## Métrica / critério de verificação

- `pnpm test:coverage` com `lines ≥ 90`; `pnpm lint` & `pnpm typecheck` sem erros.

## Como verificar

- CI/execução local dos scripts acima.

## Relacionados

- RNFs: RNF-09 (código em core)
