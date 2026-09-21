---
numero: 8
titulo: 'Mobile com React Native (Expo)'
data: '2026-09-12'
status: 'aceito'
---

# ADR-008 — Mobile com React Native (Expo)

- Contexto: iOS e Android precisam do mesmo produto, com <10h/semana e o core já em TS.
- Decisão: React Native com Expo para iOS e Android, consumindo `packages/core` e persistindo em `expo-sqlite`.
- Consequência: uma base de UI para as duas lojas e nenhuma reimplementação da regra; build iOS via EAS sem Xcode local.
- Alternativas rejeitadas: Swift nativo + Kotlin (duas bases e duas regras); Flutter (Dart fora do stack TS).
