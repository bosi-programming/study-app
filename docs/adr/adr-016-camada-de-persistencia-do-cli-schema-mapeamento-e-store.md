---
numero: 16
titulo: 'Camada de persistência do CLI: schema, mapeamento e store'
data: '2026-09-23'
status: 'aceito'
---

# ADR-016 — Camada de persistência do CLI: schema, mapeamento e store

- Contexto: o ADR-014 escolheu o `node:sqlite` do Node 24 como engine do CLI e o schema canônico de `docs/especificacao/MODELO-DE-DADOS.md` existe como DDL copiado no probe (`scripts/sqlite-probe.ts`). A ENG-5 (BOS-30) precisa de uma camada reutilizável que a ENG-6 (comandos) e depois export/import e o arquivo morto consumam — o probe prova o engine, mas não é uma camada. O `packages/core` é pinado puro (`S-01`/`S-16` proíbem import de Node), então a camada só pode morar no `apps/cli`.
- Decisão: a persistência vive em `apps/cli/src/persistence/` com três módulos e um barrel:
  - `schema.ts` — `SCHEMA_SQL` (DDL canônico verbatim) e `PRAGMAS` (`foreign_keys = ON`, `journal_mode = WAL`, `busy_timeout = 5000`, `synchronous = NORMAL`). O probe passou a re-exportar daqui: uma única cópia canônica no código, e o `S-14` continua pinando essa cópia ao bloco SQL do `MODELO-DE-DADOS.md` (ele lê do probe, que re-exporta a mesma ligação).
  - `mapping.ts` — a fronteira linha↔entidade: `itemToRow`/`rowToItem` derivam `title_key`/`subject_key` com `titleKey`/`subjectKey` do core e estreitam `difficulty` (via `toDifficulty`) e `status` na leitura, falhando alto em valor fora do domínio; `reviewLogToRow`/`rowToReviewLog` convertem `late` boolean ↔ INTEGER 0/1, recusando valores que não sejam 0 ou 1.
  - `store.ts` — `openStore(dbPath)` com política de abertura destrutiva-safe: cria o diretório-pai, aplica os PRAGMAs e só aplica o DDL + semeia `meta.schema_version = 1` quando a tabela `items` não existe. Nunca re-aplica DDL nem toca dados em banco existente — recriação é decisão do `init --reset` (ADR-012), com backup, e fica na ENG-6.
- O `synchronous = NORMAL`, que o ADR-014 adiou para a ENG-5, foi assentado agora: com WAL é seguro contra corrupção (o único risco é perder o último commit numa queda de energia, aceitável num app local-first) e evita fsync por commit.
- Upsert de item por `INSERT ... ON CONFLICT(id) DO UPDATE`, nunca `INSERT OR REPLACE`: o `REPLACE` apaga e recria a linha, o que dispara o `ON DELETE CASCADE` e apagaria os `review_logs` do item na edição.
- Transações na mão: o `node:sqlite` não tem `db.transaction()`, então `transaction(run)` faz `BEGIN`/`COMMIT`/`ROLLBACK` com guard contra aninhamento; uma falha no meio rola tudo. É o que garante o check-in (item + log) como uma única unidade.
- O schema futuro não é política do store: `schemaVersion()` expõe a leitura e recusar versão é do CLI (ENG-6, exit 2). A fila (`dueItems`) aplica verbatim a consulta que o probe já media para a RNF-03 (`status='active' AND due_date <= ? ORDER BY due_date, id`); a ordem de exibição (atrasados primeiro) continua do CLI, como manda o `CORE.md`.
- Consequência: a ENG-6 abre o store, compõe os comandos sobre `saveItem`/`getItem`/`dueItems`/`saveReviewLog`/`transaction`/meta/cold archive e não escreve SQL próprio. O probe continua sendo a prova executável do engine, agora consumindo o schema da camada.
- Consequência: os testes da camada rodam no projeto `cli` do `vitest.config.ts` (`apps/cli/test/persistence/*.test.ts`) contra um SQLite real em diretório temporário — nenhuma config nova.
- Alternativa rejeitada: manter o `SCHEMA_SQL` só no probe e a camada importar de lá — inverte a dependência: código de produção depender de um artefato de decisão.
- Alternativa rejeitada: expor o `DatabaseSync` no `Store` para os testes lerem pragmas por conexão — vazaria o acesso bruto para a ENG-6; o WAL é verificado em nível de arquivo e o `foreign_keys = ON` é provado por comportamento (log órfão recusado).
- Gatilho de revisão: a ENG-6 precisar de uma consulta que não cabe nas primitivas do store, ou o segundo consumidor (web/mobile) querendo a mesma superfície de contrato — aí a definição da porta compartilhada volta à mesa.