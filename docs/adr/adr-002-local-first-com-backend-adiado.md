---
numero: 2
titulo: 'Local-first com backend adiado'
data: '2026-09-10'
status: 'aceito'
---

# ADR-002 — Local-first com backend adiado

- Contexto: uso pessoal, sem necessidade de conta na V1.
- Decisão: dados locais em todas as plataformas; JSON versionado como ponte.
- Gatilho do Postgres: CLI + web usados diariamente na mesma semana.
- Consequência: sem custo de infraestrutura agora; sync exigirá merge por `updated_at`.
