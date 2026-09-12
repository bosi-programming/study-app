# PRD — App de Estudo Espaçado

Versão: 2 | Data: 2026-09-12 | Base: `FEASIBILITY.md`

## Problema

- Quem estuda sozinho não sabe quando revisar cada conteúdo.
- Revisar cedo demais desperdiça tempo; tarde demais perde retenção.
- Ferramentas existentes (Anki, Quizlet) exigem curadoria de cards e são pesadas para uso casual.

## Proposta

- Registrar o que se estuda, com dificuldade declarada e matéria.
- Registrar check-ins "estudei agora".
- Calcular automaticamente a próxima revisão e mostrar a fila do dia.
- Manter o dado local, sem conta e sem nuvem na V1.

## Público

- Primário: o autor, uso diário, CLI, web, mobile e desktop (fases 1–5).
- Secundário: 3–5 estudantes reais no piloto web, por 2+ semanas.
- Fora do alvo na V1: times, salas de aula, conteúdo compartilhado.

## Jobs to be done

- "Quando eu sentar para estudar, quero saber exatamente o que revisar."
- "Quero registrar que estudei sem responder perguntas."
- "Quero confiar que o intervalo faz sentido para a dificuldade do conteúdo."
- "Quero arquivar o que já dominei sem perder o histórico."

## Escopo V1

| Área | Incluído |
| --- | --- |
| Itens | título, matéria, dificuldade 1–5, nota/link opcional |
| Fila | due do dia com atrasados primeiro, sem limite |
| Check-in | "estudei agora", sem pergunta de recall |
| Agendamento | tabela base, progressão ×2, teto 365d |
| Reavaliação | manual + sugestão após 3 check-ins no prazo |
| Ciclo de vida | ativo, arquivado, arquivo morto em 180d |
| Dados | local-first, export/import JSON versionado |
| Stats | streak, ativos/arquivados, due/atrasados, revisões do dia, por matéria |
| Plataformas | CLI e web na V1; mobile React Native (iOS + Android) e desktop Electron nas fases 4–5 |

## Anti-escopo V1

- Quiz, flashcards, hospedagem de conteúdo.
- Conta, login, sync, backend/Postgres.
- FSRS ou adaptatividade além da regra fixa.
- Tags, hierarquia de matérias, metas diárias, gráficos.
- Apps mobile (React Native: iOS + Android) e desktop, fases 4 e 5 após gate; i18n, monetização.

## Jornadas

### Adicionar e agendar

1. Usuário cria item com título, matéria e dificuldade.
2. Sistema define o vencimento inicial como hoje + intervalo base.
3. Item aparece na fila na data calculada.

### Revisar o dia

1. Usuário abre a fila do dia.
2. Atrasados aparecem primeiro, ordenados por vencimento.
3. Cada item recebe check-in "estudei agora".
4. Sistema multiplica o intervalo por 2 (teto 365d) e recalcula o vencimento.

### Graduar e arquivar

1. Usuário decide que domina o conteúdo e arquiva o item.
2. Item sai da fila, permanece recuperável.
3. Sem restauração em 180 dias, migra para o arquivo morto com aviso.
4. Restauração disponível; purga apenas manual.

## Métricas

| Métrica | Meta | Fonte |
| --- | --- | --- |
| Consistência pessoal | >= 70% dos dias com fila zerada, por 2–4 semanas | uso local |
| Piloto | 3–5 estudantes ativos por 2+ semanas | Sentry + entrevistas |
| Retenção do piloto | >= 50% dos pilotos na 2ª semana | Sentry |
| Itens por usuário | >= 5 itens criados na 1ª semana | Sentry |

## Riscos de produto

| Risco | Mitigação |
| --- | --- |
| Churn alto após a novidade | Fila curta, streak, arquivamento fácil |
| Dificuldade auto-declarada imprecisa | Sugestão de reavaliação após 3 check-ins no prazo |
| Fila virar dívida | Arquivamento + arquivo morto |
| Mercado saturado | Diferencial: simplicidade e "o que revisar hoje" |
