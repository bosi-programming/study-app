---
numero: 3
titulo: 'Engine de dados por plataforma'
data: '2026-09-10'
status: 'aceito'
---

# ADR-003 — Engine de dados por plataforma

- Contexto: cada plataforma tem um armazenamento local natural.
- Decisão: SQLite no CLI; `expo-sqlite` no mobile; IndexedDB no web e no desktop.
- Consequência: três implementações de persistência; schema canônico único e testes de contrato.
- Alternativa rejeitada: localStorage no web (limites e perda de dados).
