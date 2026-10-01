# Verificação da Fase 2 — Web

Versão: 3 | Data: 2026-10-01 | Base: `docs/engenharia/ROADMAP.md` (Fase 2) e `docs/engenharia/PLANO-DE-TESTES.md`

Registro datado do que cada pedaço da fase 2 fecha: a camada de persistência IndexedDB do web (BOS-42, ENG-17), as telas (BOS-43, ENG-18) e o export/import do JSON v1 pela interface (BOS-44, ENG-19). Isto é evidência de execução, não gate de CI — o bench não roda a cada PR (CI com lint, typecheck e testes nas PRs); a fase 2 como um todo (deploy em free tier) segue em aberto com o BOS-45.

## Definition of done

| Item | Comando | Evidência | Data | Resultado |
| --- | --- | --- | --- | --- |
| IndexedDB com o mesmo contrato de dados | `pnpm vitest run --project web` | `apps/web/test/store/{schema,mapping,store,queue}.test.ts` (os 25 casos `W-11.1`..`W-11.25`) e a zona `store` do `apps/web/test/architecture.test.ts` | 2026-09-30 | quatro stores com os índices do `MODELO-DE-DADOS.md`, schema pinado ao doc, round-trip por entidade e fila correta com 5.000 itens |
| Reuso do core TS sem duplicação | `pnpm --filter @study/web typecheck` | `apps/web/src/store/mapping.ts` importa `titleKey`/`subjectKey`/`toDifficulty` e os tipos de `@study/core` | 2026-09-30 | a regra e os tipos vêm do barrel; o web não reimplementa `RN-nn` |
| Telas: adicionar, lista, fila, check-in, arquivar e stats | `pnpm vitest run --project web` | `apps/web/test/{routing,strings}.test.ts`, `apps/web/test/app.test.tsx`, `apps/web/test/features/*.test.tsx` e `packages/core/test/lifecycle.test.ts` | 2026-10-01 | as seis rotas do `WEB.md` sobre o shell `{ store, deps }`, com o ciclo de vida do item no core; o projeto `web` vai a 19 arquivos/146 casos |
| Export/import do JSON v1 pela interface | `pnpm vitest run --project web --project scaffold` | `apps/web/test/features/{dataModel,data}.test.*`, `apps/web/test/store/openOptions.test.ts`, `apps/web/test/recovery.test.tsx` e `tests/export-import-cross.test.ts` | 2026-10-01 | a rota `#/data` fecha o `RF-18`/`RF-19` pela interface, com o contrato cruzado web↔CLI e o `RNF-07` na tela de falha (BOS-44, ENG-19) |
| Deploy em free tier | — | em aberto (BOS-45) | (a preencher) | (a preencher) |

## Telas do web (BOS-43, ENG-18)

A primeira superfície visível da fase 2: seis rotas por hash sobre o mesmo shell, sem regra nova — cada mutação chama o `@study/core` e toda leitura passa pela porta `Store`. O shell (roteador de hash próprio e injeção `{ store, deps }`) é o [Shell do web: hash próprio e injeção de store e deps](../adr/shell-do-web-hash-proprio-e-injecao-de-store-e-deps.md); o carimbo do streak na abertura e depois de cada mutação de fila é o [Roll-forward do streak na abertura do web](../adr/roll-forward-do-streak-na-abertura-do-web.md).

| Tela | Rota | O que fecha |
| --- | --- | --- |
| Fila | `#/` | RF-05, RF-06, RF-07 — atrasados primeiro, atraso em dias ou próximo vencimento, resumo por matéria |
| Adicionar | `#/add` | RF-01 — o vencimento inicial vem do core e a prévia reusa o model de `due` |
| Lista | `#/items` | RF-02, RF-24 — filtro por matéria e status, ordem por vencimento e busca normalizada |
| Detalhe | `#/items/:id` | RF-14, RF-15 — leitura com `on_time_streak` e arquivar/desarquivar sem confirmação |
| Check-in | `#/review/:id` | RF-08, RF-09, RF-12, RF-13 — item e log numa transação e a reavaliação com a dificuldade atual como padrão |
| Stats | `#/stats` | RF-21, RF-22, RF-23 — streak, contagens por status e check-ins do dia por data local |

Fora desta entrega: `#/cold` (RF-16, RF-17) e `#/config` (RF-25), que seguem em aberto; `#/data` (RF-18, RF-19) fecha na seção do BOS-44 abaixo, com o `RF-20` fora do escopo. Editar e remover item, a reavaliação manual fora do check-in e o histórico no detalhe também não entram.

```bash
pnpm --filter @study/web dev        # telas do web, em http://localhost:4173
pnpm vitest run --project web       # a suíte do web (jsdom sobre fake-indexeddb)
```

O desktop abre as mesmas telas pelo dev server (`pnpm --filter @study/desktop dev`), sem UI própria.

O ciclo de vida do item ganhou dono único no core: `archiveItem` e `unarchiveItem` saíram de `apps/cli/src/model/coldArchive.ts` para `packages/core/src/lifecycle.ts`, e o CLI passou a importá-los do barrel. `restoreItem`, `purgeItem` e a migração do arquivo morto continuam no CLI.

## Export/import do JSON v1 (BOS-44, ENG-19)

A rota `#/data` fecha o `RF-18`/`RF-19` pela interface: baixa um JSON v1 único e mescla um arquivo por UUID sem duplicar. O leitor mora em `apps/web/src/features/data/model/` (`json.ts`, `migrations.ts`, `merge.ts`) e espelha `apps/cli/src/model/json.ts` e `apps/cli/src/model/import.ts` sem importar o CLI; a borda assíncrona fica em `controller/service.ts` e o hook em `controller/useData.ts`. O `packages/core` fica intocado.

- Contrato: as seis chaves do `MODELO-DE-DADOS.md`, com o arquivo morto achatado `{item, review_logs, cold_archived_at}` e os padrões de `meta` (janela 180, locale `pt-BR`, streak 0/null).
- Merge: arquivo vence só com `updated_at` (item) ou `cold_archived_at` (arquivo morto) estritamente mais novo, comparado por instante; `review_log` insere só se o `id` não existe; import aditivo; `review_log` órfão e `schema_version` futuro recusam o arquivo inteiro e toda a escrita roda numa única `store.transaction`.
- RNF-07: `openStore` ganha `options.checkSchema` (padrão `true`) e a abertura relaxada só é usada na recuperação; quando o boot falha por `SchemaVersionError`/`SchemaMismatchError`, a tela de falha oferece o download; store ilegível mostra `não foi possível exportar o arquivo`.
- DOM: download e escolha de arquivo ficam atrás de `FileGateway` (`apps/web/src/files.ts`, zona root), com o adaptador `browserFiles`; o `App` recebe `files` por injeção, como já recebe `store` e `deps`.
- Prova cruzada: `tests/export-import-cross.test.ts` (projeto `scaffold`, ambiente node) faz o round-trip real nas duas direções — dump gerado pelo store do web aplicado pelo `applyDump` do CLI sobre um banco `node:sqlite` temporário, e o inverso pelo `dumpJsonV1` do CLI aplicado pelo `importDump` do web.
- Fora do escopo: o `RF-20` (export automático a cada migração para o arquivo morto) fica com a feature do arquivo morto, porque a migração ainda não existe no web.

A decisão de arquitetura é o [Export/import do JSON v1 no web: leitor próprio, abertura relaxada e prova cruzada](../adr/export-import-do-json-v1-no-web.md). O detalhe dos casos é o `### Detalhe do W-09` do `PLANO-DE-TESTES.md`.

## Verificação manual

| Caso | Comando | O que mede | Data | Resultado |
| --- | --- | --- | --- | --- |
| W-11 | `pnpm bench:web` | RNF-03 no web: `dueItems` abaixo de 200ms com 5.000 itens, com aquecimento e mediana | 2026-09-30 | PASS — mediana de 21,7ms (aquecimento 2 + mediana de 5 rodadas; seed em ~200ms) contra os 200ms do teto, exit 0. Três reconferências no mesmo dia deram 21,7ms, 21,8ms e 21,4ms; com o teto forçado a 1ms o script imprime FAIL e sai 1 |

O `W-11` é o único caso `(manual)` do `W-11.x`; a correção da fila de 5.000 itens é teste normal e determinístico (`W-11.9`), só o tempo é medido pelo script. As telas do BOS-43 não acrescentam caso manual: o comportamento delas é teste determinístico no projeto `web`, e o caminho que o bench mede (`apps/web/src/store/**`) não mudou nesta entrega — o número de 2026-09-30 continua o do `W-11`.

## Rodada de `pnpm test`

Projeto `web`, por rodada:

| Data | Arquivos | Casos |
| --- | --- | --- |
| 2026-09-30 (BOS-42) | 7 | 66 |
| 2026-10-01 (BOS-43) | 15 | 124 |
| 2026-10-01 (BOS-44) | 23 | 176 |

Rodada dos comandos do web em 2026-10-01, todos com exit 0: `pnpm vitest run --project web` (23 arquivos/176 casos), `pnpm --filter @study/web typecheck` e `pnpm exec eslint apps/web`. O `pnpm bench:web` não foi re-medido nesta unidade porque o caminho que ele mede não mudou.

## Verificações já cobertas por teste

- `pnpm vitest run --project web` roda o projeto `web` do `vitest.config.ts` (jsdom) e inclui `apps/web/test/store/**`, `apps/web/test/features/**`, `apps/web/test/{routing,strings}.test.ts`, `apps/web/test/app.test.tsx` e `apps/web/test/due.test.tsx`.
- As suítes de tela montam `<App store deps />` sobre `fake-indexeddb`; nenhum teste do web toca rede.
- `pnpm vitest run --project web apps/web/test/architecture.test.ts` prende as zonas do MVC por feature (o model sem react/DOM, a view sem controller), mantém as `dependencies` do manifesto em `react`/`react-dom` e `src/**` sem API de rede.
- `apps/web/test/strings.test.ts` varre `src/**` e reprova literal pt-BR fora de `apps/web/src/strings.ts` — a zona `src/store/**` mantém as mensagens internas do schema.
- O `W-09` fecha em `apps/web/test/features/dataModel.test.ts` (codec e merge), `apps/web/test/features/data.test.tsx` (a tela `#/data`), `apps/web/test/store/openOptions.test.ts` e `apps/web/test/recovery.test.tsx` (`RNF-07`) e `tests/export-import-cross.test.ts` (o round-trip web↔CLI).
- O smoke do desktop (`apps/desktop/test/smoke.test.ts`, projeto `desktop`) abre a janela real sobre o dev server e mira o shell do web, não mais o texto da feature-demo.
- `pnpm bench:web` mede a fila sobre o store real e sai 1 acima do teto; o tamanho e o orçamento aceitam `STUDY_WEB_BENCH_QUEUE_SIZE`/`STUDY_WEB_BENCH_BUDGET_MS`.
