---
numero: 13
titulo: 'Scaffold do monorepo pnpm sem build'
data: '2026-09-12'
status: 'aceito'
---

# ADR-013 — Scaffold do monorepo pnpm sem build

- Contexto: o [ADR-001](adr-001-core-ts-compartilhado-por-cli-web-mobile-e-desktop.md) exige `packages/core` em TS puro, mas não diz como ele chega aos quatro runtimes; nenhum ticket da fase 1 tem onde aterrissar sem o workspace.
- Decisão: workspace pnpm 12.4.1 (`packageManager`, Node >= 24) com três membros — `@study/core`, `@study/cli` e `@study/golden` — e `packages/*`, `apps/*` e `fixtures/*` no `pnpm-workspace.yaml`.
- Fonte única sem build: `core` e `golden` exportam `./src/index.ts` e `./*.json`; o Node 24 faz type stripping pelo realpath do symlink do pnpm e Vite, Metro, Expo e Electron consomem TS direto. Sem `dist/` e sem `.d.ts` publicado — todos os consumidores são TS do repo.
- Pureza provada pelo compilador: o `tsconfig.json` de `core` e `golden` cobre só `src`, com `types: []` e `lib: ["es2023"]`; os testes ficam num `tsconfig.test.json` com `types: ["node"]`. `noUncheckedSideEffectImports` fecha `import 'node:fs'` sem binding, e um teste varre `packages/core/src` atrás de imports proibidos.
- `fixtures/golden` é membro de verdade (`@study/golden`), não pasta solta: web, mobile e desktop não têm filesystem para ler JSON, então a fixture precisa ser importável.
- Bin do CLI como prova ponta a ponta: `apps/cli` declara `bin: { study: "./src/main.ts" }` com shebang; a raiz depende de `@study/cli` para o pnpm criar `node_modules/.bin/study`.
- Versões: TypeScript 5.9.3, Vitest 4.1.11 e `@types/node` 24.13.4 na linha 24, para o compilador recusar API de Node 26 sem o runtime correspondente.
- Consequência: `pnpm install` mais `test`, `test:golden`, `typecheck` e `bench` são a fundação da fase 1; trocar por build com `dist/` exige revisitar este ADR.
- Alternativa rejeitada: build com `tsc` e `dist/` — uma fonte de verdade a menos, ao custo de um passo de build e artefatos velhos para manter.
