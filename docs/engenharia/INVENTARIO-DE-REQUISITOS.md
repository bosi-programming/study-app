# Inventário de Requisitos — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-28 | Base: `docs/engenharia/ROADMAP.md`

O `ROADMAP.md` descreve as fases 2 a 5 por bullets. Este inventário registra, fase a fase, o que já tem fonte escrita, o que falta e onde cada documento vai morar em `docs/`. Ele não renumera `RN`, `RF`, `RNF` nem `T`: a fonte de verdade continua em `REQUISITOS.md` e no `PLANO-DE-TESTES.md`.

## Inventário por fase

| Fase | Já existe | Falta | Documento |
| --- | --- | --- | --- |
| Fase 2 — Web | `ROADMAP.md` (bullets), `REQUISITOS.md` (`RF-01`..`RF-25`), `MODELO-DE-DADOS.md` (IndexedDB), ADR-001, ADR-003 | telas, estados e contrato com o core | `docs/especificacao/WEB.md` |
| Fase 3 — Piloto | `ROADMAP.md`, `RNF-05`, ADR-006, métricas do `PRD.md` | aviso LGPD, eventos do Sentry e roteiro de entrevista | `docs/especificacao/PILOTO.md` |
| Fase 4 — Mobile | `ROADMAP.md`, ADR-003, ADR-008, `MODELO-DE-DADOS.md` (SQLite) | telas, `expo-sqlite`, notificações e lojas | `docs/especificacao/MOBILE.md` |
| Fase 5 — Desktop | `ROADMAP.md`, ADR-003, ADR-009 | empacotamento e smoke; as telas vêm do web | `docs/especificacao/DESKTOP.md` |

A Fase 1 já tem spec própria (`CLI.md`, v5) e não muda aqui. As fases 2 a 5 passam a ter requisito escrito antes do código; implementar continua sendo dos tickets BOS-41 a BOS-45 e seguintes.

## Casa dos documentos

| Documento | Fase | Status | Versão |
| --- | --- | --- | --- |
| `docs/engenharia/INVENTARIO-DE-REQUISITOS.md` | 1–5 | Rascunho | v1 |
| `docs/especificacao/WEB.md` | 2 | Rascunho | v1 |
| `docs/especificacao/PILOTO.md` | 3 | Rascunho | v1 |
| `docs/especificacao/MOBILE.md` | 4 | Rascunho | v1 |
| `docs/especificacao/DESKTOP.md` | 5 | Rascunho | v1 |
| `docs/engenharia/PLANO-DE-TESTES.md` | 1–5 | Rascunho | v4 |

Todos entram no índice e na ordem de leitura do `docs/README.md`. Nenhum ADR novo: as decisões de arquitetura das camadas já são ADR-001, ADR-003, ADR-006, ADR-007, ADR-008 e ADR-009. O ADR do scaffold do web continua sendo entregue pelo BOS-41.

## Reconciliação de BOS-41..BOS-45

Cada critério de aceite desses tickets cai numa de três classes:

- **documentado** — o critério tem fonte escrita; a coluna `Fonte` aponta a seção.
- **implementação/deploy** — o critério é de fiação, empacotamento ou publicação, não um requisito de produto; fica registrado como sem fonte documental e não é reescrito.
- **ajustado** — o critério contradiz o documento-fonte e é ajustado no Linear.

| Ticket | Critério | Classe | Fonte |
| --- | --- | --- | --- |
| BOS-41 | `apps/web` é membro do workspace e passa em `pnpm lint` e `pnpm typecheck` | implementação/deploy | — |
| BOS-41 | A regra vem de `@study/core` pelo `src`, sem cópia e sem `dist/` | documentado | `WEB.md` — Contrato com o core; ADR-001, ADR-013 |
| BOS-41 | O `vitest.config.ts` ganha o projeto `web`, com Vitest e Testing Library | implementação/deploy | — |
| BOS-41 | Um caso do web lê um vetor de `fixtures/golden` e o computa pelo core | documentado | `WEB.md` — Contrato com o core; `PLANO-DE-TESTES.md` — Estratégia; ADR-015 |
| BOS-41 | O `PLANO-DE-TESTES.md` define os IDs dos casos do web | documentado | `PLANO-DE-TESTES.md` — Casos por camada (`W-01`..`W-14`) |
| BOS-41 | ADR do scaffold do web aceito e indexado | implementação/deploy | — |
| BOS-42 | Os quatro stores existem com os índices documentados | documentado | `MODELO-DE-DADOS.md` — IndexedDB; `WEB.md` — Contrato com o core |
| BOS-42 | Um teste lê o `MODELO-DE-DADOS.md` e reprova se o código divergir do doc | documentado | `WEB.md` — Contrato com o core; `PLANO-DE-TESTES.md` — `W-11` |
| BOS-42 | Round-trip por entidade, com `late` 0/1 virando boolean e chaves derivadas iguais às do CLI | documentado | `MODELO-DE-DADOS.md` — Entidades e Contrato JSON v1; `WEB.md` |
| BOS-42 | A fila com 5.000 itens fica abaixo de 200ms, medido e registrado | documentado | `REQUISITOS.md` — RNF-03; `PLANO-DE-TESTES.md` — `W-11` |
| BOS-42 | Os testes do web rodam sem rede | documentado | `REQUISITOS.md` — RNF-01; `WEB.md` — Convenções |
| BOS-43 | Adicionar item com título, matéria e dificuldade de 1 a 5 (`RF-01`) | documentado | `WEB.md` — Telas e fluxos |
| BOS-43 | Lista com filtro por matéria e status, ordenada por vencimento, com busca (`RF-02`, `RF-24`) | documentado | `WEB.md` — Telas e fluxos |
| BOS-43 | Fila do dia com atrasados primeiro e resumo por matéria (`RF-05`, `RF-07`) | documentado | `WEB.md` — Telas e fluxos |
| BOS-43 | Check-in recalcula o vencimento e pede a reavaliação de dificuldade (`RF-08`, `RF-12`) | documentado | `WEB.md` — Telas e fluxos |
| BOS-43 | Arquivar e desarquivar tiram o item da fila e das contagens (`RF-14`, `RF-15`) | documentado | `WEB.md` — Telas e fluxos |
| BOS-43 | Stats mostram streak, contagens e check-ins do dia (`RF-21`..`RF-23`) | documentado | `WEB.md` — Telas e fluxos |
| BOS-43 | As strings em pt-BR ficam centralizadas em um único módulo | documentado | `REQUISITOS.md` — RNF-06; `WEB.md` — Convenções |
| BOS-43 | Testes de Testing Library para adicionar, fila, check-in e arquivar | documentado | `PLANO-DE-TESTES.md` — Estratégia e Casos por camada |
| BOS-44 | Export baixa um arquivo com `schema_version` e todos os dados, inclusive histórico e arquivo morto | documentado | `REQUISITOS.md` — RF-18; `MODELO-DE-DADOS.md` — Contrato JSON v1; `WEB.md` — Telas e fluxos |
| BOS-44 | Import mescla por UUID e não duplica, provado por duas importações do mesmo arquivo | documentado | `REQUISITOS.md` — RF-19; ADR-022; `WEB.md` |
| BOS-44 | O merge segue o `updated_at` | documentado | ADR-022; `MODELO-DE-DADOS.md` — Contrato JSON v1 |
| BOS-44 | A interface confirma a operação e informa as contagens do que foi mesclado | documentado | `WEB.md` — Telas e fluxos |
| BOS-44 | Um teste cruzado prova que o arquivo do web abre no import do CLI, e vice-versa | documentado | `WEB.md` — Critérios de aceite; `PLANO-DE-TESTES.md` — `W-09` |
| BOS-44 | O export segue disponível mesmo com o banco corrompido, quando o arquivo existir | documentado | `REQUISITOS.md` — RNF-07; `WEB.md` — Estados |
| BOS-45 | A URL pública serve a versão de `main` e o app abre em um navegador limpo | implementação/deploy | — |
| BOS-45 | Depois do primeiro carregamento o app funciona offline, com os dados no IndexedDB | documentado | `REQUISITOS.md` — RNF-01; `WEB.md` — Convenções |
| BOS-45 | Nenhum segredo ou chave no repositório ou no bundle | implementação/deploy | — |
| BOS-45 | O passo de deploy está documentado no `README.md`, e um ADR registra o host escolhido e o motivo | implementação/deploy | — |
| BOS-45 | A linha do deploy no `ROADMAP.md` fica `[x]` quando a URL estiver no ar | implementação/deploy | — |

Nenhum critério caiu na classe **ajustado**: todos ou têm fonte documental agora, ou são de implementação/deploy e seguem válidos como estão. Um critério só é ajustado no Linear quando contradiz o documento-fonte.

## Fonte de verdade

- `docs/especificacao/REQUISITOS.md` — `RF`, `RN`, `RNF` e `CA`.
- `docs/especificacao/MODELO-DE-DADOS.md` — entidades, schema e contrato JSON.
- `docs/especificacao/CORE.md` — API do domínio e erros.
- `docs/engenharia/PLANO-DE-TESTES.md` — `T-nn`, `C-nn`, `S-nn` e as faixas `W`/`P`/`M`/`D`.
- As specs das camadas referenciam esses IDs e nunca renumeram.
