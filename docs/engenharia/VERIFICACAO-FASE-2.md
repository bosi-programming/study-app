# Verificação da Fase 2 — Web

Versão: 1 | Data: 2026-09-30 | Base: `docs/engenharia/ROADMAP.md` (Fase 2) e `docs/engenharia/PLANO-DE-TESTES.md`

Registro datado do que a camada de persistência IndexedDB do web (BOS-42, ENG-17) fecha. Isto é evidência de execução, não gate de CI — o bench não roda a cada PR (CI com lint, typecheck e testes nas PRs); a fase 2 como um todo (telas, deploy e export/import) segue em aberto.

## Definition of done

| Item | Comando | Evidência | Data | Resultado |
| --- | --- | --- | --- | --- |
| IndexedDB com o mesmo contrato de dados | `pnpm vitest run --project web` | `apps/web/test/store/{schema,mapping,store,queue}.test.ts` (os 20 casos `W-11.1`..`W-11.20`) e a zona `store` do `apps/web/test/architecture.test.ts` | 2026-09-30 | quatro stores com os índices do `MODELO-DE-DADOS.md`, schema pinado ao doc, round-trip por entidade e fila correta com 5.000 itens |
| Reuso do core TS sem duplicação | `pnpm --filter @study/web typecheck` | `apps/web/src/store/mapping.ts` importa `titleKey`/`subjectKey`/`toDifficulty` e os tipos de `@study/core` | 2026-09-30 | a regra e os tipos vêm do barrel; o web não reimplementa `RN-nn` |
| Telas, deploy e export/import | — | em aberto (BOS-43 a BOS-45) | (a preencher) | (a preencher) |

## Verificação manual

| Caso | Comando | O que mede | Data | Resultado |
| --- | --- | --- | --- | --- |
| W-11 | `pnpm bench:web` | RNF-03 no web: `dueItems` abaixo de 200ms com 5.000 itens, com aquecimento e mediana | 2026-09-30 | PASS — mediana de 21,7ms (aquecimento 2 + mediana de 5 rodadas; seed em ~200ms) contra os 200ms do teto, exit 0. Três reconferências no mesmo dia deram 21,7ms, 21,8ms e 21,4ms; com o teto forçado a 1ms o script imprime FAIL e sai 1 |

O `W-11` é o único caso `(manual)` do `W-11.x`; a correção da fila de 5.000 itens é teste normal e determinístico (`W-11.9`), só o tempo é medido pelo script.

## Rodada de `pnpm test`

Data: 2026-09-30 (projeto `web`).

| Projeto | Arquivos | Casos |
| --- | --- | --- |
| web | 7 | 61 |

Rodada dos comandos do web, todos com exit 0: `pnpm vitest run --project web` (61 casos, já com os três `missing test` que a revisão do Tasting fechou), `pnpm --filter @study/web typecheck`, `pnpm exec eslint apps/web` e `pnpm bench:web`.

## Verificações já cobertas por teste

- `pnpm vitest run --project web` roda o projeto `web` do `vitest.config.ts` (jsdom) e inclui `apps/web/test/store/**`.
- `pnpm vitest run --project web apps/web/test/architecture.test.ts` prende a zona `store` (sem react/DOM, sem rede e sem alcançar `features/*`).
- `pnpm bench:web` mede a fila sobre o store real e sai 1 acima do teto; o tamanho e o orçamento aceitam `STUDY_WEB_BENCH_QUEUE_SIZE`/`STUDY_WEB_BENCH_BUDGET_MS`.
