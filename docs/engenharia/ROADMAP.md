# Roadmap — App de Estudo Espaçado

Versão: 2 | Data: 2026-09-12 | Ritmo: menos de 10h/semana

## Fases e gates

| Fase | Entrega | Gate de saída | Calendário |
| --- | --- | --- | --- |
| 0 | Documentos de engenharia | revisão aprovada | concluída |
| 1 | CLI completo + core + testes | uso próprio por 1 semana | 5–7 semanas |
| 2 | Web + deploy | 2–4 semanas com >= 70% dos dias com fila zerada | 6–8 semanas |
| 3 | Piloto web | 3–5 estudantes por 2+ semanas | 2–4 semanas |
| 4 | Mobile React Native (iOS + Android) | spike de 1 semana aprovado | 6–10 semanas |
| 5 | Desktop (Electron) | app abre e passa nos fluxos do web | 1–2 semanas |

## Fase 1 — CLI

- [x] Scaffold do monorepo pnpm com `packages/core` e `apps/cli`.
- [x] CI de lint, typecheck e testes nas PRs para `main`.
- [ ] Implementar RN-01..RN-12 no core com golden fixtures.
- [ ] Schema SQLite e camada de persistência.
- [ ] Comandos de `docs/especificacao/CLI.md`.
- [ ] Export/import JSON v1 idempotente.
- [ ] Stats e arquivo morto.
- [ ] Testes T-01..T-12 verdes.

Definition of done: instalar, criar itens, zerar a fila por 1 semana, exportar e reimportar sem perda.

## Fase 2 — Web

- [ ] Reuso do core TS sem duplicação de regra.
- [ ] Telas: adicionar, lista por matéria, fila, check-in, arquivar, stats.
- [ ] IndexedDB com o mesmo contrato de dados.
- [ ] Deploy em free tier com URL pública.
- [ ] Export/import pela interface.

Definition of done: uso diário pessoal no web por 2–4 semanas com a métrica de fila zerada.

## Fase 3 — Piloto

- [ ] Aviso LGPD de 1 parágrafo e consentimento.
- [ ] Sentry com erros + eventos anônimos.
- [ ] Roteiro de entrevista semanal.
- [ ] Meta: 3–5 estudantes por 2+ semanas, >= 50% na 2ª semana.

## Fase 4 — Mobile (React Native)

- [ ] Expo + TypeScript, consumindo `packages/core` direto (sem reimplementar a regra).
- [ ] Spike de 1 semana: Expo + `expo-sqlite` + tela de fila no emulador e no device.
- [ ] Persistência `expo-sqlite` com o schema canônico de `docs/especificacao/MODELO-DE-DADOS.md`.
- [ ] Telas: adicionar, fila, check-in, arquivar, stats.
- [ ] Notificações locais de revisão com `expo-notifications`.
- [ ] EAS Build, TestFlight e faixa interna do Google Play antes das lojas.

Definition of done: fila zerada pelo app em iOS e Android por 1 semana.

## Fase 5 — Desktop

- [ ] Empacotar o renderer de `apps/web` em Electron (`apps/desktop`).
- [ ] Mesmo core TS e mesma persistência IndexedDB do web.
- [ ] Instaladores assinados: dmg (macOS), nsis (Windows) e AppImage (Linux).
- [ ] Smoke test de abertura e dos fluxos principais.

Definition of done: app instalado e usado no desktop sem abrir o navegador.

## Backlog pós-V1

- Sync com Postgres quando CLI + web forem diários na mesma semana.
- FSRS no lugar da regra fixa, quando houver histórico.
- Tags, metas diárias, gráficos, i18n.

## Riscos por fase

| Fase | Risco | Sinal de alerta |
| --- | --- | --- |
| 1 | Regra mudar várias vezes | mais de 2 mudanças de parâmetro em 1 semana |
| 2 | Web virar reescrita do core | regra duplicada em `apps/web` |
| 3 | Pilotos abandonarem | menos de 50% ativos na 2ª semana |
| 4 | Curva do React Native ou das duas lojas estourar | spike passar de 2 semanas |
| 5 | Desktop divergir do web | UI duplicada em `apps/desktop` |
