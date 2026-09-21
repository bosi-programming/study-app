---
numero: 11
titulo: 'Reavaliação de dificuldade a cada check-in'
data: '2026-09-12'
status: 'aceito'
supersedes: [4]
---

# ADR-011 — Reavaliação de dificuldade a cada check-in

- Contexto: a sugestão após 3 check-ins no prazo era fácil de ignorar e a dificuldade declarada envelhecia.
- Decisão: todo `study review` pergunta a dificuldade, com a atual como padrão; Enter mantém e `--difficulty` pula o prompt.
- O check-in é gravado antes do prompt; abortar mantém o check-in e não altera a dificuldade.
- Prompts só existem com terminal interativo: `--json`, stdin não-TTY ou `--no-input` exigem o valor por flag.
- Consequência: `on_time_streak` deixa de alimentar sugestão e vira histórico de pontualidade. Supera parte do [ADR-004](adr-004-regra-de-agendamento-sem-recall.md).
