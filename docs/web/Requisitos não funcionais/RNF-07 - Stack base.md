# RNF-07 — Stack base

**Categoria (ISO 25010):** Manutenibilidade

## Requisito

- Stack: **TypeScript** + **React 19** + **Tailwind CSS 4**.
- Ver `apps/web`.

## Métrica / critério de verificação

- Código em TS (sem `any` implícito); React 19; Tailwind 4 configurado (necessário ao RNF-08).

## Como verificar

- `pnpm typecheck`, `pnpm lint` & build.

## Relacionados

- RNFs: RNF-08 (design system), RNF-09 (código compartilhado)
