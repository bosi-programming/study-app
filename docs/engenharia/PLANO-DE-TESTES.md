# Plano de Testes — App de Estudo Espaçado

Versão: 3 | Data: 2026-09-12 | Base: `docs/especificacao/REQUISITOS.md`

## Estratégia

- A regra de agendamento é o ativo crítico; ela concentra os testes.
- Golden fixtures são a fonte única de verdade da regra para todos os apps TS: CLI, web, mobile e desktop comparam contra elas, e o runner do core (`packages/core/test/golden.test.ts`) também. A suíte `C-nn` do core continua repetindo alguns desses vetores no nível de unidade — de propósito, e sem substituir os `T-nn`.
- UI testada por comportamento essencial, sem perseguir cobertura.

| Camada | Ferramenta | Meta |
| --- | --- | --- |
| `packages/core` | Vitest | >= 90% de linhas |
| CLI | Vitest + execução do binário com `--json` | fluxos dos RF-01..RF-20 |
| Web | Vitest + Testing Library | adicionar, fila, check-in, arquivar |
| Mobile | Jest + React Native Testing Library | mesmos fluxos, lendo `fixtures/golden` via core |
| Desktop | Playwright sobre Electron + testes do web | abertura e fluxos principais |

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
- Quem compara: `packages/core/test/golden.test.ts` lê os vetores e compara com o que a regra produz. O arquivo executa no projeto `golden`, então `pnpm test:golden` valida a forma dos fixtures e os vetores de uma vez e falha quando um `expected` diverge (ADR-015).

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

### Suíte de scaffold (S-01..S-22)

- IDs `S-nn` cobrem a fiação do repo, não a regra: pureza e resolução do core (`S-01`, `S-02`, `S-16`), forma, unicidade e cobertura da fixture (`S-03`..`S-05`, `S-18`), bin do CLI (`S-06`, `S-07`), membros, tsconfig, dependências e scripts do workspace (`S-08`..`S-12`), o engine SQLite (`S-13`..`S-15`: probe executável, DDL acoplado ao doc e recusa de dependência nativa), a organização dos docs (`S-17`: índice de ADRs) e a automação do repositório (`S-21`, `S-22`: workflow de CI e gate de lint).
- `S-16` fecha o outro lado do `S-01`: além dos imports proibidos, nenhum arquivo de `packages/core/src` pode ler relógio ou aleatoriedade do ambiente (`Date.now`, `new Date()` sem argumentos, `Math.random`, `crypto`, `performance.now`) — tempo e ids vêm só de `deps`. Nasceu do Tasting do BOS-28; era `S-13` no ramo e ficou com o id livre depois que o probe do BOS-27 tomou `S-13`..`S-15`.
- `S-17` é o caso novo deste PR: todo arquivo de `docs/adr/` é linkado pelo índice e todo link do índice resolve.
- `S-18`..`S-20` nasceram do BOS-29: o `S-18` exige um fixture para cada `T-nn` obrigatório do plano, e exige que todo `kind` do union tenha caso; o `S-19` pina o script `test:coverage`, o provider v8 e o threshold de linhas do core; o `S-20` pina o runner dos vetores no projeto `golden` e fora do projeto `core`, que é o que mantém `pnpm test:golden` como gate de divergência.
- `S-21` e `S-22` nasceram do BOS-39 (ENG-14). O `S-21` pina o workflow de CI: disparo em `pull_request` com base `main` (nunca `pull_request_target`), `actions/checkout`, `pnpm/action-setup` lendo o `packageManager`, Node 24 com cache de pnpm, `pnpm install --frozen-lockfile`, um passo por gate, permissão `contents` na forma de bloco e nenhum segredo — é o que deixa um PR de fork rodar. O `S-22` pina o gate de lint: `eslint .` na raiz, dependências só na raiz, ignore de `node_modules`, `coverage`, `recipes` e `.scratch`, zero erro e zero aviso nos diretórios do workspace, nenhuma supressão deixada para trás, as dependências no lockfile, a menção no `README.md` e no `AGENTS.md`, e a contagem de ADRs do `docs/README.md` em sincronia com os arquivos do índice.
- Reservados para não colidir com `T-01`..`T-27` (domínio) nem com `C-01`..`C-65` (a regra, no nível de unidade).
- Arquivos: `packages/core/test/core.test.ts`, `fixtures/golden/test/golden.test.ts`, `apps/cli/test/cli.test.ts` e `tests/scaffold.test.ts` — 240 testes no total (BOS-29).
- BOS-30 (ENG-5) acrescentou a suíte de persistência em `apps/cli/test/persistence/{schema,mapping,store}.test.ts` — 269 testes no total; ela roda no projeto `cli` do `vitest.config.ts` contra um SQLite real em diretório temporário.
- BOS-31 (ENG-6) acrescentou a suíte dos comandos de item — `apps/cli/test/commands/{add,edit,find,init,list,ref,remove,show}.test.ts` mais o `helpers.ts` que dá spawn no bin `study` com `--db` temporário e `--json` — e reescreveu `apps/cli/test/cli.test.ts` (o `S-06`/`S-07` deixam de pinar o banner e passam a pinar bin, uso, `--help` e `--db`), além de dois casos de `findItems(term, filter)` em `persistence/store.test.ts` (ADR-018). São 340 testes no total; o projeto `cli` sobe para 12 arquivos/102 casos e cobre `T-13`, `T-14`, `T-16`, `T-17`, `T-18`, `T-23`, `T-24` e `T-27`, mais o envelope `T-25` e a guarda de schema futuro do ADR-016.
- BOS-39 (ENG-14) acrescentou os casos `S-21`/`S-22`: a suíte de scaffold sobe de 13 para 28 casos e o total vai a 355 testes.
- BOS-32 (ENG-7) acrescentou a suíte dos comandos de revisão e fila — `apps/cli/test/commands/{due,review,difficulty}.test.ts` (o `review.test.ts` traz também o caso in-process de ordem e aborto do check-in, com o prompt mockado), o parsing puro do prompt em `apps/cli/test/prompt.test.ts` e três casos de `dueItems(today, filter)` em `persistence/store.test.ts` (ADR-020) —, ligou os vetores `T-11` e `T-20` à suíte do CLI pelo `@study/golden` (devDependency nova, ADR-015) rebaseados para o hoje real e levou o envelope de `cli.test.ts` a dez comandos. São 403 testes no total; o projeto `cli` sobe para 16 arquivos/150 casos e cobre `T-11`, `T-15`, `T-19` e `T-20`, estende `T-23` ao `review` e leva `T-25` aos três comandos novos.

### Suíte de regra no core (C-01..C-65)

- IDs `C-nn` são os casos de `packages/core/test/*.test.ts`: um por comportamento da regra, cada um rastreando o `T-nn` do plano e o `RF`/`RN`/`CA` que o originou.
- Detalham no nível de unidade os casos de domínio do plano (`T-01`..`T-05`, `T-12`, `T-16`, `T-18`, `T-20`, `T-21`) sem substituí-los: a CLI, o web, o mobile e o desktop continuam devendo seus próprios `T-nn`.
- `C-16` e `C-58`..`C-65` (BOS-29) são os casos que **leem os golden fixtures** em vez de repetir o vetor no teste: `C-16` (`T-02`), `C-58` (`T-01`), `C-59` (`T-03`), `C-60` (`T-04`), `C-61` (`T-05`), `C-62` (`T-11`), `C-63` (`T-12`), `C-64` (`T-20`) e `C-65` (`T-21`). Os outros `C-nn` seguem com o vetor escrito no próprio teste.
- `T-11` não tem casa no core: ordenar a fila é do CLI (`CORE.md`). O `C-62` prova que a ordem documentada em `CA-12` é a que as definições do core produzem, com um comparador local ao teste — atrasados primeiro (`isLate`), depois por vencimento, e o `id` como desempate.
- `C-56` e `C-57` nasceram do Tasting do BOS-28: datas malformadas falham igual em `compareDates`/`isLate`/`daysLate`/`isDue`, e `note`/`link` guardam o texto digitado (só o vazio vira `null`).

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

- `pnpm test` roda os 4 projetos do `vitest.config.ts` — core, golden, cli e scaffold. O projeto `cli` inclui a suíte de persistência (`apps/cli/test/persistence/`): DDL canônico + PRAGMAs, mapeamento linha↔entidade (chaves derivadas, `late` 0/1 ↔ boolean, falha alta fora do domínio), round-trips, FK e CASCADE, fila da RNF-03, transações com rollback, meta e arquivo morto. A ENG-6 acrescentou a suíte dos sete comandos de item (`apps/cli/test/commands/`), que dá spawn no bin com `--db` temporário e `--json` e prova exit code, canal e payload de cada caso.
- A ENG-7 acrescentou a suíte dos três comandos de revisão e fila (`apps/cli/test/commands/{due,review,difficulty}.test.ts`), o parsing puro do prompt em `apps/cli/test/prompt.test.ts` e o caso de ordem/aborto do check-in in-process com o prompt mockado. Os vetores T-11 e T-20 entram pelo `@study/golden`, que passou a ser devDependency do CLI (ADR-015), rebaseados para o hoje real; os três comandos também entram no caso de envelope do `cli.test.ts`.
- A ENG-8 acrescentou a suíte do ciclo de vida e do arquivo morto (`apps/cli/test/commands/{archive,migration,cold,config}.test.ts`): a máquina de estados de `archive`/`unarchive` e o beco do ADR-019, o gancho de migração pelas portas que abrem banco (e pelas que não abrem), o predicado estritamente maior em data local (CA-09/CA-19), o snapshot em `cold_archive`, o export automático antes da migração (caminho padrão, `--export-dir`, colisão do dia e a falha que não migra), `cold list`/`restore`/`purge` e a janela de `config`. A base de data local (`localDateOf`) vive no CLI (`apps/cli/src/deps.ts`, provada em `apps/cli/test/local-date.test.ts`), porque o `CORE.md` proíbe fuso horário dentro do core.
- A ENG-9 acrescentou a suíte do export/import (`apps/cli/test/commands/{export,import}.test.ts`) e a leitura do dump in-process (`apps/cli/test/output/json.test.ts`): o round-trip T-09 (export → import num banco vazio → export, com `exported_at` normalizado) com ativos, arquivados, arquivo morto e histórico, a idempotência do T-10 pela segunda rodada com `written: 0`, o conflito por `updated_at` nos dois sentidos (inclusive `+00:00` contra `Z`), a recusa de `schema_version` futuro e a ordem da escada de migrações, o `review_log` órfão, o export sobre arquivo existente com e sem `--yes`, o banco corrompido e as duas isenções do ADR-022 (`export` fora do portão de schema e do gancho, `import` fora do gancho). O caso de envelope do `cli.test.ts` passou de dez para doze comandos.
- A ENG-10 acrescentou a suíte do gancho do streak e do `stats` (`apps/cli/test/streak-hook.test.ts` e `apps/cli/test/commands/stats.test.ts`): o vetor `streak-de-fila-zerada` do T-21 rebaseado para o hoje real e dirigido par a par pelo gancho, as três isenções (`export`, `import` e `init`), a idempotência do mesmo dia, o carimbo depois de uma mutação que esvazia a fila, as contagens por status com o recorte do `-s`, os check-ins de hoje por dia local sem filtro de status e o total por matéria. O caso de envelope do `cli.test.ts` passou de doze para treze comandos, e o `config.test.ts` trocou a sentinela de "meta intacto" de `streak_current` para `locale`, porque o gancho agora carimba a chave legitimamente. São 540 testes no total.
- A ENG-11 não acrescentou comando: fechou e pinou o contrato de máquina. `apps/cli/test/error-table.test.ts` (novo) varre as 25 linhas da tabela de erros do `CLI.md` lendo as colunas `code`, `Exit` e `Mensagem` do próprio documento: asserta `code`, mensagem e exit de cada linha, e a mensagem com `<...>` casa a coluna do documento como template — é a varredura que impede documento e código de divergirem em silêncio; o stdout vazio de toda linha de erro fecha a varredura. O caso de envelope do `cli.test.ts` sobe de treze para as 17 palavras de comando (`archive`, `unarchive`, `cold` e `config` entram), ganha a forma do payload palavra a palavra e os casos de `study --json` sem comando, de `study` humano e de `--help --json`; o aborto do prompt é do `review.test.ts`, com `aborted` e exit 130 pelo `exitCodeFor`. O `prompt.test.ts` ganha os casos de `/dev/tty` com `node:fs` mockado — `openSync('/dev/tty','r')`, a leitura nesse fd e a queda para o fd 0 sem fechá-lo — e `add.test.ts` e `review.test.ts` fecham o prompt desligado por `--json`, `--no-input` e stdin não-TTY. São 566 testes no total; o projeto `cli` sobe de 26 para 27 arquivos e de 289 para 312 casos, o `T-25` passa a cobrir as 17 palavras e a tabela de erros inteira, e o `T-23` cobre os três modos fora de TTY. As quatro varreduras que dão spawn no bin (`envelope-dezessete`, `envelope-forma-por-comando`, `tabela-erros-vinte-cinco`, `tabela-erros-stdout-vazio`) levam `SPAWN_SWEEP_TIMEOUT_MS` (30s) no lugar do teto padrão de 5s do Vitest, que reprovou a primeira execução do PR #14 (`5da5099`) e passou na segunda (`accdb33`).
- A ENG-12 fechou a fase 1 ligando a suíte ao plano e medindo a fila. `apps/cli/test/traceability.test.ts` (novo) varre a tabela `## Casos obrigatórios` e a linha `CLI` da tabela `## Estratégia` do próprio plano: cada `T-nn` não `(manual)` e cada `RF-01`..`RF-20` precisa de token literal num arquivo de `apps/cli/test/**/*.test.ts` que dá spawn no bin, e o `(manual)` é lido do documento, não codificado (ADR-025). Quatro lacunas de execução viraram caso pelo `runStudy` sobre os vetores rebaseados: `T-01` em `add.test.ts` (dificuldades 1–5), `T-02` (progressão ×2 até 365d) e `T-03` (atraso não penaliza) em `review.test.ts`, e `T-12` (normalização de matéria no `-s`) em `list.test.ts`; cinco lacunas de rótulo ganharam o token no `describe` que já existia (`T-04`, `T-05`, `T-07`, `T-19` e `RF-19`). O `docs/engenharia/VERIFICACAO-FASE-1.md` (novo, indexado no `docs/README.md`) registra o Definition of done do `ROADMAP.md`, o `T-26` e a contagem por projeto da rodada de `pnpm test`. São 579 testes no total; o projeto `cli` sobe para 28 arquivos e o scaffold para 45 casos.
- `pnpm test:golden` roda só o projeto golden.
- `pnpm typecheck` roda `tsc --noEmit` nos três pacotes mais o tsconfig da raiz; é o único gate que prova a pureza do core (CA-3) e o `strict` compartilhado (CA-5), porque o Vitest não checa tipos.
- `pnpm lint` roda o ESLint em flat config sobre todo o TS do repositório — `packages/*`, `apps/*`, `fixtures/*` (src e test), `tests/`, `scripts/` e os TS da raiz —, ignorando `node_modules`, `coverage`, `recipes` e `.scratch` (ADR-017).
- `pnpm bench` mede a RNF-03 de ponta a ponta: semeia 5.000 itens num banco temporário pela camada de persistência, dá spawn em `study due --json` com rodadas de aquecimento e de medida, reporta a mediana e sai 1 acima dos 200ms do `REQUISITOS.md` (ADR-025). É verificação manual da fase 1, fora do CI.
- `pnpm sqlite:probe` prova o schema canônico no engine do CLI (ADR-014) e passou a re-exportar `SCHEMA_SQL` da camada (`apps/cli/src/persistence/schema.ts`, ADR-016): uma cópia canônica no código, e o `S-14` continua pinando a mesma ligação ao bloco SQL de `MODELO-DE-DADOS.md`.
- `pnpm test:coverage` mede as linhas de `packages/core/src` com o provider v8 e falha abaixo de 90% (`thresholds.lines` no `vitest.config.ts`); em 2026-09-24 reporta 100% (128/128), inalterado pelas ENG-5 a ENG-11 (nenhuma delas acrescentou linha ao core).
- O CI (`.github/workflows/ci.yml`, ADR-017) roda `pnpm lint`, `pnpm typecheck` e `pnpm test` em passos separados a cada PR para `main`, em `ubuntu-latest` com Node 24 e `pnpm install --frozen-lockfile`. São os mesmos comandos de raiz rodados local, então o resultado local é o do CI.

Alvo da fase 1:

- `pnpm test` inclui o web na fase 2; mobile e desktop entram nas fases 4 e 5.
- `pnpm bench` gera 5.000 itens e mede `study due --json` (RNF-03); é verificação manual da fase 1, não gate de CI.
- CI: ativo desde a ENG-14 (BOS-39); o check `ci` é a verificação padrão antes do merge e passa a ser exigido para `main` por branch protection.

## Fora do plano V1

- Testes de carga, acessibilidade automatizada, visual regression, testes de App Store.
