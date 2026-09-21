---
numero: 1
titulo: 'Core TS compartilhado por CLI, web, mobile e desktop'
data: '2026-09-10'
status: 'aceito'
---

# ADR-001 — Core TS compartilhado por CLI, web, mobile e desktop

- Contexto: CLI e web já são TypeScript; mobile (iOS + Android) e desktop precisam reusar o mesmo domínio.
- Decisão: `packages/core` em TS puro, consumido por CLI, web, React Native (Expo) e desktop (Electron); sem reimplementação em outra linguagem.
- Conformidade: golden fixtures em `fixtures/golden` como vetores de regressão de todos os apps; `packages/core` sem APIs de Node ou browser.
- Consequência: uma implementação da regra; divergência vira bug de integração, não de paridade de algoritmo.
- Supersede: a versão anterior deste ADR previa iOS nativo em Swift. Swift nativo agora é alternativa rejeitada (duas implementações da regra e apenas uma das lojas).
