# Registro de Decisões (ADRs)

Data: 2026-09-09 | Atualizado: 2026-09-20 | Base: `FEASIBILITY.md` e sessão de grill

## ADR-001 — Core TS compartilhado por CLI, web, mobile e desktop

- Contexto: CLI e web já são TypeScript; mobile (iOS + Android) e desktop precisam reusar o mesmo domínio.
- Decisão: `packages/core` em TS puro, consumido por CLI, web, React Native (Expo) e desktop (Electron); sem reimplementação em outra linguagem.
- Conformidade: golden fixtures em `fixtures/golden` como vetores de regressão de todos os apps; `packages/core` sem APIs de Node ou browser.
- Consequência: uma implementação da regra; divergência vira bug de integração, não de paridade de algoritmo.
- Supersede: a versão anterior deste ADR previa iOS nativo em Swift. Swift nativo agora é alternativa rejeitada (duas implementações da regra e apenas uma das lojas).

## ADR-002 — Local-first com backend adiado

- Contexto: uso pessoal, sem necessidade de conta na V1.
- Decisão: dados locais em todas as plataformas; JSON versionado como ponte.
- Gatilho do Postgres: CLI + web usados diariamente na mesma semana.
- Consequência: sem custo de infraestrutura agora; sync exigirá merge por `updated_at`.

## ADR-003 — Engine de dados por plataforma

- Contexto: cada plataforma tem um armazenamento local natural.
- Decisão: SQLite no CLI; `expo-sqlite` no mobile; IndexedDB no web e no desktop.
- Consequência: três implementações de persistência; schema canônico único e testes de contrato.
- Alternativa rejeitada: localStorage no web (limites e perda de dados).

## ADR-004 — Regra de agendamento sem recall

- Contexto: check-in "estudei agora" sem pergunta de lembrete.
- Decisão: intervalo = min(365, base(dificuldade) × 2^n), com n = check-ins.
- Atraso não penaliza; reavaliação manual muda a base com o mesmo n.
- Sugestão de reavaliação após 3 check-ins no prazo. Superado pelo ADR-011: a reavaliação passou a ser pedida a cada check-in.
- Consequência: menos dados de aprendizado real; FSRS fica para quando houver histórico.

## ADR-005 — Arquivo morto em 180 dias

- Contexto: fila não pode crescer para sempre; histórico não pode ser destruído.
- Decisão: `active` → `archived` → `cold` após 180 dias, configurável.
- `cold` vive em store separado, com export JSON automático; restore e purge manual.
- Consequência: export é o backup real; purga é a única operação destrutiva.

## ADR-006 — Sentry no piloto

- Contexto: piloto web com dados locais não dá visibilidade de uso.
- Decisão: Sentry com erros + eventos anônimos; aviso LGPD de 1 parágrafo.
- Consequência: retenção mensurável sem backend; exige disciplina de não enviar dado pessoal.

## ADR-007 — Ordem de construção com gates

- Contexto: paridade entre plataformas é o alvo, mas o ritmo é limitado.
- Decisão: CLI → web (gate de consistência pessoal) → piloto (gate de retenção) → mobile React Native (iOS + Android) → desktop.
- Mobile exige conta Apple (US$ 99/ano) e Google Play (US$ 25 único); EAS Build dispensa Xcode local.
- Desktop reaproveita o renderer do web e pode entrar logo após a fase 2, sem esperar o mobile.
- Alternativa rejeitada: construir as quatro em paralelo (risco de UI sem produto validado).

## ADR-008 — Mobile com React Native (Expo)

- Contexto: iOS e Android precisam do mesmo produto, com <10h/semana e o core já em TS.
- Decisão: React Native com Expo para iOS e Android, consumindo `packages/core` e persistindo em `expo-sqlite`.
- Consequência: uma base de UI para as duas lojas e nenhuma reimplementação da regra; build iOS via EAS sem Xcode local.
- Alternativas rejeitadas: Swift nativo + Kotlin (duas bases e duas regras); Flutter (Dart fora do stack TS).

## ADR-009 — Desktop com Electron reaproveitando o web

- Contexto: o desktop precisa ser barato e o web já entrega os fluxos completos em React.
- Decisão: `apps/desktop` encapsula o renderer de `apps/web` em Electron, com a mesma persistência IndexedDB.
- Consequência: desktop quase de graça, com UI única em relação ao web; Electron é Node/TS puro.
- Alternativas rejeitadas: Tauri (reintroduz Rust, já rejeitado no ADR-001); React Native macOS/Windows (não cobre Linux e criaria uma segunda UI).

## ADR-010 — Referência de item por UUID, prefixo ou título

- Contexto: digitar o UUID inteiro é atrito, e títulos podem duplicar.
- Decisão: todo comando aceita `<ref>` = UUID exato, prefixo único de 4+ caracteres ou título exato normalizado (`title_key`).
- Ambiguidade é erro de estado (exit 3) com a lista de candidatos; o CLI nunca escolhe sozinho.
- Consequência: coluna `title_key` e índice novos; `study find` cobre busca parcial, que não serve como referência.

## ADR-011 — Reavaliação de dificuldade a cada check-in

- Contexto: a sugestão após 3 check-ins no prazo era fácil de ignorar e a dificuldade declarada envelhecia.
- Decisão: todo `study review` pergunta a dificuldade, com a atual como padrão; Enter mantém e `--difficulty` pula o prompt.
- O check-in é gravado antes do prompt; abortar mantém o check-in e não altera a dificuldade.
- Prompts só existem com terminal interativo: `--json`, stdin não-TTY ou `--no-input` exigem o valor por flag.
- Consequência: `on_time_streak` deixa de alimentar sugestão e vira histórico de pontualidade. Supera parte do ADR-004.

## ADR-012 — Init destrutivo com backup e confirmação reforçada

- Contexto: recriar o banco apaga itens, histórico e arquivo morto.
- Decisão: `study init` com banco existente pergunta; confirmar exige `--reset --yes`, e um export JSON de backup vai para `<data-dir>/backups/pre-reset-<timestamp>.json` antes da recriação.
- Se o backup falhar, o banco não é alterado.
- Consequência: a recriação é sempre precedida de backup; a purga segue como a outra operação destrutiva.

## ADR-013 — Scaffold do monorepo pnpm sem build

- Contexto: o ADR-001 exige `packages/core` em TS puro, mas não diz como ele chega aos quatro runtimes; nenhum ticket da fase 1 tem onde aterrissar sem o workspace.
- Decisão: workspace pnpm 12.4.1 (`packageManager`, Node >= 24) com três membros — `@study/core`, `@study/cli` e `@study/golden` — e `packages/*`, `apps/*` e `fixtures/*` no `pnpm-workspace.yaml`.
- Fonte única sem build: `core` e `golden` exportam `./src/index.ts` e `./*.json`; o Node 24 faz type stripping pelo realpath do symlink do pnpm e Vite, Metro, Expo e Electron consomem TS direto. Sem `dist/` e sem `.d.ts` publicado — todos os consumidores são TS do repo.
- Pureza provada pelo compilador: o `tsconfig.json` de `core` e `golden` cobre só `src`, com `types: []` e `lib: ["es2023"]`; os testes ficam num `tsconfig.test.json` com `types: ["node"]`. `noUncheckedSideEffectImports` fecha `import 'node:fs'` sem binding, e um teste varre `packages/core/src` atrás de imports proibidos.
- `fixtures/golden` é membro de verdade (`@study/golden`), não pasta solta: web, mobile e desktop não têm filesystem para ler JSON, então a fixture precisa ser importável.
- Bin do CLI como prova ponta a ponta: `apps/cli` declara `bin: { study: "./src/main.ts" }` com shebang; a raiz depende de `@study/cli` para o pnpm criar `node_modules/.bin/study`.
- Versões: TypeScript 5.9.3, Vitest 4.1.11 e `@types/node` 24.13.4 na linha 24, para o compilador recusar API de Node 26 sem o runtime correspondente.
- Consequência: `pnpm install` mais `test`, `test:golden`, `typecheck` e `bench` são a fundação da fase 1; trocar por build com `dist/` exige revisitar este ADR.
- Alternativa rejeitada: build com `tsc` e `dist/` — uma fonte de verdade a menos, ao custo de um passo de build e artefatos velhos para manter.

## ADR-014 — Engine SQLite do CLI: `node:sqlite`

- Contexto: o ADR-003 fixou SQLite no CLI, mas não qual binding; a ENG-5 (schema e camada de persistência) não começa sem o engine definido. A escolha precisava de protótipo executável, não de preferência declarada.
- Decisão: `node:sqlite` (built-in) no CLI, sem nenhuma dependência nova. Verificado em Node v24.15.0 / darwin-arm64 / pnpm 12.4.1, com SQLite 3.51.3 e Stability 1.2 (release candidate) — roda sem flag e sem aviso de experimental.
- Protótipo versionado: `scripts/sqlite-probe.ts`, rodado por `pnpm sqlite:probe` (mesmo tratamento do `bench`), aplica o DDL canônico de `docs/MODELO-DE-DADOS.md` verbatim e prova `CHECK`, FK com e sem pragma, `ON DELETE CASCADE`, round-trip, `backup()` e RNF-03.
- Números medidos: fila de 5.000 itens entre 4,95ms e 5,81ms nas execuções do probe, contra o teto de 200ms da RNF-03. O probe mede a leitura da fila mais o `JSON.stringify` das linhas como proxy: o `study due --json` de verdade continua bloqueado pela ENG-3, e o `pnpm bench` segue o stub que declara esse bloqueio.
- O 0,19ms do `better-sqlite3@13.0.3` no mesmo cenário foi medido na exploração da fase 1, não pelo protótipo versionado: o AC-13 barra a dependência no repo, então esse número não é reproduzível por quem revisa. A diferença é irrelevante contra o orçamento de 200ms de qualquer forma.
- Pragmas fixados: `foreign_keys = ON` (o `CASCADE` do schema depende dele, e vem desligado por padrão), `journal_mode = WAL` e `busy_timeout = 5000`.
- Sem açúcar: `node:sqlite` não tem `db.pragma()` nem `db.transaction()` — pragma por `prepare`/`exec` e transação na mão. O backup é a função de módulo `backup(db, path)`, assíncrona, e não um método de `DatabaseSync`.
- `synchronous` fica adiado para a ENG-5: não foi verificado no protótipo e não muda a escolha do engine.
- Consequência: zero binário nativo por plataforma, zero `@types` extra — os tipos já vêm no `@types/node@24.13.4`.
- Alternativa rejeitada: `better-sqlite3@13.0.3` (pré-builds para 8 plataformas e SQLite 3.53.4), ao custo de binário nativo por plataforma, build scripts bloqueados no pnpm 12 e `@types/better-sqlite3` a mais.
- Alternativa rejeitada no protótipo: o probe ler o bloco SQL do doc em runtime — menos cópias, mas mete parsing de markdown num artefato de decisão. O acoplamento ficou com o caso `S-14`, que quebra se a cópia divergir do doc.
- Gatilho de revisão: quebra incompatível de API no `node:sqlite` ou recurso que o módulo não exponha. Performance não é gatilho: os dois engines ficam muito abaixo do orçamento.
