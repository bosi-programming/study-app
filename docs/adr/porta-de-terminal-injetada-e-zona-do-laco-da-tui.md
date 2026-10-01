---
titulo: 'Porta de terminal injetada e a zona do laço da TUI'
data: '2026-10-01'
status: 'aceito'
---

# Porta de terminal injetada e a zona do laço da TUI

- Contexto: a [Porta de abertura do contexto e sessão longa da TUI](porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md) fixou `apps/cli/src/tui/session/` como contrato de estado puro, sem I/O de terminal, e o [Teclas da TUI como adaptador de entrada puro](teclas-da-tui-como-adaptador-de-entrada-puro.md) fixou `apps/cli/src/tui/keys.ts` como parser puro. A `docs/especificacao/TUI-RENDER.md` fixou o `RenderState` e `render(state)`. Faltava ligar os três num laço: ler teclado, traduzir em ação, aplicar na sessão, montar o `RenderState`, desenhar e escrever um frame por mudança. O ciclo de vida do terminal (raw mode, tela alternativa, cursor, `SIGWINCH`, `SIGTERM`/`SIGHUP`, restauração e exit codes do processo) fica com a ENG-29 (BOS-54).
- Decisão: o laço mora em `apps/cli/src/tui/loop/` como pasta-módulo (Convenção de módulo) na zona `root` do `architecture.test.ts`, como `tui/keys.ts`. O laço é raiz de composição: importa o controller (`tui/session/`), a view (`tui/render/`) e o model (store). Nenhum arquivo de `tui/loop/**` toca `process.`, `node:*`, `setRawMode` ou `SIGWINCH`; um teste estrutural pina a zona e a ausência desses acessos.
- Decisão: a porta é `TuiTerminal = { size(), next(), write(frame), error(message) }`. `next()` devolve `{ kind: 'key', chunk }`, `{ kind: 'resize', columns, rows }` ou `null` (fim da entrada, tratado como `interrupt`). O laço nunca lê `stdin`, nunca ouve `SIGWINCH` e nunca chama `process.exit`; o dono do terminal faz isso.
- Decisão: `apps/cli/src/tui/terminal/` entrega o binding fino de processo (`process.stdin`/`stdout`/`stderr`, tamanho de `stdout`, evento de `resize`) que implementa a porta e faz `study tui` funcionar em TTY. A ENG-29 endurece esse binding com raw mode, tela alternativa, cursor, sinais e restauração sem mudar a porta.
- Decisão: `runTui` devolve `quit`/`interrupt`/`fatal` e o root (`cli.ts`) aplica `exitCodeOf` — quit 0, interrupt 130, fatal 1 — sem que o laço toque `process`.
- Consequência: o laço é provado sem PTY e sem raw mode: o teste injeta um terminal com roteiro de eventos e captura os frames escritos e o desfecho. O PTY real segue verificação manual, como o `T-26`.
- Consequência: a recusa fora de terminal interativo é um predicado puro (`refuseTui`) que o `cli.ts` chama antes de `withContext`, então nenhum banco é aberto sem TTY.
- Alternativa rejeitada: o laço ler `process.stdin` direto — só se provaria com PTY e misturaria o ciclo de vida do terminal, que é da ENG-29.
- Alternativa rejeitada: a porta virar só `next()` com callback de evento — não cobriria o tamanho inicial nem separaria a escrita do erro do canal de frame.
- Alternativa rejeitada: o laço aplicar `process.exitCode` — quebra a fronteira com a ENG-29, que é quem restaura o terminal e conhece o exit de processo.
- Gatilho de revisão: a ENG-29 precisar de um evento além de tecla e resize (sinal), ou o laço passar a precisar de I/O de processo que a porta não expresse.
