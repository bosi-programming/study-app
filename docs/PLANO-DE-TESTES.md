# Plano de Testes — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-09 | Base: `docs/REQUISITOS.md`

## Estratégia

- A regra de agendamento é o ativo crítico; ela concentra os testes.
- Golden fixtures são a fonte única de verdade entre TS e Swift.
- UI testada por comportamento essencial, sem perseguir cobertura.

| Camada | Ferramenta | Meta |
| --- | --- | --- |
| `packages/core` | Vitest | >= 90% de linhas |
| CLI | Vitest + execução do binário com `--json` | fluxos dos RF-01..RF-20 |
| Web | Vitest + Testing Library | adicionar, fila, check-in, arquivar |
| iOS | XCTest lendo os mesmos fixtures | paridade com o core TS |

## Golden fixtures

- Local: `fixtures/golden/*.json`.
- Cada caso: estado inicial, ação, parâmetros e resultado esperado.
- Consumidos pelos testes TS e Swift; divergência quebra o build.
- Versionados junto do código; alteração exige revisão dos dois lados.

```json
{
  "case": "progressao-ate-teto",
  "difficulty": 3,
  "base_interval_days": 5,
  "cap_days": 365,
  "checkins": 9,
  "expected_intervals": [5, 10, 20, 40, 80, 160, 320, 365, 365]
}
```

## Casos obrigatórios

| ID | Caso | Requisito |
| --- | --- | --- |
| T-01 | Vencimento inicial por dificuldade (1–5) | RN-01, RN-02 |
| T-02 | Progressão ×2 até o teto de 365d | RN-03, RN-07 |
| T-03 | Check-in atrasado não penaliza | RN-04, RN-05 |
| T-04 | Reavaliação recalcula com a nova base | RN-06 |
| T-05 | Sugestão após 3 no prazo e reset com atraso | RN-08, RF-12, RF-13 |
| T-06 | Arquivar tira da fila; check-in rejeitado | RF-09, RF-14, RF-15 |
| T-07 | Migração para arquivo morto em 180d com export | RF-16, RF-20 |
| T-08 | Restore preserva n e dificuldade | RF-17, RN-11 |
| T-09 | Export/import round-trip sem perda | RF-18, RF-19 |
| T-10 | Import duplicado não duplica item | RF-19, CA-11 |
| T-11 | Ordenação da fila: atrasados primeiro | RF-05, CA-12 |
| T-12 | Normalização de matéria (caixa e acentos) | RN-12 |

## Testes de dados

- Round-trip JSON: export → import → export produz o mesmo conteúdo.
- Migração: schema v1 importado em banco vazio e em banco com dados.
- Conflito: mesmo UUID com `updated_at` diferentes; vence o mais recente.
- Banco corrompido: export continua possível quando o arquivo-fonte existe.

## Testes de plataforma

- CLI: snapshot de `--json` por comando; exit codes da tabela de erros.
- Web: fluxo adicionar → fila → check-in → arquivar em um teste de integração.
- iOS: XCTest consome `fixtures/golden` e valida a regra; UI mínima fora da fase 1.

## Execução

- `pnpm test` roda core + CLI + web.
- `pnpm test:golden` valida apenas fixtures.
- CI: GitHub Actions opcional na fase 1; até lá, rodar local antes de commit.

## Fora do plano V1

- Testes de carga, acessibilidade automatizada, visual regression, testes de App Store.
