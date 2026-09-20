# Plano de Testes — App de Estudo Espaçado

Versão: 3 | Data: 2026-09-12 | Base: `docs/especificacao/REQUISITOS.md`

## Estratégia

- A regra de agendamento é o ativo crítico; ela concentra os testes.
- Golden fixtures são a fonte única de verdade da regra para todos os apps TS.
- UI testada por comportamento essencial, sem perseguir cobertura.

| Camada | Ferramenta | Meta |
| --- | --- | --- |
| `packages/core` | Vitest | >= 90% de linhas |
| CLI | Vitest + execução do binário com `--json` | fluxos dos RF-01..RF-20 |
| Web | Vitest + Testing Library | adicionar, fila, check-in, arquivar |
| Mobile | Jest + React Native Testing Library | mesmos fluxos, lendo `fixtures/golden` via core |
| Desktop | Playwright sobre Electron + testes do web | abertura e fluxos principais |

## Golden fixtures

- Local: `fixtures/golden/*.json`.
- Cada caso: estado inicial, ação, parâmetros e resultado esperado.
- Consumidos pelos testes do core, CLI, web, mobile e desktop; divergência quebra o build.
- Versionados junto do código; alteração exige revisão de todos os consumidores.

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
| T-03 | Check-in atrasado não penaliza | RF-08, RN-04, RN-05 |
| T-04 | Reavaliação recalcula com a nova base | RN-06 |
| T-05 | Reavaliação pedida a cada check-in e reset do contador com atraso | RN-08, RF-12, RF-13 |
| T-06 | Arquivar tira da fila; check-in rejeitado | RF-09, RF-14, RF-15, RN-09 |
| T-07 | Migração para arquivo morto em 180d com export | RF-16, RF-20, RN-10 |
| T-08 | Restore preserva n e dificuldade | RF-17, RN-11 |
| T-09 | Export/import round-trip sem perda | RF-18, RF-19 |
| T-10 | Import duplicado não duplica item | RF-19, CA-11 |
| T-11 | Ordenação da fila: atrasados primeiro | RF-05, CA-12 |
| T-12 | Normalização de matéria (caixa e acentos) | RN-12 |
| T-13 | `study edit` altera campos e recalcula quando a dificuldade muda | RF-03, RN-06 |
| T-14 | `study remove` exige `--yes` e não passa pelo arquivo morto | RF-04 |
| T-15 | `study due` mostra o recorte por matéria | RF-07 |
| T-16 | `study show --history` lista os check-ins e o próximo vencimento | RF-06, RF-10 |
| T-17 | `study find` acha por substring sem caixa e sem acento | RF-24 |
| T-18 | Ref por título exato; título duplicado recusa com candidatos | RN-15, CA-18 |
| T-19 | `study review` pergunta a dificuldade; manter não muda e mudar recalcula | RF-12, CA-13, CA-14 |
| T-20 | Check-in antecipado e dois check-ins no mesmo dia | RN-13, CA-15 |
| T-21 | Streak de fila zerada acumula e zera | RF-21, RF-22, RF-23, RN-14, CA-16 |
| T-22 | `study config set cold_archive_after_days` muda a janela de migração | RF-25, RN-10, CA-19 |
| T-23 | Sem terminal, `add` sem `-d` encerra com exit 1 | CLI.md — prompts |
| T-24 | `init --reset --yes` faz backup e recria; backup falho aborta sem apagar | CLI.md — fluxos com prompt |
| T-25 | Envelope `--json` estável por comando, com `schema_version` | RNF-08 |
| T-26 | Benchmark: 5.000 itens e `study due --json` abaixo de 200ms (manual) | RNF-03 |
| T-27 | `study list` filtra por matéria e status e ordena por vencimento | RF-02 |

### Suíte de scaffold (S-01..S-17)

- IDs `S-nn` cobrem a fiação do repo, não a regra: pureza e resolução do core (`S-01`, `S-02`, `S-16`), forma e unicidade da fixture (`S-03`..`S-05`), bin do CLI (`S-06`, `S-07`), membros, tsconfig, dependências e scripts do workspace (`S-08`..`S-12`), o engine SQLite (`S-13`..`S-15`: probe executável, DDL acoplado ao doc e recusa de dependência nativa) e a organização dos docs (`S-17`: índice de ADRs).
- `S-16` fecha o outro lado do `S-01`: além dos imports proibidos, nenhum arquivo de `packages/core/src` pode ler relógio ou aleatoriedade do ambiente (`Date.now`, `new Date()` sem argumentos, `Math.random`, `crypto`, `performance.now`) — tempo e ids vêm só de `deps`. Nasceu do Tasting do BOS-28; era `S-13` no ramo e ficou com o id livre depois que o probe do BOS-27 tomou `S-13`..`S-15`.
- `S-17` é o caso novo deste PR: todo arquivo de `docs/adr/` é linkado pelo índice e todo link do índice resolve.
- Reservados para não colidir com `T-01`..`T-27` (domínio) nem com `C-01`..`C-57` (a regra, no nível de unidade).
- Arquivos: `packages/core/test/core.test.ts`, `fixtures/golden/test/golden.test.ts`, `apps/cli/test/cli.test.ts` e `tests/scaffold.test.ts` — 46 testes no total.

### Suíte de regra no core (C-01..C-57)

- IDs `C-nn` são os casos de `packages/core/test/*.test.ts`: um por comportamento da regra, cada um rastreando o `T-nn` do plano e o `RF`/`RN`/`CA` que o originou.
- Detalham no nível de unidade os casos de domínio do plano (`T-01`..`T-05`, `T-12`, `T-16`, `T-18`, `T-20`, `T-21`) sem substituí-los: a CLI, o web, o mobile e o desktop continuam devendo seus próprios `T-nn`.
- `C-56` e `C-57` nasceram do Tasting do BOS-28: datas malformadas falham igual em `compareDates`/`isLate`/`daysLate`/`isDue`, e `note`/`link` guardam o texto digitado (só o vazio vira `null`).

## Rastreabilidade

Requisitos que não tinham caso em T-01..T-12:

| RF | Caso |
| --- | --- |
| RF-02 (listar com filtro) | T-27 |
| RF-03 (editar) | T-13 |
| RF-04 (remover) | T-14 |
| RF-06 (próximo vencimento) | T-16 |
| RF-07 (resumo por matéria) | T-15 |
| RF-10 (histórico) | T-16 |
| RF-11 (reavaliação manual) | T-04 |
| RF-21 (streak) | T-21 |
| RF-22 (contagens) | T-21 |
| RF-23 (check-ins do dia) | T-21 |
| RF-24 (busca por título) | T-17 |
| RF-25 (janela configurável) | T-22 |

## Testes de dados

- Round-trip JSON: export → import → export produz o mesmo conteúdo.
- Migração: schema v1 importado em banco vazio e em banco com dados.
- Conflito: mesmo UUID com `updated_at` diferentes; vence o mais recente.
- Banco corrompido: export continua possível quando o arquivo-fonte existe.

## Testes de plataforma

- CLI: snapshot de `--json` por comando; exit codes da tabela de erros; refs por UUID, prefixo e título; prompts desligados em `--json` e stdin não-TTY.
- Web: fluxo adicionar → fila → check-in → arquivar em um teste de integração.
- Mobile: Jest + RNTL consome `fixtures/golden` pelo core; UI mínima fora da fase 4.
- Desktop: roda os fluxos do web dentro do Electron + smoke de empacotamento.

## Execução

Hoje (BOS-28, ENG-3 — domínio do core e regra de agendamento):

- `pnpm test` roda os 4 projetos do `vitest.config.ts` — core, golden, cli e scaffold — 192 testes em 13 arquivos.
- `pnpm test:golden` roda só o projeto golden.
- `pnpm typecheck` roda `tsc --noEmit` nos três pacotes mais o tsconfig da raiz; é o único gate que prova a pureza do core (CA-3) e o `strict` compartilhado (CA-5), porque o Vitest não checa tipos.
- `pnpm bench` ainda não mede: sai com 0 declarando que a RNF-03 depende da ENG-5 (persistência) e da ENG-6 (`study due --json`); a ENG-3 já entregou a regra.
- `pnpm sqlite:probe` prova o schema canônico no engine do CLI (ADR-014): aplica o DDL de `docs/especificacao/MODELO-DE-DADOS.md` verbatim e roda `CHECK`, FK on/off, `CASCADE`, round-trip, `backup()` e a medição da fila. É a prova executável do `S-13`.
- Ainda não há CI: a verificação é local (`pnpm test` + `pnpm typecheck`). A meta de >= 90% de linhas em `packages/core` não tem cobertura configurada — não há provider instalado no workspace.

Alvo da fase 1:

- `pnpm test` inclui o web na fase 2; mobile e desktop entram nas fases 4 e 5.
- `pnpm bench` gera 5.000 itens e mede `study due --json` (RNF-03); é verificação manual da fase 1, não gate de CI.
- CI: GitHub Actions opcional na fase 1; até lá, rodar local antes de commit.

## Fora do plano V1

- Testes de carga, acessibilidade automatizada, visual regression, testes de App Store.
