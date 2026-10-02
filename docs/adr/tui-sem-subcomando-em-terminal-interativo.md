---
titulo: 'TUI sem subcomando em terminal interativo'
data: '2026-10-02'
status: 'aceito'
---

# TUI sem subcomando em terminal interativo

- Contexto: o [Vocabulário fechado de error.code e envelope no study sem comando](vocabulario-de-error-code-e-envelope-sem-comando.md) fixou `study` sem comando como uso: bloco de uso no stderr com exit 1 e, com `--json`, o envelope `usage` no stderr com stdout vazio. O `docs/especificacao/TUI.md` §`Em aberto` listava "`study` sem argumento abrir a TUI em TTY" como pendência, porque a decisão antiga não diferenciava o terminal interativo do caminho de script.
- Decisão: `study` sem posicional delega ao mesmo `runTuiCommand` do `study tui` quando — e só quando — `stdin` e `stdout` são TTY e não vêm `--json` nem `--no-input`. As flags globais (`--db`, `--export-dir`, `--no-color`) passam para a sessão, como no `study tui` explícito.
- Decisão: fora dessa condição nada muda. Sem `stdin` TTY, sem `stdout` TTY, com `--json` ou com `--no-input`, `study` sem comando continua o uso no stderr com exit 1; o `--json` responde o envelope `usage` com stdout vazio.
- Decisão: `--help` e `study --json` ficam como estão. `--help` é uso no stdout, exit 0, sem envelope, mesmo com `--json`; o envelope de `study --json` sem comando segue `usage`.
- Consequência: em TTY o `study` nu agora abre banco e passa pelos ganchos de contexto (migração do arquivo morto e streak), então a linha do `docs/especificacao/CLI.md` §`Arquivo morto` que dizia que `study` sem comando não abre banco e não migra é estreitada para os caminhos sem TTY, com `--json` ou com `--no-input`.
- Alternativa rejeitada: abrir sempre que `stdout` for TTY, mesmo sem `stdin` TTY — a TUI lê teclado; sem `stdin` interativo ela não tem entrada.
- Alternativa rejeitada: abrir com `--no-input` presente — a flag existe para nunca perguntar, e a TUI é uma sessão de perguntas e respostas.
- Alternativa rejeitada: trocar o exit 1 de `study --json` sem comando — o envelope `usage` é contrato do ADR Vocabulário e continua válido para scripts.
- Gatilho de revisão: a TUI passar a funcionar sem `stdin` interativo (entrada por arquivo ou pipe), ou um novo caminho de uso passar a exigir a abertura automática.
