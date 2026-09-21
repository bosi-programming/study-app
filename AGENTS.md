# AGENTS.md

Instruções para agentes que trabalham neste repositório. Valem para os três membros do workspace: `packages/core`, `apps/cli` e `fixtures/golden`.

## Layout

- `packages/core` (`@study/core`) — domínio e regra de agendamento, TS puro, sem API de Node ou browser.
- `apps/cli` (`@study/cli`) — superfície da fase 1, bin `study`.
- `fixtures/golden` (`@study/golden`) — golden fixtures importáveis, vetores de regressão.
- `docs/` — documentos de engenharia; o índice é `docs/README.md`.
- `scripts/` — `bench.ts` e `sqlite-probe.ts`, provas executáveis.
- `tests/scaffold.test.ts` — prova a estrutura do próprio repositório.

## Toolchain

Node >= 24 e pnpm 12.4.1. Não há build: o TypeScript é consumido direto do `src`, sem `dist/`.

## Comandos

`pnpm install`, `pnpm test`, `pnpm test:golden`, `pnpm typecheck`, `pnpm bench` e `pnpm sqlite:probe`. Detalhes no `README.md`.

## Convenções

- Não escreva comentários em código. Nenhum pacote deste repo é publicado ou consumido de fora, então não há doc-comment a manter.
- Documentos em pt-BR; identificadores em inglês. Assunto de commit em inglês, corpo em pt-BR.
- Pastas em minúsculas e sem acento.
- `packages/core` não importa API de Node nem de browser — há um teste que varre `packages/core/src`.
- Toda decisão de arquitetura vira um ADR em `docs/adr/`, um arquivo por decisão, indexado no `docs/adr/README.md`.

## Documentos

- `README.md` — comandos, pré-requisitos e layout do workspace.
- `docs/README.md` — índice dos documentos, com status e ordem de leitura.
