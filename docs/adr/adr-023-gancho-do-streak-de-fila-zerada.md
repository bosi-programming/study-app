---
numero: 23
titulo: 'Roll-forward do streak de fila zerada no gancho de contexto, com export/import/init isentos'
data: '2026-09-24'
status: 'aceito'
---

# ADR-023 — Roll-forward do streak de fila zerada no gancho de contexto

- Contexto: o [ADR-021](adr-021-ciclo-de-vida-do-item-e-arquivo-morto.md) fixou o gancho de contexto (`buildContext`/`withContext`) como o ponto por onde todo comando com banco passa, e o `packages/core` já calcula o streak desde a ENG-3 (`advanceQueueStreak`/`hasDueItems`, T-21, vetor `streak-de-fila-zerada`) — mas nada em produção o chamava: `meta.streak_current` e `meta.streak_last_day` só mudavam por `import`. O `docs/especificacao/REQUISITOS.md` define o streak como "recalculado a cada execução" (RN-14) e o `docs/especificacao/CLI.md` lista `study stats` desde antes de o comando existir. Faltava decidir por onde o recálculo entra, em que ordem em relação ao comando e quem fica de fora.
- Decisão: o roll-forward roda no **gancho de contexto**, ao lado da migração do arquivo morto, e **duas vezes** por comando com banco — uma antes do `run()` e outra depois dele, quando o `run()` termina bem. Antes porque `stats` é um comando de leitura e imprimiria o valor velho; depois porque uma mutação que muda a fila (item devolvido à fila com vencimento passado, check-in que esvazia a fila) tem que marcar o dia em que aconteceu. Um comando que falha não passa pelo gancho de saída: o de entrada já carimbou, e carimbar de novo não acrescentaria nada.
- Decisão: o cálculo continua **no core**, uma vez só. O módulo novo `apps/cli/src/queueStreak.ts` só lê as duas chaves de `meta`, decide a fila vazia com `hasDueItems(store.listItems(), today)` e grava `advanceQueueStreak(...)` numa transação. A borda não reinterpreta `C-33`/`C-36` (dia futuro, ausente, virada de mês) nem inventa chave: as duas chaves já estão no `MODELO-DE-DADOS` e o export/import já as tratam como valor visível (ADR-022).
- Decisão: **`export`, `import` e `init` ficam isentos** pelo campo `skipStreakHook` da tabela `CONTEXT_EXCEPTIONS` que o ADR-022 já mantém, e nenhum comando decide isso por conta própria. `export` não escreve (RNF-07, é a saída de emergência). `import` grava o `meta` do arquivo, e o gancho o sobrescreveria na mesma execução. `init` fecha e substitui o `store` no meio do comando, então o gancho de saída não teria onde escrever — e o banco que sai dele é novo, com o primeiro comando carimbando o streak.
- Decisão: o **streak é global**, mesmo com `-s` em `stats`. RN-14 o define sobre a fila inteira e `meta` não tem streak por matéria; `-s` recorta as contagens (RF-22) e os check-ins (RF-23), não a consistência.
- Consequência: toda execução de comando com banco passa a escrever até duas vezes em `meta`. `due`, `list`, `find`, `show`, `edit` e `review` continuam lendo a mesma tabela de itens e os envelopes deles não mudam; o único efeito colateral visível é o streak andar sozinho, que é o pedido do RF-21.
- Consequência: banco novo ou vazio com a fila vazia carimba **1**, não 0 — é o ramo `last_day` ausente do `C-33`, e é o que faz o CA-16 dar 3 em três dias locais consecutivos. Um dia com item devido carimba 0 e o mesmo dia não soma de novo.
- Consequência: `apps/cli/test/commands/config.test.ts` deixa de usar `streak_current` como sentinela de "meta intacto" — o gancho agora o carimba legitimamente em toda execução — e passa a usar `locale`. A intenção do caso (chave não relacionada preservada) continua a mesma.
- Alternativa rejeitada: recalcular dentro de cada comando — repetiria a decisão seis vezes, deixaria a próxima superfície esquecer e contradiria o argumento que já escolheu o gancho para a migração do arquivo morto.
- Alternativa rejeitada: rodar só depois do `run()` — `stats` imprimiria o valor de ontem, e o comando existe justamente para ler o streak de hoje.
- Alternativa rejeitada: deixar o `import` passar pelo gancho — o roll-forward sobrescreveria o `meta` do arquivo que o import acabou de gravar, quebrando o round-trip do ADR-022.
- Gatilho de revisão: o streak passar a ser por matéria (aí `meta` deixa de bastar e o cálculo sai do gancho global), ou uma superfície que precise ler o streak *sem* carimbá-lo.
