---
numero: 31
titulo: 'Scaffold do apps/web: React + Vite, core pelo src e MVC por feature'
data: '2026-09-30'
status: 'aceito'
---

# ADR-031 — Scaffold do apps/web: React + Vite, core pelo src e MVC por feature

- Contexto: a fase 2 do `ROADMAP.md` abre com o scaffold do `apps/web`, sobre o mesmo `packages/core` do CLI ([ADR-001](adr-001-core-ts-compartilhado-por-cli-web-mobile-e-desktop.md)). O risco declarado da fase é o web virar uma reescrita da regra de agendamento; o scaffold existe para ligar a superfície ao core único antes de qualquer tela (BOS-42..BOS-45).
- Contexto: o [ADR-013](adr-013-scaffold-do-monorepo-pnpm-sem-build.md) fixou o monorepo pnpm sem build: `@study/core` e `@study/golden` exportam `./src/index.ts` e são consumidos direto do `src`. O `apps/cli` já consome o core pelo symlink do workspace. Faltavam o mapa de camadas do web e a ligação da suíte do web ao `vitest.config.ts`.
- Decisão: `apps/web` entra como quarto membro do workspace (`@study/web`, `private: true`, `type: module`, `engines.node >= 24`), sobre React 19 e Vite 8, com `react`/`react-dom` como únicas dependências de runtime. Nada é publicado: sem `bin`, sem `files` e sem `publishConfig`.
- Decisão: a regra vem de `@study/core` pelo nome do pacote, em devDependency `workspace:*` (como no CLI), resolvido pelo symlink do workspace. Sem alias de path, sem pré-build e sem `dist/`: o Vite compila o TS do `src` (ADR-013). `@study/golden` entra do mesmo jeito, só para os testes lerem os vetores.
- Decisão: `apps/web/src` adota o MVC por feature: cada feature é um MVC pequeno em `src/features/<feature>/{model,view,controller}`. O model são adaptadores puros sobre o core, sem `react`/`react-dom` e sem tocar no DOM; a view são componentes React de apresentação, sem importar controller; o controller são hooks que produzem o view-model, sem importar view. O root (`src/main.tsx`, `src/App.tsx` e o barrel da feature) é o único ponto que liga as três camadas. A primeira feature é `due`, que delega `initialDueDate` e `intervalFor` ao core.
- Decisão: um teste estrutural em `apps/web/test/architecture.test.ts` varre `src` e falha se o controller importar a view, se a view importar o controller, se o model importar view/controller, ou se o model importar `react`/`react-dom` ou citar `document`/`window`.
- Decisão: o `vitest.config.ts` ganha o projeto `web` (`root: './apps/web'`, `environment: 'jsdom'`, include de `test/**/*.test.ts` e `test/**/*.test.tsx`), levando o `pnpm test` de quatro para cinco projetos. Nenhum teste do web toca a rede; as dependências de teste (Vitest, Testing Library e jsdom) entram no `pnpm-lock.yaml` para o `--frozen-lockfile` do CI ([ADR-017](adr-017-ci-com-lint-typecheck-e-testes-nas-prs-para-main.md)).
- Consequência: a fase 2 começa sobre um core único, e o desktop (fase 5) herda o renderer e o mapa de camadas do web. A regra não é duplicada, e o teste estrutural impede que seja.
- Consequência: `packages/core`, `fixtures/golden` e `apps/cli` ficam intocados; o `pnpm-workspace.yaml` (o glob `apps/*` já cobre o membro), o `eslint.config.js` e o workflow de CI não mudam.
- Alternativa rejeitada: consumir o core por alias de path ou por pacote pré-buildado em `dist/`. Quebraria a resolução do ADR-013 e criaria uma segunda cópia do core.
- Alternativa rejeitada: deixar o web fora do `vitest.config.ts`, com um runner próprio. Dois runners divergem; o projeto `web` central mantém o gate de `pnpm test` único.
- Gatilho de revisão: uma feature precisar de estado compartilhado entre camadas que o MVC por feature não expresse, ou o web passar a precisar de build de biblioteca para o desktop herdar.
