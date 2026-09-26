# Verificação da Fase 1 — CLI

Versão: 1 | Data: 2026-09-25 | Base: `docs/engenharia/ROADMAP.md` (Fase 1) e `docs/engenharia/PLANO-DE-TESTES.md`

Registro datado do que fecha a fase 1. O Definition of done vem do `ROADMAP.md`; os casos `(manual)` vêm do plano de testes. Isto é evidência de execução, não gate de CI — o bench e a semana de uso não rodam a cada PR (ADR-017).

## Definition of done

| Item | Comando | Evidência | Data | Resultado |
| --- | --- | --- | --- | --- |
| instalar | `pnpm install` | `pnpm install --frozen-lockfile` em Node 24 com pnpm 12.4.1; o CI roda o mesmo passo a cada PR (ADR-017) | 2026-09-25 | workspace instalado sem build; TypeScript consumido de `src` |
| criar itens | `study add <título> -s <matéria> -d <dificuldade> --json` | `apps/cli/test/commands/add.test.ts` (`add-happy`, `add-vencimento-por-dificuldade`) e o vetor `vencimento-inicial-por-dificuldade` (T-01) | 2026-09-25 | item criado com `interval_days` e `due_date` por dificuldade, persistido no SQLite |
| zerar a fila por 1 semana | uso diário do CLI (`study due`, `study review`) | em aberto — preenchimento humano | (a preencher) | (a preencher) |
| exportar e reimportar sem perda | `study export --json` + `study import <arquivo> --json` | `apps/cli/test/commands/import.test.ts` (`AC2/AC11 — round-trip completo`, T-09) e `apps/cli/test/output/json.test.ts` | 2026-09-25 | export → import num banco vazio → export reproduz o conteúdo; a segunda rodada é idempotente (`written: 0`) |

## Verificação manual

| Caso | Comando | O que mede | Data | Resultado |
| --- | --- | --- | --- | --- |
| T-26 | `pnpm bench` | RNF-03: `study due --json` abaixo de 200ms com 5.000 itens, com aquecimento e mediana | 2026-09-25 | PASS — mediana de 91,3ms (aquecimento 2 + mediana de 5 rodadas; seed em 31ms) contra os 200ms do teto, exit 0. Três reconferências no mesmo dia deram 90,9ms, 91,7ms e 92,3ms; uma quarta, numa máquina sob carga, deu 187,9ms — ainda abaixo do teto, mas com folga estreita quando a máquina está ocupada |

O `T-26` é o único `(manual)` da tabela `## Casos obrigatórios` do plano; os demais `T-nn` têm execução pelo binário em `apps/cli/test/**/*.test.ts`, pinada por `apps/cli/test/traceability.test.ts` (ADR-025).

## Rodada de `pnpm test`

Data: 2026-09-25 (contagem depois dos achados da revisão).

| Projeto | Arquivos | Casos |
| --- | --- | --- |
| core | 9 | 168 |
| golden | 2 | 47 |
| cli | 28 | 319 |
| scaffold | 1 | 48 |
| total | 40 | 582 |

Rodada completa dos comandos da fase, todos com exit 0: `pnpm test` (582 casos), `pnpm test:coverage` (582 casos, 100% de linhas do core — 128/128), `pnpm typecheck`, `pnpm lint`, `pnpm bench` e `pnpm sqlite:probe` (9/9 verificações).

## Verificações já cobertas por teste

- `pnpm test` roda os quatro projetos do `vitest.config.ts` e inclui `core` e `cli`; a contagem por projeto está acima.
- `pnpm test:golden` roda só o projeto golden e falha quando um `expected` diverge da regra (ADR-015).
- `pnpm test:coverage` mede as linhas de `packages/core/src` e falha abaixo de 90%.
- `pnpm typecheck` roda `tsc --noEmit` nos três pacotes mais o tsconfig da raiz.
- `pnpm lint` roda o ESLint em flat config sobre todo o TS do repositório.
- `pnpm sqlite:probe` prova o schema canônico no engine do CLI (ADR-014).
