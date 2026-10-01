---
titulo: 'Scaffold do apps/desktop: Electron sobre o renderer do web'
data: '2026-09-30'
status: 'aceito'
---

# Scaffold do apps/desktop: Electron sobre o renderer do web

- Contexto: o [Desktop com Electron reaproveitando o web](desktop-com-electron-reaproveitando-o-web.md) fixou a decisão de encapsular o renderer do `apps/web` em Electron, com a mesma persistência IndexedDB e sem UI própria. A fase 5 do `ROADMAP.md` abre com o scaffold do `apps/desktop`; faltava a casca que abre o renderer do web no desktop e o gate que prova isso (BOS-58, ENG-33).
- Contexto: o [Core TS compartilhado por CLI, web, mobile e desktop](core-ts-compartilhado-por-cli-web-mobile-e-desktop.md) e o [Scaffold do monorepo pnpm sem build](scaffold-do-monorepo-pnpm-sem-build.md) fixaram o core único consumido pelo `src`, sem `dist/` e sem cópia da regra. O renderer do web já é uma app React sobre o `@study/core` ([Scaffold do apps/web](scaffold-do-apps-web-react-vite-e-mvc-por-feature.md)).
- Decisão: `apps/desktop` entra como quinto membro do workspace (`@study/desktop`, `private: true`, `type: module`, `main: src/main.ts`, `engines.node >= 24`), sem `bin`, `files`, `publishConfig`, bundle ou `dist/`. O `pnpm-workspace.yaml` não muda: o glob `apps/*` já cobre o membro.
- Decisão: o processo principal é TS consumido direto pelo Electron (o Node 24 embarcado faz type stripping), com `preload.cjs` em CJS, porque o preload em sandbox não aceita ESM nem TS. Sem passo de build; o gatilho de revisão é o preload ganhar IPC tipado e pedir bundle com esbuild, como o `apps/cli/build.mjs`.
- Decisão: a janela carrega o renderer do web pelo dev server do Vite (`STUDY_WEB_URL`, default `http://localhost:4173`), não por um `apps/web/dist` buildado. O `apps/web/vite.config.ts` fixa a porta 4173 com `strictPort: true` e falha alto se ela estiver ocupada. O `loadFile` sobre o bundle do web fica para o ticket de empacotamento (D-01/D-03).
- Decisão: o preload expõe só a ponte mínima (`contextBridge.exposeInMainWorld('studyDesktop', { platform, electron })`), com `contextIsolation: true`, `sandbox: true` e `nodeIntegration: false` na `BrowserWindow`. O `apps/web` segue intacto e não pode passar a exigir `window.studyDesktop`, para continuar rodando no navegador.
- Decisão: o `vitest.config.ts` ganha o projeto `desktop` (`root: './apps/desktop'`, `environment: 'node'`, teto de 60s), levando o `pnpm test` a seis projetos. O smoke usa o `_electron` do `playwright-core` dentro do Vitest, não o `playwright`/`@playwright/test`: o gate continua um runner só e o `playwright-core` não baixa navegador — o único binário é o Electron. O Electron 44 não tem postinstall (o binário é baixado sob demanda pelo `index.js`), então o `allowBuilds` do `pnpm-workspace.yaml` segue só com `esbuild`.
- Decisão: nenhum `.tsx` de tela vive sob `apps/desktop` — o desktop herda as telas do web. Qualquer segunda árvore de UI é a duplicação que a fase 5 declara como risco.
- Consequência: `packages/core` e `apps/cli` ficam intocados; o `apps/web` muda só a porta do Vite, e ganham o membro novo o `README.md`, o `AGENTS.md`, o `PLANO-DE-TESTES.md` e o CI. O CI instala as bibliotecas de sistema do Electron e o xvfb e roda o gate sob `xvfb-run -a`.
- Alternativa rejeitada: carregar o renderer de um `apps/web/dist` buildado dentro do `pnpm test`. Colidiria com o caso que pina que `apps/web/dist` não existe (`S-35`) e anteciparia o ticket de empacotamento.
- Alternativa rejeitada: um runner próprio para o smoke do desktop. Dois runners divergem; o projeto `desktop` central mantém o gate de `pnpm test` único.
- Superado em parte: o [Origem de carregamento do renderer no desktop](origem-de-carregamento-do-renderer-no-desktop.md) (BOS-59) passou a carregar o bundle de produção por `study://app`, então a alternativa rejeitada abaixo deixou de valer e o `S-35` deixou de pinar a ausência do diretório `apps/web/dist`, passando a pinar o não versionamento.
- Gatilho de revisão: o preload ganhar IPC tipado, o empacotamento precisar de `loadFile` sobre o bundle do web, ou a paridade com o web exigir uma segunda árvore de telas.
