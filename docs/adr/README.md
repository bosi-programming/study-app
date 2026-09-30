# Registro de Decisões (ADRs)

Data: 2026-09-09 | Atualizado: 2026-09-30 | Base: `docs/produto/FEASIBILITY.md` e sessão de grill

Cada decisão vive em um arquivo próprio. Número, título, data e status vêm do frontmatter do arquivo correspondente.

| ADR | Título | Status |
| --- | --- | --- |
| [ADR-001](adr-001-core-ts-compartilhado-por-cli-web-mobile-e-desktop.md) | Core TS compartilhado por CLI, web, mobile e desktop | aceito |
| [ADR-002](adr-002-local-first-com-backend-adiado.md) | Local-first com backend adiado | aceito |
| [ADR-003](adr-003-engine-de-dados-por-plataforma.md) | Engine de dados por plataforma | aceito |
| [ADR-004](adr-004-regra-de-agendamento-sem-recall.md) | Regra de agendamento sem recall | superado-parcialmente |
| [ADR-005](adr-005-arquivo-morto-em-180-dias.md) | Arquivo morto em 180 dias | aceito |
| [ADR-006](adr-006-sentry-no-piloto.md) | Sentry no piloto | aceito |
| [ADR-007](adr-007-ordem-de-construcao-com-gates.md) | Ordem de construção com gates | aceito |
| [ADR-008](adr-008-mobile-com-react-native-expo.md) | Mobile com React Native (Expo) | aceito |
| [ADR-009](adr-009-desktop-com-electron-reaproveitando-o-web.md) | Desktop com Electron reaproveitando o web | aceito |
| [ADR-010](adr-010-referencia-de-item-por-uuid-prefixo-ou-titulo.md) | Referência de item por UUID, prefixo ou título | aceito |
| [ADR-011](adr-011-reavaliacao-de-dificuldade-a-cada-check-in.md) | Reavaliação de dificuldade a cada check-in | aceito |
| [ADR-012](adr-012-init-destrutivo-com-backup-e-confirmacao-reforcada.md) | Init destrutivo com backup e confirmação reforçada | aceito |
| [ADR-013](adr-013-scaffold-do-monorepo-pnpm-sem-build.md) | Scaffold do monorepo pnpm sem build | superado-parcialmente |
| [ADR-014](adr-014-engine-sqlite-do-cli-node-sqlite.md) | Engine SQLite do CLI: `node:sqlite` | aceito |
| [ADR-015](adr-015-golden-fixtures-formato-e-quem-valida.md) | Golden fixtures: formato do vetor e quem valida | aceito |
| [ADR-016](adr-016-camada-de-persistencia-do-cli-schema-mapeamento-e-store.md) | Camada de persistência do CLI: schema, mapeamento e store | aceito |
| [ADR-017](adr-017-ci-com-lint-typecheck-e-testes-nas-prs-para-main.md) | CI com lint, typecheck e testes nas PRs para main | aceito |
| [ADR-018](adr-018-finditems-com-filtro-porta-de-consulta-do-store.md) | `findItems` com filtro: a porta de consulta do store | aceito |
| [ADR-019](adr-019-item-nao-ativo-e-legivel-e-editavel.md) | Item não ativo é legível e editável; só o check-in recusa | aceito |
| [ADR-020](adr-020-dueitems-com-filtro-fila-do-dia.md) | `dueItems` com filtro: a fila do dia reusa a porta de consulta | aceito |
| [ADR-021](adr-021-ciclo-de-vida-do-item-e-arquivo-morto.md) | Ciclo de vida do item e arquivo morto: linha em `items`, gancho no contexto e export antes da migração | aceito |
| [ADR-022](adr-022-export-import-do-json-v1.md) | Export/import do JSON v1: isenções do contexto e merge por `updated_at` | aceito |
| [ADR-023](adr-023-gancho-do-streak-de-fila-zerada.md) | Roll-forward do streak de fila zerada no gancho de contexto, com export/import/init isentos | aceito |
| [ADR-024](adr-024-vocabulario-de-error-code-e-envelope-sem-comando.md) | Vocabulário fechado de `error.code` e envelope no `study` sem comando | aceito |
| [ADR-025](adr-025-rastreabilidade-t-nn-do-cli-verificacao-manual-e-medicao-da-rnf-03.md) | Rastreabilidade `T-nn` do CLI, verificação manual e medição da RNF-03 | aceito |
| [ADR-026](adr-026-instalacao-local-do-cli-symlink-do-shim-no-path.md) | Instalação local do CLI por symlink do shim do pnpm no PATH | superado |
| [ADR-027](adr-027-distribuicao-npm-global-do-cli-e-artefato-js.md) | Distribuição npm-global do CLI e artefato JS | superado-parcialmente |
| [ADR-028](adr-028-nome-publicado-do-cli-sob-o-escopo-bosi-programming.md) | Nome publicado do CLI sob o escopo `@bosi-programming` | aceito |
| [ADR-029](adr-029-cores-da-saida-humana-do-cli.md) | Cores da saída humana do CLI: paleta truecolor com detecção de terminal | aceito |
| [ADR-030](adr-030-porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md) | Porta de abertura do contexto e a sessão longa da TUI: limite de ação e contrato de estado | aceito |
| [ADR-031](adr-031-mvc-no-cli.md) | MVC no CLI: camadas explícitas e o controller que devolve view-model | aceito |
| [ADR-032](adr-032-scaffold-do-apps-web-react-vite-e-mvc-por-feature.md) | Scaffold do `apps/web`: React + Vite, core pelo `src` e MVC por feature | aceito |

## Supersessão

O ADR-011 supera parte do ADR-004: a reavaliação de dificuldade passou a ser pedida a cada check-in, e o `on_time_streak` deixou de alimentar sugestão.

O ADR-027 supera o ADR-026 (a instalação passa a ser npm-global no lugar do symlink) e parte do ADR-013 (o artefato publicado ganha bundle JS).

O ADR-028 revisa parte do ADR-027: o nome publicado deixa de ser sem escopo e passa a `@bosi-programming/study-cli`, porque o registry recusou o `study-cli` como parecido demais com o `studycli` existente.

| ADR superado | Relação | ADR que supera |
| --- | --- | --- |
| [ADR-004](adr-004-regra-de-agendamento-sem-recall.md) | parcialmente, só a sugestão após 3 check-ins no prazo | [ADR-011](adr-011-reavaliacao-de-dificuldade-a-cada-check-in.md) |
| [ADR-013](adr-013-scaffold-do-monorepo-pnpm-sem-build.md) | parcialmente, o "sem build" e o `bin: ./src/main.ts` no artefato publicado | [ADR-027](adr-027-distribuicao-npm-global-do-cli-e-artefato-js.md) |
| [ADR-026](adr-026-instalacao-local-do-cli-symlink-do-shim-no-path.md) | integralmente, a instalação passa a ser npm-global | [ADR-027](adr-027-distribuicao-npm-global-do-cli-e-artefato-js.md) |
| [ADR-027](adr-027-distribuicao-npm-global-do-cli-e-artefato-js.md) | parcialmente, só o nome publicado (sem escopo para escopado) | [ADR-028](adr-028-nome-publicado-do-cli-sob-o-escopo-bosi-programming.md) |
