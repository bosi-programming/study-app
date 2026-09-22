---
numero: 15
titulo: 'Golden fixtures: formato do vetor e quem valida'
data: '2026-09-22'
status: 'aceito'
---

# ADR-015 — Golden fixtures: formato do vetor e quem valida

- Contexto: o `docs/engenharia/PLANO-DE-TESTES.md` fixou os golden fixtures como fonte única de verdade da regra de agendamento, mas o formato documentado descrevia só a progressão de intervalo. A ENG-4 (BOS-29) precisava cobrir `T-01`..`T-05`, `T-11`, `T-12`, `T-20` e `T-21` lendo os fixtures — e precisava decidir quem falha quando o vetor diverge da regra.
- Decisão: um arquivo por caso em `fixtures/golden/*.json`, com o envelope `case`, `kind` e `requirement`. O `kind` discrimina o union `GoldenFixture` de `@study/golden` e define quais chaves o caso traz: `initial-due`, `progression`, `checkin`, `reevaluate`, `queue-order`, `normalize` e `queue-streak` cobrem os nove `T-nn` da ENG-4, e a tabela por `kind` no plano de testes diz qual campo é estado inicial, ação, parâmetros e resultado esperado.
- O caso `progressao-ate-teto` manteve os campos do exemplo documentado (`difficulty`, `base_interval_days`, `cap_days`, `checkins`, `expected_intervals`) e ganhou só o envelope; o exemplo do plano de testes passou a mostrá-lo.
- `@study/golden` continua pacote só de dados: publica o union e a lista `goldenFixtures`, sem API de Node e sem dependência de runtime (o `S-10` continua valendo). O union é escrito à mão e cada fixture é asserido ao seu tipo na importação; o `S-03` é quem confere as chaves em runtime, porque o TypeScript só estreita `string` nos imports de JSON.
- Quem valida: `packages/core/test/golden.test.ts` lê os vetores, computa com `@study/core` e compara com o `expected` de cada caso. Ele é executado pelo projeto `golden` do `vitest.config.ts` e excluído do projeto `core`, então `pnpm test:golden` roda os casos de forma e o runner dos vetores, e falha quando um `expected` diverge. O `S-20` pina essa fiação, para que mover o arquivo não desligue o gate em silêncio.
- Consequência: adicionar um caso exige tocar o union em `fixtures/golden/src/index.ts`, a tabela de `kind`s do `S-03` e o runner do core. Os nove `T-nn` da ENG-4 ficam garantidos pelo `S-18`.
- Consequência: a meta de >= 90% de linhas de `packages/core` deixou de ser declaração e virou gate executável — `pnpm test:coverage` com o provider v8 e `thresholds.lines: 90` (100% em 2026-09-22). O `S-19` pina o script e o threshold.
- Alternativa rejeitada: `fixtures/golden` depender de `@study/core` para validar os próprios vetores. Testada com `pnpm install`: `@study/core` já depende de `@study/golden` para ler os vetores, e o ciclo faz o pnpm avisar "cyclic workspace dependencies" em toda instalação.
- Alternativa rejeitada: reimplementar a fórmula dentro do validador de fixtures — o pacote de fixtures passaria a ter uma segunda cópia da regra, que é o que a fonte única de verdade existe para impedir. E validação de forma não pega um `expected` divergente, que é justamente o que o `pnpm test:golden` precisa pegar.
- Gatilho de revisão: um segundo consumidor (web, mobile ou desktop) querendo ler os vetores, ou o Vitest deixar de aceitar um projeto com raiz na raiz do repo — aí a divisão entre validar forma e validar comportamento volta à mesa.
