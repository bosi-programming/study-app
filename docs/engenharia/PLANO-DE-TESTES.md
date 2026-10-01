# Plano de Testes — App de Estudo Espaçado

Versão: 5 | Data: 2026-10-01 | Base: `docs/especificacao/REQUISITOS.md`

## Estratégia

- A regra de agendamento é o ativo crítico; ela concentra os testes.
- Golden fixtures são a fonte única de verdade da regra para todos os apps TS: CLI, web, mobile e desktop comparam contra elas, e o runner do core (`packages/core/test/golden.test.ts`) também. A suíte `C-nn` do core continua repetindo alguns desses vetores no nível de unidade — de propósito, e sem substituir os `T-nn`.
- O `D-01` (dmg, nsis e AppImage) fica coberto pelo pipeline de instaladores do BOS-60; o `D-02` fica coberto em parte pelo scaffold do `apps/desktop`; e o `D-03`, a paridade completa com as telas do web, segue pendente. Os três moram no ticket de empacotamento da fase 5.
- UI testada por comportamento essencial, sem perseguir cobertura.
- A fila do web é medida por `pnpm bench:web` (`scripts/bench-web.ts`), fora do CI, como o `pnpm bench` do CLI: semeia 5.000 itens sobre o `fake-indexeddb` e mede a mediana de `dueItems` contra os 200ms da RNF-03; o número fica no `VERIFICACAO-FASE-2.md`.

| Camada | Ferramenta | Meta |
| --- | --- | --- |
| `packages/core` | Vitest | >= 90% de linhas |
| CLI | Vitest + execução do binário com `--json` | fluxos dos RF-01..RF-20 |
| Web | Vitest + Testing Library | adicionar, fila, check-in, arquivar |
| Mobile | Jest + React Native Testing Library | mesmos fluxos, lendo `fixtures/golden` via core |
| Desktop | Playwright sobre Electron + testes do web | abertura e fluxos principais |
| Piloto | Sentry + entrevistas semanais | 3–5 estudantes por 2+ semanas, >= 50% na 2ª semana |

## Golden fixtures

- Local: `fixtures/golden/*.json`, um arquivo por caso.
- Cada caso: estado inicial, ação, parâmetros e resultado esperado. O envelope diz `case`, `kind` e o `T-nn` que o caso cobre (`requirement`); o `kind` define o resto das chaves.

| `kind` | Casos | Chaves além do envelope |
| --- | --- | --- |
| `initial-due` | T-01 | `new_item`, `created_on` e `cases[]` com `difficulty`, `expected_interval_days` e `expected_due_date` |
| `progression` | T-02 | `difficulty`, `base_interval_days`, `cap_days`, `checkins` e `expected_intervals` |
| `checkin` | T-03, T-05, T-20 | `state` (dificuldade, `review_count`, intervalo, vencimento e `on_time_streak`) e `checkins[]` com `today` e `expected` (com `late`) |
| `reevaluate` | T-04 | `state`, `params` (`new_difficulty` e `today`) e `expected` |
| `queue-order` | T-11 | `today`, `items[]` (`id`, `title` e `due_date`) e `expected_order` |
| `normalize` | T-12 | `pairs[]` com `input` e `expected_key` |
| `queue-streak` | T-21 | `initial` e `days[]` com `day`, `queue_empty` e `expected` |

- Consumidos pelos testes do core hoje, e por CLI, web, mobile e desktop nas fases seguintes; divergência quebra o build.
- Versionados junto do código; alteração exige revisão de todos os consumidores.
- Quem compara: `packages/core/test/golden.test.ts` lê os vetores e compara com o que a regra produz. O arquivo executa no projeto `golden`, então `pnpm test:golden` valida a forma dos fixtures e os vetores de uma vez e falha quando um `expected` diverge (Golden fixtures: formato e quem valida).

```json
{
  "case": "progressao-ate-teto",
  "kind": "progression",
  "requirement": "T-02",
  "difficulty": 3,
  "base_interval_days": 5,
  "cap_days": 365,
  "checkins": 9,
  "expected_intervals": [5, 10, 20, 40, 80, 160, 320, 365, 365]
}
```

## Casos obrigatórios

| ID | Caso | Requisito |
| --- | --- | --- |
| T-01 | Vencimento inicial por dificuldade (1–5) | RN-01, RN-02 |
| T-02 | Progressão ×2 até o teto de 365d | RN-03, RN-07 |
| T-03 | Check-in atrasado não penaliza | RF-08, RN-04, RN-05 |
| T-04 | Reavaliação recalcula com a nova base | RN-06 |
| T-05 | Reavaliação pedida a cada check-in e reset do contador com atraso | RN-08, RF-12, RF-13 |
| T-06 | Arquivar tira da fila; check-in rejeitado | RF-09, RF-14, RF-15, RN-09 |
| T-07 | Migração para arquivo morto em 180d com export | RF-16, RF-20, RN-10 |
| T-08 | Restore preserva n e dificuldade | RF-17, RN-11 |
| T-09 | Export/import round-trip sem perda | RF-18, RF-19 |
| T-10 | Import duplicado não duplica item | RF-19, CA-11 |
| T-11 | Ordenação da fila: atrasados primeiro | RF-05, CA-12 |
| T-12 | Normalização de matéria (caixa e acentos) | RN-12 |
| T-13 | `study edit` altera campos e recalcula quando a dificuldade muda | RF-03, RN-06 |
| T-14 | `study remove` exige `--yes` e não passa pelo arquivo morto | RF-04 |
| T-15 | `study due` mostra o recorte por matéria | RF-07 |
| T-16 | `study show --history` lista os check-ins e o próximo vencimento | RF-06, RF-10 |
| T-17 | `study find` acha por substring sem caixa e sem acento | RF-24 |
| T-18 | Ref por título exato; título duplicado recusa com candidatos | RN-15, CA-18 |
| T-19 | `study review` pergunta a dificuldade; manter não muda e mudar recalcula | RF-12, CA-13, CA-14 |
| T-20 | Check-in antecipado e dois check-ins no mesmo dia | RN-13, CA-15 |
| T-21 | Streak de fila zerada acumula e zera | RF-21, RF-22, RF-23, RN-14, CA-16 |
| T-22 | `study config set cold_archive_after_days` muda a janela de migração | RF-25, RN-10, CA-19 |
| T-23 | Sem terminal, `add` sem `-d` encerra com exit 1 | CLI.md — prompts |
| T-24 | `init --reset --yes` faz backup e recria; backup falho aborta sem apagar | CLI.md — fluxos com prompt |
| T-25 | Envelope `--json` estável por comando, com `schema_version` | RNF-08 |
| T-26 | Benchmark: 5.000 itens e `study due --json` abaixo de 200ms (manual) | RNF-03 |
| T-27 | `study list` filtra por matéria e status e ordena por vencimento | RF-02 |

### Suíte de scaffold (S-01..S-61)

- IDs `S-nn` cobrem a fiação do repo, não a regra: pureza e resolução do core (`S-01`, `S-02`, `S-16`), forma, unicidade e cobertura da fixture (`S-03`..`S-05`, `S-18`), bin do CLI (`S-06`, `S-07`, `S-28`: fiação e publicação no npm), membros, tsconfig, dependências e scripts do workspace (`S-08`..`S-12`), o engine SQLite (`S-13`..`S-15`: probe executável, DDL acoplado ao doc e recusa de dependência nativa), a organização dos docs (`S-17`: nome e frontmatter dos ADRs) e a automação do repositório (`S-21`, `S-22`: workflow de CI e gate de lint).
- `S-16` fecha o outro lado do `S-01`: além dos imports proibidos, nenhum arquivo de `packages/core/src` pode ler relógio ou aleatoriedade do ambiente (`Date.now`, `new Date()` sem argumentos, `Math.random`, `crypto`, `performance.now`) — tempo e ids vêm só de `deps`. Nasceu do Tasting do BOS-28; era `S-13` no ramo e ficou com o id livre depois que o probe do BOS-27 tomou `S-13`..`S-15`.
- `S-17` pina a convenção dos ADRs: cada decisão é um arquivo nomeado pelo assunto, com `titulo`, `data` e `status` no frontmatter, sem número no nome, no frontmatter ou no texto. Sem índice e sem contador — o registro é o diretório.
- `S-18`..`S-20` nasceram do BOS-29: o `S-18` exige um fixture para cada `T-nn` obrigatório do plano, e exige que todo `kind` do union tenha caso; o `S-19` pina o script `test:coverage`, o provider v8 e o threshold de linhas do core; o `S-20` pina o runner dos vetores no projeto `golden` e fora do projeto `core`, que é o que mantém `pnpm test:golden` como gate de divergência.
- `S-21` e `S-22` nasceram do BOS-39 (ENG-14). O `S-21` pina o workflow de CI: disparo em `pull_request` com base `main` (nunca `pull_request_target`), `actions/checkout`, `pnpm/action-setup` lendo o `packageManager`, Node 24 com cache de pnpm, `pnpm install --frozen-lockfile`, um passo por gate, permissão `contents` na forma de bloco e nenhum segredo — é o que deixa um PR de fork rodar. O `S-22` pina o gate de lint: `eslint .` na raiz, dependências só na raiz, ignore de `node_modules`, `coverage`, `recipes`, `.scratch` e `dist` (o bundle gerado), zero erro e zero aviso nos diretórios do workspace, nenhuma supressão deixada para trás, as dependências no lockfile, a menção no `README.md` e no `AGENTS.md`, e o ADR do CI aceito.
- `S-28` nasceu do BOS-46 (ENG-21). Ele pina a publicação do CLI: o manifesto publicável (`@bosi-programming/study-cli`, sem `private`, `publishConfig.access: "public"`, `engines.node`, `files: ["dist"]`, `bin.study -> ./dist/main.js` e `dependencies` vazio), o bundle do `prepare` com shebang e o core inlinado, o `npm pack --dry-run` listando o `dist/main.js`, o `npm pack` mais `npm install -g --prefix` num prefixo temporário com `study --help` de um cwd estranho, o shim `node_modules/.bin/study` do dev loop e o `README.md` documentando `npm install -g`/`npm uninstall -g`. O nome escopado e o `publishConfig` vêm do ADR Nome publicado do CLI sob o escopo `@bosi-programming`: o registry recusou o `study-cli` sem escopo como parecido demais com o `studycli` existente.
- `S-29`..`S-33` nasceram do BOS-47 (ENG-22): pinam os documentos das fases 2 a 5 — o índice e a versão de `docs/README.md`, o molde e a cobertura de `RF-01`..`RF-25` do `WEB.md`, os requisitos do `PILOTO.md`, a reconciliação de BOS-41..BOS-45 no `INVENTARIO-DE-REQUISITOS.md` (com a herança de telas do desktop e o `expo-sqlite` do mobile) e as faixas `W`/`P`/`M`/`D` da seção `## Casos por camada`.
- `S-34`..`S-43` nasceram do BOS-41 (ENG-16), o scaffold do `apps/web`: o membro `@study/web` (`S-34`: manifesto privado, script `typecheck` e glob `apps/*`), o consumo de `@study/core`/`@study/golden` pelo `src` sem cópia e com o `dist` fora do versionamento (`S-35`), o `tsconfig` herdado com `jsx: react-jsx` e resolução `bundler` (`S-36`), o projeto `web` no `vitest.config.ts` com jsdom, cinco projetos e as dependências de teste no lockfile (`S-37`), a direção das camadas do MVC por feature (`S-38`, em `apps/web/test/architecture.test.ts`) e o vetor `vencimento-inicial-por-dificuldade` computado pelo model e renderizado pela view (`S-39`, em `apps/web/test/due.test.tsx`) e a composição da raiz (`S-43`, em `apps/web/test/app.test.tsx`: monta o `App` sobre o `fake-indexeddb` e prova o shell e a fila, desde o BOS-43). Fecham o ADR Scaffold do `apps/web` aceito (`S-40`) e os docs do membro no `README.md` e no `AGENTS.md` (`S-41`), com o `S-42` pinando o título `S-01..S-61` e as faixas `W`/`P`/`M`/`D` intactas.
- `S-44`..`S-55` nasceram do BOS-58 (ENG-33) e do BOS-59 (ENG-34), o scaffold do `apps/desktop` e o bundle de produção do web dentro dele: o membro `@study/desktop` (`S-44`: manifesto privado, script `typecheck` e glob `apps/*`), as dependências `electron`/`playwright-core` pinadas no manifesto e no lockfile, sem `dist` versionado e sem cópia da regra (`S-45`), o `tsconfig` herdado com tipos de Node e sem DOM (`S-46`), o projeto `desktop` no `vitest.config.ts` com seis projetos e teto de 120s (`S-47`), o main que carrega o dev server por `STUDY_WEB_URL` e o bundle de produção por `study://app` (`S-48`), o preload CJS expondo só a ponte `studyDesktop` (`S-49`), o smoke `_electron` que builda o web e prova, sobre o bundle e sem dev server, a janela, a raiz React, o texto do core, a origem, os quatro stores do IndexedDB e a persistência em dois lançamentos, sem skip (`S-50`), a ausência de tela sob `apps/desktop` e de import do desktop no web (`S-51`), o ADR do scaffold aceito (`S-52`), os docs do membro no `README.md` e no `AGENTS.md` (`S-53`), o título `S-01..S-61` com o `D-02` coberto em parte (`S-54`) e o ADR da origem de carregamento de produção aceito (`S-55`, BOS-59).
- `S-56`..`S-61` nasceram do BOS-60 (ENG-35), o empacotamento assinado do desktop: a config do `electron-builder` com os três targets, o `extraResources` do bundle do web e o `files` do asar (`S-56`, em `apps/desktop/test/package-config.test.ts`), a versão de fonte única com `assertReleasableVersion` e a injeção por `extraMetadata.version` (`S-57`), o plano de assinatura por plataforma e o script GPG do AppImage (`S-58`), o workflow de release em matrix nativa, com artifacts e release draft na tag (`S-59`, em `tests/release.test.ts`), a guarda contra segredo em arquivos, scripts e workflow (`S-60`) e os dois ADRs de empacotamento e assinatura com o índice da pasta (`S-61`, em `tests/adr.test.ts`). A prova final de notarização e de SmartScreen exige os certificados reais e fica como verificação de release, fora do `pnpm test`.
- Reservados para não colidir com `T-01`..`T-27` (domínio) nem com `C-01`..`C-65` (a regra, no nível de unidade).
- Arquivos: `packages/core/test/core.test.ts`, `fixtures/golden/test/golden.test.ts`, `apps/cli/test/cli.test.ts`, `tests/scaffold.test.ts`, `apps/web/test/due.test.tsx` e `apps/web/test/architecture.test.ts` — 240 testes no total (BOS-29); o web entrou depois, na ENG-16.
- BOS-30 (ENG-5) acrescentou a suíte de persistência em `apps/cli/test/persistence/{schema,mapping,store}.test.ts` — 269 testes no total; ela roda no projeto `cli` do `vitest.config.ts` contra um SQLite real em diretório temporário.
- BOS-31 (ENG-6) acrescentou a suíte dos comandos de item — `apps/cli/test/commands/{add,edit,find,init,list,ref,remove,show}.test.ts` mais o `helpers.ts` que dá spawn no bin `study` com `--db` temporário e `--json` — e reescreveu `apps/cli/test/cli.test.ts` (o `S-06`/`S-07` deixam de pinar o banner e passam a pinar bin, uso, `--help` e `--db`), além de dois casos de `findItems(term, filter)` em `persistence/store.test.ts` (`findItems` com filtro). São 340 testes no total; o projeto `cli` sobe para 12 arquivos/102 casos e cobre `T-13`, `T-14`, `T-16`, `T-17`, `T-18`, `T-23`, `T-24` e `T-27`, mais o envelope `T-25` e a guarda de schema futuro do ADR Camada de persistência do CLI.
- BOS-39 (ENG-14) acrescentou os casos `S-21`/`S-22`: a suíte de scaffold sobe de 13 para 28 casos e o total vai a 355 testes.
- BOS-32 (ENG-7) acrescentou a suíte dos comandos de revisão e fila — `apps/cli/test/commands/{due,review,difficulty}.test.ts` (o `review.test.ts` traz também o caso in-process de ordem e aborto do check-in, com o prompt mockado), o parsing puro do prompt em `apps/cli/test/prompt.test.ts` e três casos de `dueItems(today, filter)` em `persistence/store.test.ts` (`dueItems` com filtro) —, ligou os vetores `T-11` e `T-20` à suíte do CLI pelo `@study/golden` (devDependency nova, Golden fixtures: formato e quem valida) rebaseados para o hoje real e levou o envelope de `cli.test.ts` a dez comandos. São 403 testes no total; o projeto `cli` sobe para 16 arquivos/150 casos e cobre `T-11`, `T-15`, `T-19` e `T-20`, estende `T-23` ao `review` e leva `T-25` aos três comandos novos.

### Suíte de regra no core (C-01..C-65)

- IDs `C-nn` são os casos de `packages/core/test/*.test.ts`: um por comportamento da regra, cada um rastreando o `T-nn` do plano e o `RF`/`RN`/`CA` que o originou.
- Detalham no nível de unidade os casos de domínio do plano (`T-01`..`T-05`, `T-12`, `T-16`, `T-18`, `T-20`, `T-21`) sem substituí-los: a CLI, o web, o mobile e o desktop continuam devendo seus próprios `T-nn`.
- `C-16` e `C-58`..`C-65` (BOS-29) são os casos que **leem os golden fixtures** em vez de repetir o vetor no teste: `C-16` (`T-02`), `C-58` (`T-01`), `C-59` (`T-03`), `C-60` (`T-04`), `C-61` (`T-05`), `C-62` (`T-11`), `C-63` (`T-12`), `C-64` (`T-20`) e `C-65` (`T-21`). Os outros `C-nn` seguem com o vetor escrito no próprio teste.
- `T-11` não tem casa no core: ordenar a fila é do CLI (`CORE.md`). O `C-62` prova que a ordem documentada em `CA-12` é a que as definições do core produzem, com um comparador local ao teste — atrasados primeiro (`isLate`), depois por vencimento, e o `id` como desempate.
- `C-56` e `C-57` nasceram do Tasting do BOS-28: datas malformadas falham igual em `compareDates`/`isLate`/`daysLate`/`isDue`, e `note`/`link` guardam o texto digitado (só o vazio vira `null`).

## Casos por camada (W, P, M, D)

As camadas novas usam faixas próprias de IDs, reservadas para não colidir com `T-nn` (domínio) nem com `C-nn` (a regra, no nível de unidade). Cada faixa é contígua e as specs das camadas referenciam `T` e `C` sem renumerar nenhum dos dois.

| Camada | Faixa | Ferramenta |
| --- | --- | --- |
| Web | `W-01..W-14` | Vitest + Testing Library |
| Piloto | `P-01..P-04` | Sentry + entrevistas semanais |
| Mobile | `M-01..M-05` | Jest + React Native Testing Library |
| Desktop | `D-01..D-03` | Playwright sobre Electron |

| ID | Caso | Requisito |
| --- | --- | --- |
| W-01 | Adicionar item com título, matéria e dificuldade | RF-01 |
| W-02 | Lista com filtro por matéria e status e busca por termo | RF-02, RF-24 |
| W-03 | Fila do dia com atrasados primeiro e resumo por matéria | RF-05, RF-07 |
| W-04 | Check-in recalcula o vencimento e pede a reavaliação | RF-08, RF-12 |
| W-05 | Histórico de check-ins e próximo vencimento | RF-06, RF-10 |
| W-06 | Arquivar e desarquivar tiram da fila e das contagens | RF-14, RF-15 |
| W-07 | Arquivo morto: migrar, listar, restaurar e purgar | RF-16, RF-17 |
| W-08 | Config da janela do arquivamento automático | RF-25 |
| W-09 | Export e import pela interface, sem duplicar (duas importações do mesmo arquivo) | RF-18, RF-19, RF-20 |
| W-10 | Stats: streak, contagens e check-ins do dia | RF-21, RF-22, RF-23 |
| W-11 | Persistência IndexedDB e fila com 5.000 itens abaixo de 200ms | RNF-03, RNF-04 |
| W-12 | Estados das telas: vazio, carregando, offline e erro | RNF-01 |
| W-13 | Strings pt-BR centralizadas num módulo único | RNF-06 |
| W-14 | Editar e remover item, com confirmação | RF-03, RF-04 |
| P-01 | Aviso LGPD e consentimento | RNF-05 |
| P-02 | Eventos do Sentry sem PII | RNF-05 |
| P-03 | Roteiro de entrevista semanal | PRD — piloto |
| P-04 | Retenção >= 50% na 2ª semana | PRD — métricas |
| M-01 | Spike de fila no emulador e no device | ROADMAP — Fase 4 |
| M-02 | Persistência `expo-sqlite` no schema canônico | MODELO-DE-DADOS — SQLite |
| M-03 | Telas do web no mobile | RF-01, RF-05, RF-08, RF-14 |
| M-04 | Notificações locais de revisão | ROADMAP — Fase 4 |
| M-05 | EAS Build, TestFlight e faixa interna | Ordem de construção com gates |
| D-01 | Empacotamento dmg, nsis e AppImage | ROADMAP — Fase 5 |
| D-02 | Smoke de abertura e dos fluxos principais | ROADMAP — Fase 5 |
| D-03 | Paridade com as telas do web | Desktop com Electron reaproveitando o web |

Os `RF-nn` de tela do web continuam com a fonte em `REQUISITOS.md` e o comportamento em `WEB.md`; as linhas acima são o vínculo do caso ao requisito, não uma segunda lista de requisitos.

### Detalhe do W-11

Os 25 casos `W-11.1`..`W-11.25` desmembram a persistência IndexedDB do web em unidade: o schema pinado ao documento, o round-trip por entidade, a fila com 5.000 itens, a ausência de rede e a falha alta nas bordas. Todos rodam no projeto `web` do `vitest.config.ts`, em `apps/web/test/store/**`, com um `IdbEnvironment` de `fake-indexeddb` injetado por teste — nenhum toca rede.

| Caso | O que prova | Arquivo |
| --- | --- | --- |
| W-11.1 | Abrir um banco novo cria os quatro stores com os `keyPath` e índices do documento e semeia `meta.schema_version = '1'` | `apps/web/test/store/schema.test.ts` |
| W-11.2 | A tabela `## IndexedDB (web e desktop)` do `MODELO-DE-DADOS.md` é lida e reprova a divergência de `IDB_SCHEMA` | `apps/web/test/store/schema.test.ts` |
| W-11.3 | `itemToRow`/`rowToItem` preservam todos os campos, incluindo `note`/`link` nulos e preenchidos | `apps/web/test/store/mapping.test.ts` |
| W-11.4 | `late` é gravado como 1/0 na linha e lido como boolean na entidade, nas duas direções | `apps/web/test/store/mapping.test.ts` |
| W-11.5 | `title_key`/`subject_key` saem da mesma normalização do core (`titleKey`/`subjectKey`) | `apps/web/test/store/mapping.test.ts` |
| W-11.6 | `saveItem`/`getItem` e `saveReviewLog`/`listReviewLogs` fazem round-trip por entidade | `apps/web/test/store/store.test.ts` |
| W-11.7 | Num banco novo `schemaVersion()` devolve 1 e `setMeta`/`getMeta` faz round-trip de outra chave | `apps/web/test/store/store.test.ts` |
| W-11.8 | `dueItems` é só ativo com `due_date <= today` ordenado `due_date, id`; `listItems` filtra por status/matéria; `countItems` conta ativos | `apps/web/test/store/queue.test.ts` |
| W-11.9 | Com 5.000 itens (vencidos, de hoje, futuros e arquivados) a fila devolve exatamente o conjunto vencido, na ordem | `apps/web/test/store/queue.test.ts` |
| W-11.10 | `pnpm bench:web` mede a mediana de `dueItems` com 5.000 itens e sai 1 acima dos 200ms (`manual`) | `scripts/bench-web.ts` |
| W-11.11 | `src/store/**` não cita API de rede nem DOM, não importa react/react-dom e não alcança `features/*` | `apps/web/test/architecture.test.ts` |
| W-11.12 | `rowToReviewLog` lança quando `late` não é 0 nem 1 | `apps/web/test/store/mapping.test.ts` |
| W-11.13 | `rowToItem` lança `InvalidDifficultyError` para dificuldade fora de 1–5 | `apps/web/test/store/mapping.test.ts` |
| W-11.14 | `rowToItem` lança para `status` fora de `active\|archived\|cold` | `apps/web/test/store/mapping.test.ts` |
| W-11.15 | `browserIdb()` lança `IndexedDbUnavailableError` com mensagem clara sem `globalThis.indexedDB` | `apps/web/test/store/store.test.ts` |
| W-11.16 | `openStore` rejeita banco com `schema_version` ≠ 1, store faltando ou índice a mais | `apps/web/test/store/schema.test.ts` |
| W-11.17 | `transaction` commita item + log juntos, desfaz os dois quando o corpo falha e recusa aninhamento | `apps/web/test/store/store.test.ts` |
| W-11.18 | `deleteItem` remove o item e os `review_logs` dele, sem tocar nos de outro item | `apps/web/test/store/store.test.ts` |
| W-11.19 | `listColdArchive` ordena por `cold_archived_at, id`, o purge remove a entrada e o restore devolve o item a ativo | `apps/web/test/store/store.test.ts` |
| W-11.20 | `listReviewLogs(itemId)` devolve só os logs do item ordenados `reviewed_at, id`; sem argumento, todos | `apps/web/test/store/store.test.ts` |
| W-11.21 | `browserIdb()` lança `IndexedDbUnavailableError` sem `globalThis.IDBKeyRange`, com o factory presente | `apps/web/test/store/store.test.ts` |
| W-11.22 | Fechar a view de dentro da transação é recusado com mensagem própria | `apps/web/test/store/store.test.ts` |
| W-11.23 | A requisição pendente rejeita (`AbortError`) quando a transação aborta | `apps/web/test/store/store.test.ts` |
| W-11.24 | `openStore` rejeita banco com `keyPath` divergente num store | `apps/web/test/store/schema.test.ts` |
| W-11.25 | Fora do `idb.ts`, nenhum arquivo do store lê `globalThis` nem `performance` | `apps/web/test/architecture.test.ts` |

### Detalhe das telas do web (BOS-43)

As seis telas do BOS-43 são teste de comportamento no projeto `web`, montando o `App` sobre o `fake-indexeddb` (a view também é montada direto para o estado de carregando). Cada `W-nn` abaixo fecha na suíte que o `VERIFICACAO-FASE-2.md` registra; `W-05` (histórico no detalhe) e `W-14` (editar e remover) seguem abertos, e `W-07`..`W-09` (arquivo morto, config e export/import) ficam com o BOS-44.

- `W-01` (adicionar) — `apps/web/test/features/add.test.tsx`: cria o item com título, matéria e dificuldade, mostra o vencimento inicial do core e recusa campo fora da invariante com a mensagem por campo.
- `W-02` (lista) — `apps/web/test/features/items.test.tsx`: filtra por matéria e status (ativo por padrão), ordena por vencimento e busca por termo sem caixa e sem acento.
- `W-03` (fila) — `apps/web/test/features/queue.test.tsx`: atrasados primeiro, o atraso em dias ou o próximo vencimento por item, e o resumo de hoje, atrasados e por matéria.
- `W-04` (check-in) — `apps/web/test/features/review.test.tsx`: o check-in recalcula o vencimento pelo core, grava item e log na mesma transação e pede a reavaliação com a atual como padrão; manter não escreve e item não ativo é recusado.
- `W-06` (ciclo de vida) — `apps/web/test/features/itemDetail.test.tsx` e `packages/core/test/lifecycle.test.ts`: arquivar e desarquivar tiram e devolvem o item à fila e às contagens, e a transição repetida é recusada.
- `W-10` (stats) — `apps/web/test/features/stats.test.tsx`: o streak de fila zerada, as contagens por status e os check-ins do dia pela data local.
- `W-12` (estados) — `apps/web/test/features/*.test.tsx`, `apps/web/test/app.test.tsx` e `apps/web/test/main.test.tsx`: vazio, carregando e erro nas telas de leitura, carregando e erro no formulário de adicionar e na abertura do `main.tsx`, com a mensagem pt-BR da tabela de erros e sem stack nem `kind` cru; o offline é satisfeito por construção, com a varredura de `src/**` recusando API de rede.
- `W-13` (strings) — `apps/web/test/strings.test.ts`: não há literal pt-BR fora de `apps/web/src/strings.ts`, com a varredura cobrindo `src/**`.

O shell tem suíte própria: `apps/web/test/routing.test.ts` prova o `parseHash`/`hrefFor` das seis rotas e `apps/web/test/app.test.tsx` prova a montagem, a navegação por hash e a queda na fila com hash desconhecido.

## Rastreabilidade

Requisitos que não tinham caso em T-01..T-12:

| RF | Caso |
| --- | --- |
| RF-02 (listar com filtro) | T-27 |
| RF-03 (editar) | T-13 |
| RF-04 (remover) | T-14 |
| RF-06 (próximo vencimento) | T-16 |
| RF-07 (resumo por matéria) | T-15 |
| RF-10 (histórico) | T-16 |
| RF-11 (reavaliação manual) | T-04 |
| RF-21 (streak) | T-21 |
| RF-22 (contagens) | T-21 |
| RF-23 (check-ins do dia) | T-21 |
| RF-24 (busca por título) | T-17 |
| RF-25 (janela configurável) | T-22 |

## Testes de dados

- Round-trip JSON: export → import → export produz o mesmo conteúdo.
- Migração: schema v1 importado em banco vazio e em banco com dados.
- Conflito: mesmo UUID com `updated_at` diferentes; vence o mais recente.
- Banco corrompido: export continua possível quando o arquivo-fonte existe.

## Testes de plataforma

- CLI: snapshot de `--json` por comando; exit codes da tabela de erros; refs por UUID, prefixo e título; prompts desligados em `--json` e stdin não-TTY.
- Web: fluxo adicionar → fila → check-in → arquivar em um teste de integração.
- Mobile: Jest + RNTL consome `fixtures/golden` pelo core; UI mínima fora da fase 4.
- Desktop: roda os fluxos do web dentro do Electron + smoke de empacotamento.

## Execução

Hoje (BOS-37, ENG-12 — a rastreabilidade dos casos, o bench real e o registro do DoD, sobre as ENG-5 a ENG-11 e o CI da BOS-39/ENG-14):

- `pnpm test` roda os 6 projetos do `vitest.config.ts` — core, golden, cli, web, desktop e scaffold. O projeto `desktop` roda o smoke do Electron (`apps/desktop/test/`): builda o web e lança a janela real pelo `_electron` sobre o bundle servido em `study://app`, sem dev server, provando abertura, raiz React, texto do core, ponte do preload, `nodeIntegration` desligado, os quatro stores do IndexedDB e a persistência de um item em dois lançamentos; o smoke pela origem do dev server (`STUDY_WEB_URL`, que tem precedência sobre `STUDY_WEB_DIST`) vive em `apps/desktop/test/dev-server.test.ts`. O projeto `web` roda em jsdom (`apps/web/test/`): as telas do BOS-43 montando o `App` sobre o `fake-indexeddb` (rotas, features, app e a varredura de strings), o vetor golden da feature `due` e a varredura da direção das camadas. O projeto `cli` inclui a suíte de persistência (`apps/cli/test/persistence/`): DDL canônico + PRAGMAs, mapeamento linha↔entidade (chaves derivadas, `late` 0/1 ↔ boolean, falha alta fora do domínio), round-trips, FK e CASCADE, fila da RNF-03, transações com rollback, meta e arquivo morto. A ENG-6 acrescentou a suíte dos sete comandos de item (`apps/cli/test/commands/`), que dá spawn no bin com `--db` temporário e `--json` e prova exit code, canal e payload de cada caso.
- A ENG-7 acrescentou a suíte dos três comandos de revisão e fila (`apps/cli/test/commands/{due,review,difficulty}.test.ts`), o parsing puro do prompt em `apps/cli/test/prompt.test.ts` e o caso de ordem/aborto do check-in in-process com o prompt mockado. Os vetores T-11 e T-20 entram pelo `@study/golden`, que passou a ser devDependency do CLI (Golden fixtures: formato e quem valida), rebaseados para o hoje real; os três comandos também entram no caso de envelope do `cli.test.ts`.
- A ENG-8 acrescentou a suíte do ciclo de vida e do arquivo morto (`apps/cli/test/commands/{archive,migration,cold,config}.test.ts`): a máquina de estados de `archive`/`unarchive` e o beco do ADR Item não ativo é legível e editável, o gancho de migração pelas portas que abrem banco (e pelas que não abrem), o predicado estritamente maior em data local (CA-09/CA-19), o snapshot em `cold_archive`, o export automático antes da migração (caminho padrão, `--export-dir`, colisão do dia e a falha que não migra), `cold list`/`restore`/`purge` e a janela de `config`. A base de data local (`localDateOf`) vive no CLI (`apps/cli/src/deps.ts`, provada em `apps/cli/test/local-date.test.ts`), porque o `CORE.md` proíbe fuso horário dentro do core.
- A ENG-9 acrescentou a suíte do export/import (`apps/cli/test/commands/{export,import}.test.ts`) e a leitura do dump in-process (`apps/cli/test/output/json.test.ts`): o round-trip T-09 (export → import num banco vazio → export, com `exported_at` normalizado) com ativos, arquivados, arquivo morto e histórico, a idempotência do T-10 pela segunda rodada com `written: 0`, o conflito por `updated_at` nos dois sentidos (inclusive `+00:00` contra `Z`), a recusa de `schema_version` futuro e a ordem da escada de migrações, o `review_log` órfão, o export sobre arquivo existente com e sem `--yes`, o banco corrompido e as duas isenções do ADR Export/import do JSON v1 (`export` fora do portão de schema e do gancho, `import` fora do gancho). O caso de envelope do `cli.test.ts` passou de dez para doze comandos.
- A ENG-10 acrescentou a suíte do gancho do streak e do `stats` (`apps/cli/test/streak-hook.test.ts` e `apps/cli/test/commands/stats.test.ts`): o vetor `streak-de-fila-zerada` do T-21 rebaseado para o hoje real e dirigido par a par pelo gancho, as três isenções (`export`, `import` e `init`), a idempotência do mesmo dia, o carimbo depois de uma mutação que esvazia a fila, as contagens por status com o recorte do `-s`, os check-ins de hoje por dia local sem filtro de status e o total por matéria. O caso de envelope do `cli.test.ts` passou de doze para treze comandos, e o `config.test.ts` trocou a sentinela de "meta intacto" de `streak_current` para `locale`, porque o gancho agora carimba a chave legitimamente. São 540 testes no total.
- A ENG-11 não acrescentou comando: fechou e pinou o contrato de máquina. `apps/cli/test/error-table.test.ts` (novo) varre as 25 linhas da tabela de erros do `CLI.md` lendo as colunas `code`, `Exit` e `Mensagem` do próprio documento: asserta `code`, mensagem e exit de cada linha, e a mensagem com `<...>` casa a coluna do documento como template — é a varredura que impede documento e código de divergirem em silêncio; o stdout vazio de toda linha de erro fecha a varredura. O caso de envelope do `cli.test.ts` sobe de treze para as 17 palavras de comando (`archive`, `unarchive`, `cold` e `config` entram), ganha a forma do payload palavra a palavra e os casos de `study --json` sem comando, de `study` humano e de `--help --json`; o aborto do prompt é do `review.test.ts`, com `aborted` e exit 130 pelo `exitCodeFor`. O `prompt.test.ts` ganha os casos de `/dev/tty` com `node:fs` mockado — `openSync('/dev/tty','r')`, a leitura nesse fd e a queda para o fd 0 sem fechá-lo — e `add.test.ts` e `review.test.ts` fecham o prompt desligado por `--json`, `--no-input` e stdin não-TTY. São 566 testes no total; o projeto `cli` sobe de 26 para 27 arquivos e de 289 para 312 casos, o `T-25` passa a cobrir as 17 palavras e a tabela de erros inteira, e o `T-23` cobre os três modos fora de TTY. As quatro varreduras que dão spawn no bin (`envelope-dezessete`, `envelope-forma-por-comando`, `tabela-erros-vinte-cinco`, `tabela-erros-stdout-vazio`) levam `SPAWN_SWEEP_TIMEOUT_MS` (30s) no lugar do teto padrão de 5s do Vitest, que reprovou a primeira execução do PR #14 (`5da5099`) e passou na segunda (`accdb33`).
- A ENG-12 fechou a fase 1 ligando a suíte ao plano e medindo a fila. `apps/cli/test/traceability.test.ts` (novo) varre a tabela `## Casos obrigatórios` e a linha `CLI` da tabela `## Estratégia` do próprio plano: cada `T-nn` não `(manual)` e cada `RF-01`..`RF-20` precisa de token literal num arquivo de `apps/cli/test/**/*.test.ts` que dá spawn no bin, e o `(manual)` é lido do documento, não codificado (Rastreabilidade `T-nn` do CLI). Quatro lacunas de execução viraram caso pelo `runStudy` sobre os vetores rebaseados: `T-01` em `add.test.ts` (dificuldades 1–5), `T-02` (progressão ×2 até 365d) e `T-03` (atraso não penaliza) em `review.test.ts`, e `T-12` (normalização de matéria no `-s`) em `list.test.ts`; cinco lacunas de rótulo ganharam o token no `describe` que já existia (`T-04`, `T-05`, `T-07`, `T-19` e `RF-19`). A varredura exclui o próprio arquivo do conjunto de arquivos que dão spawn — sem isso o token `RF-01` do seu título a satisfaria sozinha —, então cada `RF-nn` fica ancorado num arquivo de caso real. O `scripts/bench.ts` deixa de ser stub: semeia a fila numa transação, spawna o bin com aquecimento e mediana de cinco rodadas, e o teto de `RNF-03` vira exit 1; o tamanho da fila e o orçamento aceitam `STUDY_BENCH_QUEUE_SIZE`/`STUDY_BENCH_BUDGET_MS` para o teste exercitar a reprovação e a guarda de tamanho sem esperar uma máquina lenta. O `docs/engenharia/VERIFICACAO-FASE-1.md` (novo, indexado no `docs/README.md`) registra o Definition of done do `ROADMAP.md`, o `T-26` e a contagem por projeto da rodada de `pnpm test`. São 582 testes no total; o projeto `cli` sobe para 28 arquivos e o scaffold para 48 casos.
- `pnpm test:golden` roda só o projeto golden.
- `pnpm typecheck` roda `tsc --noEmit` nos cinco pacotes mais o tsconfig da raiz; é o único gate que prova a pureza do core (CA-3) e o `strict` compartilhado (CA-5), porque o Vitest não checa tipos.
- `pnpm lint` roda o ESLint em flat config sobre todo o TS do repositório — `packages/*`, `apps/*`, `fixtures/*` (src e test), `tests/`, `scripts/` e os TS da raiz —, ignorando `node_modules`, `coverage`, `recipes` e `.scratch` (CI com lint, typecheck e testes nas PRs).
- `pnpm bench` mede a RNF-03 de ponta a ponta: semeia 5.000 itens num banco temporário pela camada de persistência, dá spawn em `study due --json` com rodadas de aquecimento e de medida, reporta a mediana e sai 1 acima dos 200ms do `REQUISITOS.md` (Rastreabilidade `T-nn` do CLI). É verificação manual da fase 1, fora do CI.
- `pnpm sqlite:probe` prova o schema canônico no engine do CLI (Engine SQLite do CLI) e passou a re-exportar `SCHEMA_SQL` da camada (`apps/cli/src/persistence/schema.ts`, Camada de persistência do CLI): uma cópia canônica no código, e o `S-14` continua pinando a mesma ligação ao bloco SQL de `MODELO-DE-DADOS.md`.
- `pnpm test:coverage` mede as linhas de `packages/core/src` com o provider v8 e falha abaixo de 90% (`thresholds.lines` no `vitest.config.ts`); em 2026-09-24 reporta 100% (128/128), inalterado pelas ENG-5 a ENG-11 (nenhuma delas acrescentou linha ao core).
- O CI (`.github/workflows/ci.yml`, CI com lint, typecheck e testes nas PRs) roda `pnpm lint`, `pnpm typecheck` e `pnpm test` em passos separados a cada PR para `main`, em `ubuntu-latest` com Node 24 e `pnpm install --frozen-lockfile`. São os mesmos comandos de raiz rodados local, então o resultado local é o do CI.
- A paleta da saída humana (Cores da saída humana do CLI) não muda o texto: os escapes são decoração. `apps/cli/test/output/color.test.ts` (novo) pina a decisão de ligar e desligar (`TTY`, `--json`, `--no-color`, `NO_COLOR`, `FORCE_COLOR`, `TERM=dumb`) e, com `FORCE_COLOR=1`, os tons do `due` (âmbar no atrasado, verde no hoje) e do `review`; o `runStudy` de `apps/cli/test/commands/helpers.ts` passa a fixar `NO_COLOR=1` e `FORCE_COLOR` vazio no env, para que o texto comparado pelos outros arquivos não dependa do terminal de quem roda `pnpm test`. O `tests/scaffold.test.ts` ganha o `scaffold-adr-paleta`, que liga o `--no-color` e a paleta do `color.ts`.

Alvo da fase 1:

- `pnpm test` inclui o web na fase 2; mobile e desktop entram nas fases 4 e 5.
- `pnpm bench` gera 5.000 itens e mede `study due --json` (RNF-03); é verificação manual da fase 1, não gate de CI.
- CI: ativo desde a ENG-14 (BOS-39); o check `ci` é a verificação padrão antes do merge e passa a ser exigido para `main` por branch protection.

## Fora do plano V1

- Testes de carga, acessibilidade automatizada, visual regression, testes de App Store.
