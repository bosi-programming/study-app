# Registro de Decisões (ADRs)

Data: 2026-09-09 | Atualizado: 2026-09-23 | Base: `docs/produto/FEASIBILITY.md` e sessão de grill

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
| [ADR-013](adr-013-scaffold-do-monorepo-pnpm-sem-build.md) | Scaffold do monorepo pnpm sem build | aceito |
| [ADR-014](adr-014-engine-sqlite-do-cli-node-sqlite.md) | Engine SQLite do CLI: `node:sqlite` | aceito |
| [ADR-015](adr-015-golden-fixtures-formato-e-quem-valida.md) | Golden fixtures: formato do vetor e quem valida | aceito |
| [ADR-016](adr-016-camada-de-persistencia-do-cli-schema-mapeamento-e-store.md) | Camada de persistência do CLI: schema, mapeamento e store | aceito |
| [ADR-017](adr-017-ci-com-lint-typecheck-e-testes-nas-prs-para-main.md) | CI com lint, typecheck e testes nas PRs para main | aceito |
| [ADR-018](adr-018-finditems-com-filtro-porta-de-consulta-do-store.md) | `findItems` com filtro: a porta de consulta do store | aceito |
| [ADR-019](adr-019-item-nao-ativo-e-legivel-e-editavel.md) | Item não ativo é legível e editável; só o check-in recusa | aceito |
| [ADR-020](adr-020-dueitems-com-filtro-fila-do-dia.md) | `dueItems` com filtro: a fila do dia reusa a porta de consulta | aceito |
| [ADR-021](adr-021-ciclo-de-vida-do-item-e-arquivo-morto.md) | Ciclo de vida do item e arquivo morto: linha em `items`, gancho no contexto e export antes da migração | aceito |
| [ADR-022](adr-022-export-import-do-json-v1.md) | Export/import do JSON v1: isenções do contexto e merge por `updated_at` | aceito |

## Supersessão

O ADR-011 supera parte do ADR-004: a reavaliação de dificuldade passou a ser pedida a cada check-in, e o `on_time_streak` deixou de alimentar sugestão.

| ADR superado | Relação | ADR que supera |
| --- | --- | --- |
| [ADR-004](adr-004-regra-de-agendamento-sem-recall.md) | parcialmente, só a sugestão após 3 check-ins no prazo | [ADR-011](adr-011-reavaliacao-de-dificuldade-a-cada-check-in.md) |
