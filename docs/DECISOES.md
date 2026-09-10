# Registro de Decisões (ADRs)

Data: 2026-09-09 | Base: `FEASIBILITY.md` e sessão de grill

## ADR-001 — Core TS compartilhado com iOS nativo Swift

- Contexto: CLI e web serão TypeScript; o iOS será Swift nativo.
- Decisão: `packages/core` em TS puro para CLI e web; regra reimplementada em Swift.
- Conformidade: golden fixtures em `fixtures/golden` consumidos pelos dois lados.
- Consequência: duas implementações da regra; divergência detectável em build.
- Alternativas rejeitadas: Expo (compartilharia TS, mas contraria a escolha nativa); FFI/Rust (custo alto para função pequena).

## ADR-002 — Local-first com backend adiado

- Contexto: uso pessoal, sem necessidade de conta na V1.
- Decisão: dados locais em todas as plataformas; JSON versionado como ponte.
- Gatilho do Postgres: CLI + web usados diariamente na mesma semana.
- Consequência: sem custo de infraestrutura agora; sync exigirá merge por `updated_at`.

## ADR-003 — Engine de dados por plataforma

- Contexto: cada plataforma tem um armazenamento local natural.
- Decisão: SQLite no CLI e no iOS; IndexedDB no web.
- Consequência: três implementações de persistência; schema canônico único e testes de contrato.
- Alternativa rejeitada: localStorage no web (limites e perda de dados).

## ADR-004 — Regra de agendamento sem recall

- Contexto: check-in "estudei agora" sem pergunta de lembrete.
- Decisão: intervalo = min(365, base(dificuldade) × 2^n), com n = check-ins.
- Atraso não penaliza; reavaliação manual muda a base com o mesmo n.
- Sugestão de reavaliação após 3 check-ins no prazo.
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
- Decisão: CLI → web (gate de consistência pessoal) → piloto (gate de retenção) → iOS.
- iOS exige Xcode (pendente), conta Apple e spike de 1 semana.
- Alternativa rejeitada: construir as três em paralelo (risco de UI sem produto validado).
