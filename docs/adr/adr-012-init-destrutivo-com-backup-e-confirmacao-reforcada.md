---
numero: 12
titulo: 'Init destrutivo com backup e confirmação reforçada'
data: '2026-09-12'
status: 'aceito'
---

# ADR-012 — Init destrutivo com backup e confirmação reforçada

- Contexto: recriar o banco apaga itens, histórico e arquivo morto.
- Decisão: `study init` com banco existente pergunta; confirmar exige `--reset --yes`, e um export JSON de backup vai para `<data-dir>/backups/pre-reset-<timestamp>.json` antes da recriação.
- Se o backup falhar, o banco não é alterado.
- Consequência: a recriação é sempre precedida de backup; a purga segue como a outra operação destrutiva.
