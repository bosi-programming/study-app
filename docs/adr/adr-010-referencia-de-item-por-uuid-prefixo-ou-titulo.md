---
numero: 10
titulo: 'Referência de item por UUID, prefixo ou título'
data: '2026-09-12'
status: 'aceito'
---

# ADR-010 — Referência de item por UUID, prefixo ou título

- Contexto: digitar o UUID inteiro é atrito, e títulos podem duplicar.
- Decisão: todo comando aceita `<ref>` = UUID exato, prefixo único de 4+ caracteres ou título exato normalizado (`title_key`).
- Ambiguidade é erro de estado (exit 3) com a lista de candidatos; o CLI nunca escolhe sozinho.
- Consequência: coluna `title_key` e índice novos; `study find` cobre busca parcial, que não serve como referência.
