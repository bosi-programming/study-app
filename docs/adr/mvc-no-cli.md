---
titulo: 'MVC no CLI: camadas explícitas e o controller que devolve view-model'
data: '2026-09-30'
status: 'aceito'
---

# MVC no CLI: camadas explícitas e o controller que devolve view-model

- Contexto: `apps/cli` cresceu ticket a ticket sem fronteiras. Cada `commands/*` valida flags, orquestra domínio e formata a saída, devolvendo `{ json, human }` e importando `output/human.ts` e `output/json.ts` direto. O `cli.ts` mistura dispatch, texto de uso e exceções de contexto, e a apresentação fica espalhada por 17 comandos.
- Contexto: o [Core TS compartilhado](core-ts-compartilhado-por-cli-web-mobile-e-desktop.md) já fixa o core como domínio; o [Porta de abertura do contexto e sessão longa da TUI](porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md) já fixa `tui/session/` como contrato de estado sem I/O de terminal. Faltava a direção de imports entre as camadas do CLI.
- Decisão: `apps/cli/src` passa a ter três camadas e uma raiz de composição, com direção de import fixada. O model não importa view nem controller; a view não importa controller; o root importa tudo.
- Decisão: model = `persistence/**` + `model/**`. Para o model vão `config`, `queueStreak`, `coldArchive`, `import`, o contrato JSON v1 (`json.ts`), as migrações (`migrations.ts`), a escrita atômica (`file.ts`), as derivações de fila (`queue.ts`) e o contrato controller↔view (`results.ts`).
- Decisão: view = `output/**`. `human.ts` mantém só formatação; `render.ts` é o único ponto que vira view-model em texto; `usage.ts` guarda o `USAGE`; `index.ts` renderiza os dois canais. `prompt.ts` é adaptador de entrada, não view.
- Decisão: controller = `commands/**` + `tui/session/**`. Zero import de `output/**` e zero I/O de processo.
- Decisão: o controller devolve `{ json, view }`. O `json` é byte-a-byte o payload atual; o `view` é um `CommandView` discriminado, com os objetos de domínio que o humano precisa.
- Decisão: `CommandView` e `CommandResult` vivem em `model/results.ts`, neutro. A view importa o contrato sem depender do controller, e `commands/types.ts` reexporta `CommandResult` para os testes que já o importam.
- Decisão: o check-in do `review` vira porta opcional `ctx.emit?.checkin(item)`. O controller declara a interface; o root injeta a implementação, que escreve a mesma linha no stdout. Preserva os bytes e a ordem em TTY.
- Decisão: um teste estrutural em `apps/cli/test/architecture.test.ts` varre `src` e falha se o controller importar a view, se a view importar o controller, se o model importar qualquer um dos dois, ou se o controller usar `process.stdout`/`stderr`/`stdin`.
- Consequência: um só lugar formata. Mudança de saída deixa de passear por 17 comandos. As fases seguintes (web, mobile, desktop) herdam o mapa de camadas do CLI.
- Consequência: o usuário do CLI não vê diferença. A saída continua byte-a-byte igual, de propósito.
- Consequência: `core` e `golden` ficam intocados; nenhuma dependência de runtime entra; o parser `args.ts` continua o mesmo.
- Alternativa rejeitada: adotar o pacote `commander`. O `args.ts` é hand-rolled e sem dependência de runtime; "commander" aqui é a interface, não a lib.
- Alternativa rejeitada: mover o domínio de `packages/core` para o CLI. O core já é o Model e todos os testes de core e golden dependem dele.
- Alternativa rejeitada: injetar o `prompt` pelo contexto. Quebraria o `vi.mock` de `review.test.ts`; o teste estrutural cobre `output/**`, a view de saída.
- Gatilho de revisão: uma quarta superfície precisar de um contrato de saída que o `CommandView` não expresse, ou o root voltar a crescer com regra de negócio em vez de fiação.
