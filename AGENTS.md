# AGENTS.md

Instruções para agentes que trabalham neste repositório. Valem para os cinco membros do workspace: `packages/core`, `apps/cli`, `apps/web`, `apps/desktop` e `fixtures/golden`.

## Layout

- `packages/core` (`@study/core`) — domínio e regra de agendamento, TS puro, sem API de Node ou browser.
- `apps/cli` (`@bosi-programming/study-cli`) — superfície da fase 1, bin `study`, publicável no npm.
- `apps/web` (`@study/web`) — app React + Vite da fase 2; MVC por feature e o core consumido pelo `src`.
- `apps/desktop` (`@study/desktop`) — casca Electron da fase 5; carrega o renderer do `apps/web` pelo dev server do Vite, sem UI própria.
- `fixtures/golden` (`@study/golden`) — golden fixtures importáveis, vetores de regressão.
- `docs/` — documentos de engenharia; o índice é `docs/README.md`.
- `scripts/` — `bench.ts` e `sqlite-probe.ts`, provas executáveis.
- `tests/scaffold.test.ts` — prova a estrutura do próprio repositório.

## Toolchain

Node >= 24 e pnpm 12.4.1. `core` e `golden` são consumidos direto do `src`, sem `dist/`; o `apps/web` também consome o `@study/core` pelo `src`, sem alias nem pré-build; o `@bosi-programming/study-cli` roda `build.mjs` no `prepare` e gera o bundle publicado em `apps/cli/dist/`; o `apps/desktop` roda o main em TS direto e o preload em CJS, sem build.

## Comandos

`pnpm install`, `pnpm test`, `pnpm test:golden`, `pnpm test:coverage`, `pnpm lint`, `pnpm typecheck`, `pnpm bench` e `pnpm sqlite:probe`. Detalhes no `README.md`.

## Convenções

- Não escreva comentários em código. O `@bosi-programming/study-cli` é publicado no npm; `core` e `golden` seguem privados e consumidos só do `src`, então não há doc-comment a manter.
- Documentos em pt-BR; identificadores em inglês. Assunto de commit em inglês, corpo em pt-BR.
- Pastas em minúsculas e sem acento.
- `packages/core` não importa API de Node nem de browser — há um teste que varre `packages/core/src`.
- Toda decisão de arquitetura vira um ADR em `docs/adr/`, um arquivo por decisão, nomeado pelo assunto e sem número.

## Documentos

- `README.md` — comandos, pré-requisitos e layout do workspace.
- `docs/README.md` — índice dos documentos, com status e ordem de leitura.
