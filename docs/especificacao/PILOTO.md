# Piloto — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-28 | Base: `docs/engenharia/ROADMAP.md`

## Convenções

- Piloto web com 3 a 5 estudantes, por 2+ semanas, sobre o app da Fase 2 (`ROADMAP.md`, `PRD.md`).
- Dados ficam no navegador do piloto; só eventos anônimos saem para o Sentry (RNF-05, Sentry no piloto).
- Sem conta, sem login e sem telemetria fora dos eventos listados (RNF-02).
- A meta é retenção, não volume: >= 50% dos pilotos ativos na 2ª semana e >= 5 itens criados na 1ª semana (`PRD.md`).
- O piloto não muda a regra de agendamento nem o contrato de dados.

## Aviso LGPD

O app guarda os seus dados de estudo apenas neste navegador: título, matéria, nota, link, dificuldade, vencimentos e histórico de check-ins não saem do seu dispositivo e não são enviados a nenhum servidor. Para medir se o piloto funciona, o app envia ao Sentry eventos anônimos de uso — quantos itens foram criados, quantos check-ins foram feitos e quantas vezes a fila foi aberta — sem título, sem matéria, sem nota, sem link e sem identificador de item ou de pessoa. Você pode exportar ou apagar tudo a qualquer momento pela tela de dados, e pode sair do piloto pedindo a remoção dos eventos pelo canal combinado na entrevista.

## Consentimento

1. Antes do primeiro uso, o piloto lê o aviso acima numa tela própria, com o texto na íntegra.
2. A tela tem uma única caixa de seleção, desmarcada: "Li o aviso e aceito participar do piloto com eventos anônimos".
3. Sem a caixa marcada, o app roda normalmente, mas não envia evento nenhum; os dados locais continuam funcionando offline.
4. A escolha fica em `meta` e pode ser revista na tela de config; desmarcar interrompe os envios dali em diante.
5. O consentimento não condiciona nenhuma feature: o app é completo com ou sem ele.

## Eventos do Sentry

| Evento | Quando | Campos | PII |
| --- | --- | --- | --- |
| `item_created` | Um item é criado | dificuldade, origem da tela, total de itens do usuário | nenhuma |
| `checkin` | Um check-in é registrado | dificuldade antes, dificuldade depois, atrasado (boolean), `review_count` | nenhuma |
| `queue_viewed` | A fila é aberta | total de hoje, total de atrasados, tem itens por matéria (boolean) | nenhuma |
| exceções | Erro não tratado no app | nome do erro, tela, versão do app, navegador | nenhuma |

- Regra: nunca enviar título, matéria, nota, link nem id em nenhum evento; nenhum campo é PII.
- Os eventos são anônimos e agregados: nenhum identifica uma pessoa, e não há `user` no Sentry.
- Erro de nível `error` e `fatal` vira exceção; `warning` e abaixo não sai do dispositivo.
- O Sentry é ligado só no piloto (Sentry no piloto); fora dele, nenhum evento é enviado.

## Roteiro de entrevista semanal

Uma conversa por semana com cada piloto, 15 minutos, guiada por quatro perguntas:

1. O que fez você abrir (ou não) o app nesta semana?
2. A fila do dia correspondeu ao que você precisava revisar?
3. Algum intervalo de revisão pareceu errado para a dificuldade que você sentiu?
4. O que você fez quando um item virou dívida: arquivou, ignorou ou revisou?

- Registrar por piloto: semanas ativas, itens criados, fila zerada e motivo de saída quando houver.
- A retenção da 2ª semana sai da lista de ativos por semana; a entrevista só explica o número.
- Encerrar o piloto ao fim de 2 semanas com >= 50% de retenção; caso contrário, registrar o motivo antes de seguir para o mobile.

## Critérios de aceite

- O aviso LGPD tem 1 parágrafo, aparece antes do primeiro uso e cabe numa tela.
- O fluxo de consentimento é opt-in, reversível e não bloqueia nenhuma feature.
- Os três eventos e as exceções têm nome, campos e regra de PII explícitos.
- O roteiro semanal tem as quatro perguntas e a meta de 3 a 5 pilotos por 2+ semanas com retenção >= 50%.
