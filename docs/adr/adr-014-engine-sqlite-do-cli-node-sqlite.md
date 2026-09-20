---
numero: 14
titulo: 'Engine SQLite do CLI: `node:sqlite`'
data: '2026-09-20'
status: 'aceito'
---

# ADR-014 — Engine SQLite do CLI: `node:sqlite`

- Contexto: o [ADR-003](adr-003-engine-de-dados-por-plataforma.md) fixou SQLite no CLI, mas não qual binding; a ENG-5 (schema e camada de persistência) não começa sem o engine definido. A escolha precisava de protótipo executável, não de preferência declarada.
- Decisão: `node:sqlite` (built-in) no CLI, sem nenhuma dependência nova. Verificado em Node v24.15.0 / darwin-arm64 / pnpm 12.4.1, com SQLite 3.51.3 e Stability 1.2 (release candidate) — roda sem flag e sem aviso de experimental.
- Protótipo versionado: `scripts/sqlite-probe.ts`, rodado por `pnpm sqlite:probe` (mesmo tratamento do `bench`), aplica o DDL canônico de `docs/especificacao/MODELO-DE-DADOS.md` verbatim e prova `CHECK`, FK com e sem pragma, `ON DELETE CASCADE`, round-trip, `backup()` e RNF-03.
- Números medidos: fila de 5.000 itens entre 4,95ms e 5,81ms nas execuções do probe, contra o teto de 200ms da RNF-03. O probe mede a leitura da fila mais o `JSON.stringify` das linhas como proxy: o `study due --json` de verdade continua bloqueado pela ENG-3, e o `pnpm bench` segue o stub que declara esse bloqueio.
- O 0,19ms do `better-sqlite3@13.0.3` no mesmo cenário foi medido na exploração da fase 1, não pelo protótipo versionado: o AC-13 barra a dependência no repo, então esse número não é reproduzível por quem revisa. A diferença é irrelevante contra o orçamento de 200ms de qualquer forma.
- Pragmas fixados: `foreign_keys = ON` (o `CASCADE` do schema depende dele, e vem desligado por padrão), `journal_mode = WAL` e `busy_timeout = 5000`.
- Sem açúcar: `node:sqlite` não tem `db.pragma()` nem `db.transaction()` — pragma por `prepare`/`exec` e transação na mão. O backup é a função de módulo `backup(db, path)`, assíncrona, e não um método de `DatabaseSync`.
- `synchronous` fica adiado para a ENG-5: não foi verificado no protótipo e não muda a escolha do engine.
- Consequência: zero binário nativo por plataforma, zero `@types` extra — os tipos já vêm no `@types/node@24.13.4`.
- Alternativa rejeitada: `better-sqlite3@13.0.3` (pré-builds para 8 plataformas e SQLite 3.53.4), ao custo de binário nativo por plataforma, build scripts bloqueados no pnpm 12 e `@types/better-sqlite3` a mais.
- Alternativa rejeitada no protótipo: o probe ler o bloco SQL do doc em runtime — menos cópias, mas mete parsing de markdown num artefato de decisão. O acoplamento ficou com o caso `S-14`, que quebra se a cópia divergir do doc.
- Gatilho de revisão: quebra incompatível de API no `node:sqlite` ou recurso que o módulo não exponha. Performance não é gatilho: os dois engines ficam muito abaixo do orçamento.
