---
numero: 7
titulo: 'Ordem de construção com gates'
data: '2026-09-10'
status: 'aceito'
---

# ADR-007 — Ordem de construção com gates

- Contexto: paridade entre plataformas é o alvo, mas o ritmo é limitado.
- Decisão: CLI → web (gate de consistência pessoal) → piloto (gate de retenção) → mobile React Native (iOS + Android) → desktop.
- Mobile exige conta Apple (US$ 99/ano) e Google Play (US$ 25 único); EAS Build dispensa Xcode local.
- Desktop reaproveita o renderer do web e pode entrar logo após a fase 2, sem esperar o mobile.
- Alternativa rejeitada: construir as quatro em paralelo (risco de UI sem produto validado).
