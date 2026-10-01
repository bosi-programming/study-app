---
titulo: 'Roll-forward do streak na abertura do web'
data: '2026-10-01'
status: 'aceito'
---

# Roll-forward do streak na abertura do web

- Contexto: o [Roll-forward do streak de fila zerada no gancho de contexto](gancho-do-streak-de-fila-zerada.md) pôs o recálculo no gancho de contexto do CLI, antes e depois do `run()` de cada comando com banco. O web não tem comando nem `run()`: é uma SPA de sessão longa, e sem um ponto equivalente o `meta.streak_current` só mudaria por import — os stats (RF-21) mostrariam o valor deixado pelo último import, não o de hoje. O cálculo já vive no core (`advanceQueueStreak`/`hasDueItems`, RN-14) e o banco vazio carimba 1, não 0.
- Decisão: o web faz o roll-forward em `apps/web/src/queueStreak.ts`, chamado na abertura do app e depois de cada mutação que muda a fila — check-in, aplicação da reavaliação, arquivar e desarquivar. Lê `streak_current`/`streak_last_day` do `meta`, decide a fila vazia com `hasDueItems(store.listItems(), today)` e grava `advanceQueueStreak(...)` numa `store.transaction`, como o gancho do CLI.
- Decisão: o `today` vem de `deps.clock.todayLocalDate()`, nunca do relógio da UI, e o cálculo continua no core. A borda do web só lê e grava o `meta`, sem reinterpretar os ramos de dia do core nem inventar chave.
- Decisão: a abertura falha alto. A rejeição do roll-forward vira o estado de erro do shell, com a mensagem da tabela `## Erros` do `WEB.md`, em vez de renderizar as telas com um streak que não foi carimbado.
- Consequência: os stats mostram o streak de hoje já na primeira renderização; em troca, a abertura paga uma leitura de `listItems` mais uma transação de escrita em `meta` antes de mostrar qualquer tela.
- Consequência: banco novo ou vazio com a fila vazia carimba 1, e a abertura seguinte em outro dia soma — o mesmo comportamento do CLI, e o que faz o `CA-16` fechar no web.
- Consequência: a mesma `rollQueueStreak` roda depois de adicionar um item, que o critério de aceite não lista. O Tasting registrou como scope creep e o código ficou: sem isso, um item criado para hoje deixaria o streak de hoje carimbado só até a próxima abertura.
- Alternativa rejeitada: espelhar o gancho do CLI com um par antes/depois por tela — o web não tem o `run()` que define o par, e cinco controllers repetiriam a chamada até a próxima tela esquecer.
- Alternativa rejeitada: carimbar só no check-in — um item devolvido à fila, um item criado para hoje ou uma fila que zerou sem check-in ficariam com o streak do dia anterior.
- Alternativa rejeitada: deixar o roll-forward para o import — não há import no web nesta entrega (BOS-44) e a leitura de hoje não pode depender de uma tela que ainda não existe; quando ela chegar, reusa a mesma decisão do CLI.
- Gatilho de revisão: o streak passar a ser por matéria, ou o web ganhar um ponto de carimbo fora da abertura e das mutações de fila (rota que restaura de um import, sessão retomada).
