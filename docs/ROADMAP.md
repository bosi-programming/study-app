# Roadmap — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-09 | Ritmo: menos de 10h/semana

## Fases e gates

| Fase | Entrega | Gate de saída | Calendário |
| --- | --- | --- | --- |
| 0 | Documentos de engenharia | revisão aprovada | concluída |
| 1 | CLI completo + core + testes | uso próprio por 1 semana | 5–7 semanas |
| 2 | Web + deploy | 2–4 semanas com >= 70% dos dias com fila zerada | 6–8 semanas |
| 3 | Piloto web | 3–5 estudantes por 2+ semanas | 2–4 semanas |
| 4 | iOS nativo Swift | spike de 1 semana aprovado | 6–12 meses |

## Fase 1 — CLI

- [ ] Scaffold do monorepo pnpm com `packages/core` e `apps/cli`.
- [ ] Implementar RN-01..RN-12 no core com golden fixtures.
- [ ] Schema SQLite e camada de persistência.
- [ ] Comandos de `docs/CLI.md`.
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

## Fase 4 — iOS

- [ ] Instalar Xcode e conta Apple (US$ 99/ano).
- [ ] Spike de 1 semana: Swift + SQLite + tela mínima no simulador.
- [ ] Implementar paridade funcional com os golden fixtures.
- [ ] Notificações locais e telas (UX definida nesta fase).
- [ ] TestFlight antes da App Store.

## Backlog pós-V1

- Sync com Postgres quando CLI + web forem diários na mesma semana.
- FSRS no lugar da regra fixa, quando houver histórico.
- Tags, metas diárias, gráficos, i18n, Android.

## Riscos por fase

| Fase | Risco | Sinal de alerta |
| --- | --- | --- |
| 1 | Regra mudar várias vezes | mais de 2 mudanças de parâmetro em 1 semana |
| 2 | Web virar reescrita do core | regra duplicada em `apps/web` |
| 3 | Pilotos abandonarem | menos de 50% ativos na 2ª semana |
| 4 | Curva do Swift estourar | spike passar de 2 semanas |
