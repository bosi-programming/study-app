---
numero: 5
titulo: 'Arquivo morto em 180 dias'
data: '2026-09-10'
status: 'aceito'
---

# ADR-005 — Arquivo morto em 180 dias

- Contexto: fila não pode crescer para sempre; histórico não pode ser destruído.
- Decisão: `active` → `archived` → `cold` após 180 dias, configurável.
- `cold` vive em store separado, com export JSON automático; restore e purge manual.
- Consequência: export é o backup real; purga é a única operação destrutiva.
