# AGENTS.md — study-app

Guia para agentes que trabalham neste repositório.

## Idioma

- O app é em **pt-BR** (textos de UI, mensagens, documentação em `docs/`).
- Todo o **código é em inglês**: nomes de tipos, funções, variáveis, campos, arquivos e títulos/descrições de testes.
- Sem comentários no código e nos testes (a diretiva `@ts-expect-error` é a única exceção).

## Onde ficam os tickets

- Tickets: `docs/<área>/tickets/` — `docs/core/tickets/` (CORE-*) & `docs/web/tickets/`.
- Regras de negócio, histórias de usuário, casos de uso e RNFs: `docs/web/` (`Regras de negócio/`, `Histórias de usuários/`, `Casos de uso/`, `Requisitos não funcionais/`).
- Visões gerais por área: `docs/index.md`, `docs/core/index.md`, `docs/web/index.md`.

## Estrutura & scripts

- Monorepo pnpm. `packages/core` = `@study/core` (regras de negócio compartilhadas, RNF-09); apps em `apps/`.
- Scripts na raiz: `pnpm test`, `pnpm test:coverage`, `pnpm typecheck`, `pnpm lint`.
