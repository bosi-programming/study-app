# TUI — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-28 | Base: `docs/especificacao/CLI.md` e `docs/especificacao/REQUISITOS.md`

## Convenções

- Comando: `study tui`. É a segunda superfície do mesmo CLI, sobre o mesmo `packages/core` e o mesmo banco (Core TS compartilhado, Camada de persistência do CLI).
- A TUI não cria contrato de dados: lê e escreve pelo `store` do CLI.
- Abre só com terminal interativo (stdout e stdin TTY). Fora disso, exit 1 com `a TUI exige um terminal interativo`.
- `--json` não tem envelope de TUI: o desenho é a saída. O erro continua honorando `--json` quando a flag vem junto (RNF-08).
- O texto sem os escapes é a fonte; a paleta é a do ADR Cores da saída humana do CLI e `--no-color`/`NO_COLOR` valem aqui.
- Os comandos de linha continuam sendo a porta de script e de leitor de tela: a TUI nunca é a única forma de fazer algo.
- Esta spec não cria `RF-nn`. Ela descreve o comportamento da superfície para os requisitos que já existem.

## Decisões desta spec

- Escopo da v1: fila do dia (RF-05), check-in (RF-08) e reavaliação de dificuldade (RF-11, RF-12, RF-13), mais o detalhe somente-leitura (RF-06, RF-10).
- Zero dependência de runtime: `node:readline`, `process.stdin.setRawMode`, `SIGWINCH` e escapes ANSI na mão. O `S-28` pina `dependencies` vazio no pacote publicado.
- Nenhuma regra nova: `recordReview`, `reevaluateDifficulty` e as leituras do store são as mesmas funções do CLI (Core TS compartilhado).
- Teclado de uma linha: setas ou `j`/`k` movem; `Enter` faz check-in; `1`–`5` reavaliam; `i` abre o detalhe; `?` abre a ajuda; `q` sai.
- `Ctrl-C` sai com 130, mantendo o significado de aborto da tabela do `CLI.md`. O check-in já gravado permanece.
- Cor é decoração (Cores da saída humana do CLI): sem cor, o atraso ganha marcador textual e nada deixa de ser legível.

## Telas

### Fila

- Cabeçalho: `Fila de hoje — <data local>`, no tom secundário do ADR Cores da saída humana do CLI.
- Seções na ordem do `CLI.md`: `Atrasados (n)` e `Hoje (n)`; a numeração é contínua entre as duas.
- Cada linha: índice, `[matéria]`, título, vencimento, `d<dificuldade>` e `n=<check-ins>`.
- O item em foco recebe um marcador na coluna da esquerda (`>`); a linha inteira nunca muda de largura.
- Rodapé fixo: totais de atrasados e de hoje (RF-07) e a dica de teclas (`Enter revisar · i detalhe · ? ajuda · q sair`).
- A lista rola quando não cabe na altura; o foco nunca sai da janela visível.

### Detalhe

- Painel somente-leitura do item em foco: campos do `study show` (`RF-06`) e o histórico de check-ins (`RF-10`).
- Abre com `i` e fecha com `Esc`, `q` ou `i`.
- Não escreve nada e não altera o foco ao fechar.

### Reavaliação

- Aparece depois do check-in (RF-12) ou direto com `1`–`5` (RF-11).
- Mostra a dificuldade atual e os cinco valores com rótulo, como o prompt do `CLI.md`.
- `Enter` mantém a dificuldade; `1`–`5` recalcula com a base nova e o mesmo n (RN-06).
- `Esc` cancela: o check-in permanece e a dificuldade não muda, com a mesma semântica do prompt abortado do `CLI.md`.

### Fila vazia

- Estado vazio explícito: `Fila zerada`, com o streak de fila zerada (RF-21) e a dica de teclas.
- Continua aceitando `q` e `?`.

### Ajuda

- Lista de teclas da v1 e o lembrete de que os comandos de linha fazem o resto.
- Fecha com `Esc`, `?` ou `q`.

## Teclas

| Tecla | Efeito | Onde |
| --- | --- | --- |
| `↑` `↓` ou `k` `j` | move o foco | fila, ajuda |
| `PgUp` `PgDn` | rola uma página | fila |
| `g` `G` | primeiro e último item | fila |
| `Enter` | check-in do item em foco; na reavaliação, mantém a dificuldade | fila, reavaliação |
| `1`–`5` | reavalia a dificuldade do item em foco | fila, reavaliação |
| `i` | abre o detalhe | fila |
| `Esc` | fecha painel ou cancela a reavaliação | detalhe, reavaliação, ajuda |
| `?` | abre a ajuda | fila, detalhe |
| `q` | sai (na reavaliação, cancela e sai) | todas |
| `Ctrl-C` | sai com 130 | todas |

## Fluxos

### Check-in simples

1. A fila abre com o foco no primeiro atrasado, ou no primeiro de hoje se não houver atraso.
2. `Enter` grava o check-in pelo `recordReview` (RF-08) e incrementa n (RN-04).
3. A TUI confirma `Check-in registrado: <título>` e abre a reavaliação.
4. `Enter` mantém a dificuldade: o intervalo dobra e o item sai da fila se o novo vencimento for futuro.

### Check-in atrasado

1. Item atrasado é revisado normalmente: atraso não penaliza (RN-04, RN-05).
2. O intervalo dobra e o vencimento conta do dia do check-in (RN-13).
3. O item sai da seção `Atrasados` e o contador do rodapé é recalculado.

### Check-in antes do vencimento

1. Item de `Hoje` ou com vencimento futuro conta como no prazo (RN-13).
2. `on_time_streak` incrementa; um check-in após o vencimento zera o contador (RN-08).

### Reavaliação sem check-in

1. `1`–`5` no item em foco recalcula com a base nova e o mesmo n (RN-06).
2. O foco permanece no mesmo item e a fila é reordenada se o vencimento mudar.

### Sair

1. `q` restaura o terminal e sai com 0.
2. `Ctrl-C` restaura o terminal, fecha o store e sai com 130.
3. Nada é gravado na saída: check-in já registrado fica no banco.

## Sessão longa

A TUI mantém o store aberto por minutos ou horas, e o CLI supõe um processo por comando. O contrato da sessão:

- Os ganchos de contexto (migração do arquivo morto e streak) rodam ao abrir e a cada ação concluída, tratando cada ação como um limite de comando.
- A virada do dia local é detectada antes de cada desenho: `hoje` é recalculado e a fila é relida.
- O store é relido antes de cada ação; nenhuma decisão usa linha em cache.
- Uma escrita que falha não derruba a sessão: o aviso vai para a barra e o desenho anterior permanece.
- Duas instâncias são permitidas (`journal_mode = WAL`, `busy_timeout = 5000`, Engine SQLite do CLI). A TUI mostra o estado do seu último read; mudança feita em outro processo aparece na próxima ação.
- O arquivo morto migrado durante a sessão sai da fila na releitura seguinte (RN-09).

## Renderização

- Tela alternativa e cursor oculto durante a sessão; o terminal é restaurado em `q`, `Ctrl-C`, erro fatal e sinais `SIGTERM`/`SIGHUP`.
- Um frame é escrito numa única chamada; nada de desenho incremental linha a linha.
- Redesenho só em mudança de estado ou `SIGWINCH`.
- Largura mínima de 60 colunas e 15 linhas; abaixo disso, uma mensagem pede para aumentar a janela.
- Sem quebra de linha: título e matéria são truncados com `…` na largura da coluna, como nas tabelas do `CLI.md`.
- UTF-8 para as bordas, com queda para `-`, `|` e `+` quando o locale não for UTF-8.
- O frame sem cor é legível e estável: o atraso usa `!` no lugar do âmbar.

## Erros e exit codes

| Situação | `code` | Exit | Mensagem |
| --- | --- | --- | --- |
| Sem TTY, `--no-input` ou `--json` | `usage` | 1 | `a TUI exige um terminal interativo` |
| Banco fora do schema | `unsupported-schema` | 2 | `schema_version <n> não suportado` |
| Banco corrompido | `invalid-state` | 3 | `banco corrompido: <path>` |
| `Ctrl-C` | — | 130 | sem envelope, como no `CLI.md` |

- Erro fatal dentro da sessão: a TUI restaura o terminal, fecha o store e escreve a mensagem no stderr.
- Com `--json`, o erro sai no envelope e nada é desenhado (RNF-08).
- Falha de escrita que não é fatal vira aviso na barra, sem exit.

## Acessibilidade e portabilidade

- A TUI não é a porta acessível: leitores de tela e automação ficam com os comandos de linha.
- Sem mouse, sem clipboard, sem seleção de texto: só teclado.
- Sem cor obrigatória: `--no-color`, `NO_COLOR` e `TERM=dumb` desligam a paleta e mantêm os marcadores.
- Terminal sem truecolor pode degradar a cor; o texto segue correto e `--no-color` é o caminho garantido.
- Windows: exige terminal com VT (`Windows Terminal`, `conhost` com virtual terminal); sem ele, a TUI recusa como sem TTY.
- Nada de rede (RNF-01) nem telemetria (RNF-02).

## Testes

- O estado e o desenho são puros: `render(estado) -> string`, comparado por frame nos testes, sem terminal.
- As teclas são um parser puro de sequências (`\u001b[A`, `\r`, `q`), testado à parte do terminal.
- Os fluxos do domínio usam os mesmos golden fixtures do CLI: a TUI não repete a regra.
- Um caso de spawn prova o caminho sem TTY: exit 1, mensagem no stderr e nada no stdout.
- O PTY real fica em verificação manual, como o `T-26`; a suíte `U-nn` entra no `PLANO-DE-TESTES.md` quando o ticket de implementação abrir.

## Fora de escopo (v1)

- `add`, `edit`, `archive`, `remove`, `cold`, `config`, `export` e `import` dentro da TUI.
- Busca e filtro por matéria (RF-24, recorte do RF-07).
- Painel de stats e barra de streak permanente.
- Mouse, temas, i18n e notificações.
- Abrir a TUI sem subcomando.

## Em aberto

- `study` sem argumento abrir a TUI em TTY: mexe no ADR Vocabulário de `error.code` e envelope sem comando e no exit 1 atual; exige ADR.
- Barra de status com streak e contagens do dia.
- Filtro por matéria (`-s`) dentro da fila.
- Onde a TUI entra no `ROADMAP.md`: item da Fase 1 ou fase própria antes do web.
- Um ADR para a superfície: zero-dep, raw mode, tela alternativa e semântica de saída.

## Notas de implementação

- Módulos em `apps/cli/src/tui/`: `render.ts` (puro), `keys.ts` (puro), `session/` (store, ganchos e loop).
- Reusa `apps/cli/src/output/color.ts` (Cores da saída humana do CLI) e `apps/cli/src/context.ts` para abrir o store e rodar os ganchos.
- `apps/cli/src/output/human.ts` continua a ser a saída dos comandos; a TUI não o reusa para desenhar.
- Sem dependência nova de runtime: o bundle do `prepare` continua um arquivo só, com o core inlinado.
- `study tui` entra em `COMMANDS` e no bloco de uso do `cli.ts`, com `--help` inalterado.
