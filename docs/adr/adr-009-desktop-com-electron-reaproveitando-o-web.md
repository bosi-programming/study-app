---
numero: 9
titulo: 'Desktop com Electron reaproveitando o web'
data: '2026-09-12'
status: 'aceito'
---

# ADR-009 — Desktop com Electron reaproveitando o web

- Contexto: o desktop precisa ser barato e o web já entrega os fluxos completos em React.
- Decisão: `apps/desktop` encapsula o renderer de `apps/web` em Electron, com a mesma persistência IndexedDB.
- Consequência: desktop quase de graça, com UI única em relação ao web; Electron é Node/TS puro.
- Alternativas rejeitadas: Tauri (reintroduz Rust, já rejeitado no [ADR-001](adr-001-core-ts-compartilhado-por-cli-web-mobile-e-desktop.md)); React Native macOS/Windows (não cobre Linux e criaria uma segunda UI).
