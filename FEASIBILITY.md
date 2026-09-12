# Estudo de Viabilidade — App de Estudo Espaçado

Data: 2026-09-09 | Atualizado: 2026-09-12
Status: decisões aprovadas; nenhum código escrito

Documentos de engenharia: `docs/README.md`.

## Resumo

- Produto: app pessoal de repetição espaçada que diz o que revisar hoje.
- Estratégia: local-first, multiplataforma, sem quiz.
- Ordem: CLI → web (valida pilotos) → mobile React Native (iOS + Android) → desktop (após gate).
- Arquitetura: core TS compartilhado por CLI, web, mobile e desktop; Electron reaproveita o renderer do web.
- Custo mínimo: 0 até publicar; US$ 25 único (Google Play) + US$ 99/ano (Apple) só na fase de lojas.
- Ritmo: <10h/semana — CLI ~5–7 semanas, web +6–8 semanas, mobile +6–10 semanas, desktop +1–2 semanas.
- Maior risco: escopo de quatro plataformas com <10h/semana, não a viabilidade técnica.

## Produto

- Usuário primário: o autor. Secundário: 3–5 estudantes no piloto web.
- Item de estudo: título, matéria obrigatória (string simples), nota/link opcional.
- Sem quiz, flashcards ou hospedagem de conteúdo na V1.
- Check-in único "estudei agora", sem pergunta de recall.
- Dificuldade 1–5 com rótulos, definida na criação e reavaliável.

## Regra de agendamento

- Intervalo inicial por dificuldade:

| Dificuldade | Sentido | 1º intervalo |
| --- | --- | --- |
| 1 | trivial | 10 dias |
| 2 | fácil | 7 dias |
| 3 | médio | 5 dias |
| 4 | difícil | 3 dias |
| 5 | muito difícil | 2 dias |

- Cada revisão feita no prazo multiplica o intervalo por 2.
- Teto de 365 dias por item.
- Reavaliação manual de dificuldade a qualquer momento muda a base na hora.
- Reavaliação de dificuldade pedida a cada check-in, com a atual como padrão.
- Atrasados acumulam na fila, aparecem primeiro, sem penalidade.
- Fila do dia completa, sem limite diário.

## Ciclo de vida do item

| Estado | Aparece na fila | Reversível | Armazenamento |
| --- | --- | --- | --- |
| ativo | sim | — | banco principal |
| arquivado | não | sim | banco principal |
| arquivo morto | não | sim (restore) | store separado + JSON |

- Arquivamento manual quando o conteúdo é dominado (graduar).
- Migração para arquivo morto: 180 dias arquivado sem restauração, configurável.
- Aviso antes da migração.
- Restauração via `study cold list` / `study cold restore`.
- Purga somente manual, com confirmação.
- Export JSON automático a cada migração para o arquivo morto.

## Dados

- Local-first em todas as plataformas; sem conta na V1.
- Engines: SQLite (CLI), expo-sqlite (mobile), IndexedDB (web e desktop).
- Contrato de dados: JSON versionado, IDs UUID, timestamps ISO 8601.
- Schema canônico único, preparado para a futura migração Postgres.
- Item: id, título, matéria, dificuldade, nota/link, intervalo atual, vencimento, última revisão, contagem de revisões, status, timestamps.
- ReviewLog: id do item, data, intervalo resultante.
- Sync/Postgres entra quando CLI + web forem usados diariamente na mesma semana.

## Arquitetura

```
packages/core      regra + domínio + testes + golden fixtures (TS puro)
apps/cli           TypeScript + commander + SQLite
apps/web           React + Vite + IndexedDB
apps/mobile        React Native + Expo + expo-sqlite (iOS + Android)
apps/desktop       Electron reaproveitando o renderer de apps/web
fixtures/golden    vetores entrada/saída compartilhados por todos os apps TS
```

- Monorepo com pnpm workspaces.
- CLI, web, mobile e desktop consomem o mesmo core TS.
- `packages/core` é TS puro, sem API de Node ou browser (relógio e IDs injetáveis), para rodar igual em todos os runtimes.
- Mobile: React Native com Expo (iOS + Android); persistência em `expo-sqlite` com o schema canônico.
- Desktop: Electron encapsula o renderer do web; mesma persistência IndexedDB.
- Sem reimplementação da regra em outra linguagem; golden fixtures seguem como vetores de regressão.
- Sem FFI/Rust: a regra é uma função pura pequena.

## Plataformas e ordem

| Fase | Entrega | Gate |
| --- | --- | --- |
| 1 | CLI completo | uso próprio consistente |
| 2 | Web + deploy | 2–4 semanas com >= 70% dos dias com fila zerada |
| 3 | Piloto web | 3–5 estudantes por 2+ semanas |
| 4 | Mobile React Native (iOS + Android) | só após retenção no piloto |
| 5 | Desktop (Electron) | pode entrar junto do web, que ele reaproveita |

- Mobile exige conta Apple (US$ 99/ano) para a App Store e Google Play (US$ 25 único); EAS Build dispensa Xcode local.
- Antes da fase 4: spike de 1 semana (Expo + expo-sqlite + tela mínima no emulador e no device).

## Validação e observabilidade

- Sucesso pessoal: >= 70% dos dias com fila zerada por 2–4 semanas.
- Sucesso do piloto: 3–5 estudantes por 2+ semanas.
- Piloto local-only: dados no navegador de cada participante.
- Sentry no piloto: erros + eventos de uso anônimos (item criado, check-in, fila vista).
- Aviso de privacidade de 1 parágrafo para os pilotos (LGPD).
- Risco dos dados locais: limpeza de storage apaga tudo → export/import + entrevistas.

## Esforço e custos

Ritmo: menos de 10h/semana.

| Fase | Esforço | Calendário | Custo |
| --- | --- | --- | --- |
| 1. CLI | 6–9 dias de trabalho | 5–7 semanas | 0 |
| 2. Web | 6–10 dias | 6–8 semanas | 0 (free tier) |
| 3. Piloto | 2–4 dias | 2–4 semanas | 0 |
| 4. Mobile (React Native) | 8–14 dias | 6–10 semanas | US$ 99/ano (Apple) + US$ 25 (Google Play) |
| 5. Desktop (Electron) | 2–4 dias | 1–2 semanas | 0 |

- Custos de loja só entram na fase 4; até lá, tudo em free tier.
- Ambiente atual: Node v24 ✓; Xcode ✗ não é necessário (EAS Build compila iOS na nuvem).

## Fora de escopo V1

- Quiz, flashcards, hospedagem de conteúdo.
- Conta, login, sync, backend/Postgres.
- FSRS e adaptatividade além dos parâmetros acima.
- Tags, hierarquia de matérias, metas diárias, gráficos.
- UX de mobile e desktop (notificações, telas, ícones), publicação nas lojas, i18n, monetização.

## Riscos

| Risco | Severidade | Mitigação |
| --- | --- | --- |
| Escopo de quatro plataformas com <10h/semana | Alta | Gates por fase; desktop reaproveita o web; mobile só depois do piloto |
| Curva do React Native / Expo | Média | Spike de 1 semana; core TS puro reusado sem rewrite |
| Divergência entre implementações | Média | Golden fixtures compartilhados por todos os apps TS |
| Rejeição nas lojas (Apple/Google) | Média | EAS Build/Submit, TestFlight e faixa interna antes da publicação |
| Churn / engajamento baixo | Alta | Fila do dia + streak + arquivo morto |
| Mercado competitivo (Anki, Quizlet, RemNote) | Alta | Diferencial: simplicidade + "o que revisar hoje" |
| Perda de dados locais no piloto | Média | Export/import JSON + Sentry |
| LGPD no piloto | Média | Aviso curto; eventos anônimos |

## Próximos passos

- [x] Scaffold do monorepo pnpm com `packages/core` e `apps/cli`.
- [ ] Implementar a regra de agendamento + testes e golden fixtures.
- [ ] Definir schema SQLite e comandos do CLI.
- [ ] Avaliar `node:sqlite` (built-in) vs `better-sqlite3` na fase 1.
- [ ] Só depois: web, piloto, mobile (React Native) e desktop.
