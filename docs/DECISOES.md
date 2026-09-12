# Registro de Decisões (ADRs)

Data: 2026-09-09 | Atualizado: 2026-09-12 | Base: `FEASIBILITY.md` e sessão de grill

## ADR-001 — Core TS compartilhado por CLI, web, mobile e desktop

- Contexto: CLI e web já são TypeScript; mobile (iOS + Android) e desktop precisam reusar o mesmo domínio.
- Decisão: `packages/core` em TS puro, consumido por CLI, web, React Native (Expo) e desktop (Electron); sem reimplementação em outra linguagem.
- Conformidade: golden fixtures em `fixtures/golden` como vetores de regressão de todos os apps; `packages/core` sem APIs de Node ou browser.
- Consequência: uma implementação da regra; divergência vira bug de integração, não de paridade de algoritmo.
- Supersede: a versão anterior deste ADR previa iOS nativo em Swift. Swift nativo agora é alternativa rejeitada (duas implementações da regra e apenas uma das lojas).

## ADR-002 — Local-first com backend adiado

- Contexto: uso pessoal, sem necessidade de conta na V1.
- Decisão: dados locais em todas as plataformas; JSON versionado como ponte.
- Gatilho do Postgres: CLI + web usados diariamente na mesma semana.
- Consequência: sem custo de infraestrutura agora; sync exigirá merge por `updated_at`.

## ADR-003 — Engine de dados por plataforma

- Contexto: cada plataforma tem um armazenamento local natural.
- Decisão: SQLite no CLI; `expo-sqlite` no mobile; IndexedDB no web e no desktop.
- Consequência: três implementações de persistência; schema canônico único e testes de contrato.
- Alternativa rejeitada: localStorage no web (limites e perda de dados).

## ADR-004 — Regra de agendamento sem recall

- Contexto: check-in "estudei agora" sem pergunta de lembrete.
- Decisão: intervalo = min(365, base(dificuldade) × 2^n), com n = check-ins.
- Atraso não penaliza; reavaliação manual muda a base com o mesmo n.
- Sugestão de reavaliação após 3 check-ins no prazo. Superado pelo ADR-011: a reavaliação passou a ser pedida a cada check-in.
- Consequência: menos dados de aprendizado real; FSRS fica para quando houver histórico.

## ADR-005 — Arquivo morto em 180 dias

- Contexto: fila não pode crescer para sempre; histórico não pode ser destruído.
- Decisão: `active` → `archived` → `cold` após 180 dias, configurável.
- `cold` vive em store separado, com export JSON automático; restore e purge manual.
- Consequência: export é o backup real; purga é a única operação destrutiva.

## ADR-006 — Sentry no piloto

- Contexto: piloto web com dados locais não dá visibilidade de uso.
- Decisão: Sentry com erros + eventos anônimos; aviso LGPD de 1 parágrafo.
- Consequência: retenção mensurável sem backend; exige disciplina de não enviar dado pessoal.

## ADR-007 — Ordem de construção com gates

- Contexto: paridade entre plataformas é o alvo, mas o ritmo é limitado.
- Decisão: CLI → web (gate de consistência pessoal) → piloto (gate de retenção) → mobile React Native (iOS + Android) → desktop.
- Mobile exige conta Apple (US$ 99/ano) e Google Play (US$ 25 único); EAS Build dispensa Xcode local.
- Desktop reaproveita o renderer do web e pode entrar logo após a fase 2, sem esperar o mobile.
- Alternativa rejeitada: construir as quatro em paralelo (risco de UI sem produto validado).

## ADR-008 — Mobile com React Native (Expo)

- Contexto: iOS e Android precisam do mesmo produto, com <10h/semana e o core já em TS.
- Decisão: React Native com Expo para iOS e Android, consumindo `packages/core` e persistindo em `expo-sqlite`.
- Consequência: uma base de UI para as duas lojas e nenhuma reimplementação da regra; build iOS via EAS sem Xcode local.
- Alternativas rejeitadas: Swift nativo + Kotlin (duas bases e duas regras); Flutter (Dart fora do stack TS).

## ADR-009 — Desktop com Electron reaproveitando o web

- Contexto: o desktop precisa ser barato e o web já entrega os fluxos completos em React.
- Decisão: `apps/desktop` encapsula o renderer de `apps/web` em Electron, com a mesma persistência IndexedDB.
- Consequência: desktop quase de graça, com UI única em relação ao web; Electron é Node/TS puro.
- Alternativas rejeitadas: Tauri (reintroduz Rust, já rejeitado no ADR-001); React Native macOS/Windows (não cobre Linux e criaria uma segunda UI).

## ADR-010 — Referência de item por UUID, prefixo ou título

- Contexto: digitar o UUID inteiro é atrito, e títulos podem duplicar.
- Decisão: todo comando aceita `<ref>` = UUID exato, prefixo único de 4+ caracteres ou título exato normalizado (`title_key`).
- Ambiguidade é erro de estado (exit 3) com a lista de candidatos; o CLI nunca escolhe sozinho.
- Consequência: coluna `title_key` e índice novos; `study find` cobre busca parcial, que não serve como referência.

## ADR-011 — Reavaliação de dificuldade a cada check-in

- Contexto: a sugestão após 3 check-ins no prazo era fácil de ignorar e a dificuldade declarada envelhecia.
- Decisão: todo `study review` pergunta a dificuldade, com a atual como padrão; Enter mantém e `--difficulty` pula o prompt.
- O check-in é gravado antes do prompt; abortar mantém o check-in e não altera a dificuldade.
- Prompts só existem com terminal interativo: `--json`, stdin não-TTY ou `--no-input` exigem o valor por flag.
- Consequência: `on_time_streak` deixa de alimentar sugestão e vira histórico de pontualidade. Supera parte do ADR-004.

## ADR-012 — Init destrutivo com backup e confirmação reforçada

- Contexto: recriar o banco apaga itens, histórico e arquivo morto.
- Decisão: `study init` com banco existente pergunta; confirmar exige `--reset --yes`, e um export JSON de backup vai para `<data-dir>/backups/pre-reset-<timestamp>.json` antes da recriação.
- Se o backup falhar, o banco não é alterado.
- Consequência: a recriação é sempre precedida de backup; a purga segue como a outra operação destrutiva.
