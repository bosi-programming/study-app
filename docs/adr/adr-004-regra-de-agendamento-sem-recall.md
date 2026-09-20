---
numero: 4
titulo: 'Regra de agendamento sem recall'
data: '2026-09-10'
status: 'superado-parcialmente'
supersededBy: [11]
---

# ADR-004 — Regra de agendamento sem recall

- Contexto: check-in "estudei agora" sem pergunta de lembrete.
- Decisão: intervalo = min(365, base(dificuldade) × 2^n), com n = check-ins.
- Atraso não penaliza; reavaliação manual muda a base com o mesmo n.
- Sugestão de reavaliação após 3 check-ins no prazo. Superado pelo [ADR-011](adr-011-reavaliacao-de-dificuldade-a-cada-check-in.md): a reavaliação passou a ser pedida a cada check-in.
- Consequência: menos dados de aprendizado real; FSRS fica para quando houver histórico.
