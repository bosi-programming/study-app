# Comando `study tui` e o laço da TUI

Versão: 1 | Data: 2026-10-01 | Base: `docs/especificacao/TUI.md`, `docs/especificacao/TUI-RENDER.md` e os ADRs [Porta de terminal injetada e a zona do laço da TUI](../adr/porta-de-terminal-injetada-e-zona-do-laco-da-tui.md), [Reavaliação após check-in na sessão da TUI](../adr/reavaliacao-apos-check-in-na-sessao-da-tui.md) e [Superfície da TUI: zero-dep, raw mode, tela alternativa e saída](../adr/superficie-da-tui-zero-dep-raw-mode-tela-alternativa-e-saida.md)

Registro do comando `study tui` (BOS-53, ENG-28): a segunda superfície do CLI, que liga a sessão (BOS-50), o desenho puro (BOS-51) e o parser de teclas (BOS-52) num laço de terminal. O contrato observável é o do `TUI.md`; esta nota registra o que a unidade entrega, como usar e como o laço funciona por dentro. PR: https://github.com/bosi-programming/study-app/pull/36

O ciclo de vida do terminal (raw mode, tela alternativa, cursor, `SIGTERM`/`SIGHUP`, restauração e exit codes de processo) é da unidade seguinte, BOS-54 (ENG-29): PR: https://github.com/bosi-programming/study-app/pull/38

## O que faz

- Registra `study tui` no despacho do `cli.ts` e no bloco de uso (`--help` global só ganha a linha).
- Recusa a TUI fora de um terminal interativo: sem TTY no stdin ou no stdout, com `--no-input` ou com `--json`, sai exit 1, `code: 'usage'`, mensagem `a TUI exige um terminal interativo`, stdout vazio; com `--json` o erro sai no envelope e nada é desenhado.
- A recusa vem antes de qualquer abertura de banco: `study tui` sem TTY sai `usage`/1 mesmo com banco corrompido ou fora do schema.
- Com TTY, abre a sessão pela porta (`openContext`) e roda o laço: setas/`j`/`k`, `g`/`G`, `PgUp`/`PgDn`, `Enter` (check-in e reavaliação), `1`–`5`, `i`, `Esc`, `?`, `q` e `Ctrl-C`.
- Um frame por mudança de estado (ou `SIGWINCH`), escrito numa chamada só; `fatal` devolve frame vazio e a mensagem vai ao stderr; o laço não chama `exit`.

## Como usar

```
study tui [--db <path>] [--no-color]
```

- Exige stdin e stdout TTY. Sem isso, a porta de linha continua sendo a saída: `study due`, `study review`, `study show`.
- Não aceita posicional nem flag de outro comando (`--status`, `--subject`, `--difficulty`, `--history`, `--yes`); qualquer um dos dois é `usage`.
- `--json` não tem envelope de TUI — o desenho é a saída — e por isso é recusado como entrada.
- `--no-color`/`NO_COLOR`/`TERM=dumb` desligam a cor; sem cor o atraso ganha `!` e a geometria não muda. Locale não-UTF-8 cai para bordas ASCII.

## Como funciona

### A porta

- `TuiTerminal = { size(), next(), write(frame), error(message) }`; `next()` devolve `{ kind: 'key', chunk }`, `{ kind: 'resize', columns, rows }` ou `null` (fim da entrada, tratado como `interrupt`).
- O laço mora em `apps/cli/src/tui/loop/` (zona `root` da composição) e nunca lê `stdin`, nunca ouve `SIGWINCH` e nunca chama `process.exit`. Nenhum arquivo de `tui/loop/**` toca `process.`/`node:*`.
- `apps/cli/src/tui/terminal/` é o adaptador de processo que implementa a porta: `openTerminal` entra em raw mode, na tela alternativa e esconde o cursor numa chamada, registra `data`/`end`/`resize` e `SIGTERM`/`SIGHUP`, e mantém a fila e o `size()` do binding. `close()` é idempotente — restaura tela e cursor, desliga o raw mode, desregistra os cinco listeners e pausa o `stdin` — e `withTerminal` compõe abertura, execução e fechamento no `finally`. `processEnvironment()` é o único arquivo que toca `process.`, e a porta `TuiTerminal` não mudou.

### O laço

- Abre o contexto uma vez por `openContext` e injeta o mesmo `OpenedContext` em `openSession` por `SessionOptions.open` — o `RenderState.detail` exige o store para `getItem` e `listReviewLogs`.
- Escreve o primeiro frame (`beforeRender()` → `RenderState` → `render`) e consome eventos: tecla → `beforeRender()` → `parseKeys(chunk, tela, pending)` → `quit`/`interrupt` encerram e o resto vai a `applyAction`; `resize` atualiza o `viewport`.
- Depois de cada comando o frame é remontado e escrito só se a string mudou; `resize` escreve sempre.
- `PgUp`/`PgDn` chegam do parser como `page-prev`/`page-next` e o laço repete o foco a capacidade da janela (de `tui/render/`), parando na ponta: uma página é um frame só.
- Troca de tela no meio de um chunk: o parser vale para a tela do início; o laço aplica um comando, acha o menor prefixo que o produz e reparseia o sufixo com a tela nova (`i` seguido de `Esc` fecha o detalhe que acabou de abrir).
- `RenderState`: copia `today`, `screen`, `queue`, `focusId`, `reevaluation`, `streak`, `banner` e `fatal` da sessão; resolve `detail` e guarda `confirmation`; resolve `viewport`, `color` (`colorEnabled()`) e `utf8` do locale.

### Recusa e despacho

- `refuseTui({ stdinTty, stdoutTty, noInput, json })` é puro e devolve `CliError.usage('a TUI exige um terminal interativo')` (exit 1) ou `null`.
- `tui` não é um `Command`: o laço é assíncrono e devolve um desfecho em vez de `{ json, view }`. O `cli.ts` ganha um ramo próprio antes da consulta ao `COMMANDS` (o mapa segue só com os comandos genéricos) e `runCli` continua síncrono.

### A reavaliação após o check-in

- O check-in abre a reavaliação do item revisado e a mantém enquanto o item estiver ativo, lido por id do store, sem exigir que ele esteja na fila; ela é cancelada quando o item fica inativo ou some. É o ajuste de integração que faz `Enter` fechar a AC "check-in e abre a reavaliação" (RF-12), registrado no ADR de reavaliação.

### Desfecho e exit codes

- `runTui` devolve `quit`/`interrupt`/`fatal`; o root mapeia quit→0, interrupt→130, fatal→1 e aplica `process.exitCode`. O laço fecha a sessão em todos os desfechos; `q` e `Ctrl-C` não são `exit` do laço.
- O adaptador restaura o terminal em todo caminho (`q`, `Ctrl-C`, fatal, `end` e sinais) e só encerra o processo no sinal, com `128 + sinal` (`SIGTERM` 143, `SIGHUP` 129); os exit codes normais seguem na raiz.

## Verificação

- Laço provado sem PTY: `apps/cli/test/tui/loop.test.ts` injeta um terminal com roteiro de eventos (chunks de teclas e resize) e captura os frames e o desfecho; `apps/cli/test/tui/refusal.test.ts` cobre o predicado puro.
- Adaptador de terminal provado sem PTY: `apps/cli/test/tui/terminal.test.ts` injeta streams e um emissor de sinais falsos e cobre a abertura (raw mode, tela alternativa e cursor), `SIGTERM`/`SIGHUP`, a idempotência do `close()` e o `withTerminal` no sucesso e na falha; `apps/cli/test/architecture.test.ts` pina o ADR da superfície e a fronteira de `process.`.
- O PTY real segue verificação manual (`T-26`): exercitado no bin construído (a fila desenha, `j`/`i` respondem, `q` sai 0).
- Fora desta unidade: a suíte `U-nn` e o spawn sem TTY (BOS-55).

## Em aberto

- A gravação da versão validada no Linear (BOS-53/ENG-28) fica pendente: o MCP está sem autenticação (401) nesta sessão.
