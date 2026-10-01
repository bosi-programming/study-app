---
titulo: 'Superfície da TUI: zero-dep, raw mode, tela alternativa e saída'
data: '2026-10-01'
status: 'aceito'
---

# Superfície da TUI: zero-dep, raw mode, tela alternativa e saída

- Contexto: a [Porta de terminal injetada e a zona do laço da TUI](porta-de-terminal-injetada-e-zona-do-laco-da-tui.md) fixou `TuiTerminal = { size(), next(), write(frame), error(message) }` e entregou o ciclo de vida do terminal (raw mode, tela alternativa, cursor, `SIGTERM`/`SIGHUP`, restauração e exit codes do processo) à ENG-29. A `docs/especificacao/TUI.md` §`Renderização` exige "tela alternativa e cursor oculto durante a sessão; o terminal é restaurado em `q`, `Ctrl-C`, erro fatal e sinais `SIGTERM`/`SIGHUP`", §`Fluxos > Sair` fixa `q`→0 e `Ctrl-C`→130, §`Erros e exit codes` fixa `fatal`→1, e §`Em aberto` listava o ADR da superfície como pendência.
- Decisão: `apps/cli/src/tui/terminal/` é o adaptador de ciclo de vida (zona `root` da composição, como `tui/loop/`) e a única parte que toca `process.`. Ele entra em raw mode (`setRawMode(true)`), entra na tela alternativa (`\u001b[?1049h`) e esconde o cursor (`\u001b[?25l`) na abertura; e restaura (`\u001b[?1049l\u001b[?25h`, `setRawMode(false)`), desregistra os listeners e pausa o `stdin` no fechamento.
- Decisão: a porta não muda. `openTerminal` devolve `TerminalHandle = TuiTerminal & { close(): void }`, estruturalmente atribuível a `TuiTerminal`, e `runTui` continua recebendo só a porta. O ciclo de vida fica atrás dela: o laço não conhece terminal, sinal nem exit code.
- Decisão: `withTerminal(run, environment?)` abre, roda o callback e fecha no `finally`, inclusive quando o callback rejeita. É a composição que garante "nenhum caminho deixa o terminal não restaurado", e substitui o `process.stdin.pause()` que o `cli.ts` mantinha no `finally` por fora.
- Decisão: `SIGTERM` e `SIGHUP` são ouvidos pelo adaptador, nunca pelo laço; `SIGWINCH` continua chegando como evento `resize` do `stdout`. No sinal o adaptador fecha (restaura uma vez) e encerra com `128 + sinal` — `SIGTERM` 143, `SIGHUP` 129, pela tabela pura `signalExitCode`; `close()` desregistra o handler, então um segundo sinal não duplica a restauração nem o exit, e um sinal depois de `q`/`Ctrl-C` não sobrescreve o exit do caminho original.
- Decisão: os exit codes normais continuam na raiz. `exitCodeOf` mapeia `quit`→0, `interrupt`→130 e `fatal`→1, e o `cli.ts` aplica `process.exitCode`. O adaptador só conhece o exit de sinal e nunca chama `exit` nesses desfechos.
- Decisão: zero dependência nova de runtime. `setRawMode` e as sequências ANSI são escritos na mão sobre os streams do Node; `dependencies` segue vazio (S-28).
- Consequência: o adaptador é provável sem PTY, com streams e emissor de sinais falsos, sem `setRawMode` global e sem matar o processo do teste. O PTY real segue verificação manual (`T-26`).
- Consequência: `processEnvironment()` é o único arquivo do adaptador que referencia `process.stdin`/`stdout`/`stderr`/`exit`; os demais recebem o ambiente injetado, e um teste estrutural pina a fronteira.
- Alternativa rejeitada: trocar a porta por uma que emitisse eventos de sinal — o laço não deve conhecer sinal, e `resize` já cobre `SIGWINCH`.
- Alternativa rejeitada: o `cli.ts` restaurar o terminal no `finally` por fora do adaptador — foi exatamente o acoplamento root↔binding que a verificação da BOS-53 apontou no `process.stdin.pause()`.
- Alternativa rejeitada: o adaptador chamar `process.exit` nos desfechos normais — quebra a fronteira com a raiz, que é dona do `exitCodeOf`.
- Alternativa rejeitada: uma dependência de raw mode/ANSI (por exemplo `chalk`/`ansi-escapes`) — viola S-28 e a TUI é zero-dep por decisão da spec.
- Gatilho de revisão: a porta precisar de um terceiro evento além de tecla e resize, ou um sinal diferente de `SIGTERM`/`SIGHUP` passar a exigir restauração.
