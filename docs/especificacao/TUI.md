# TUI — App de Estudo Espaçado

Versão: 5 | Data: 2026-10-03 | Base: `docs/especificacao/CLI.md` e `docs/especificacao/REQUISITOS.md`

## Convenções

- Comando: `study tui`. É a segunda superfície do mesmo CLI, sobre o mesmo `packages/core` e o mesmo banco (Core TS compartilhado, Camada de persistência do CLI).
- `study` sem argumento abre a mesma TUI do `study tui` só quando `stdin` e `stdout` são TTY e não vêm `--json` nem `--no-input`, com as mesmas flags globais; fora disso, o uso no stderr com exit 1 e, com `--json`, o envelope `usage` (Vocabulário de `error.code` e envelope sem comando; TUI sem subcomando em terminal interativo).
- A TUI não cria contrato de dados: lê e escreve pelo `store` do CLI.
- Abre só com terminal interativo (stdout e stdin TTY). Fora disso, exit 1 com `a TUI exige um terminal interativo`.
- `--json` não tem envelope de TUI: o desenho é a saída. O erro continua honorando `--json` quando a flag vem junto (RNF-08).
- O texto sem os escapes é a fonte; a paleta é a do ADR Cores da saída humana do CLI e `--no-color`/`NO_COLOR` valem aqui.
- Os comandos de linha continuam sendo a porta de script e de leitor de tela: a TUI nunca é a única forma de fazer algo.
- Esta spec não cria `RF-nn`. Ela descreve o comportamento da superfície para os requisitos que já existem.

## Decisões desta spec

- Escopo da v1: fila do dia (RF-05), check-in (RF-08), reavaliação de dificuldade (RF-11, RF-12, RF-13), o detalhe somente-leitura (RF-06, RF-10) e a escrita devolvida pelo BOS-69 — `add`, `edit`, `archive`/`unarchive`, `remove`, `cold`, `config`, `export` e `import` (Escrita na TUI com campo de texto em raw mode).
- Zero dependência de runtime: `node:readline`, `process.stdin.setRawMode`, `SIGWINCH` e escapes ANSI na mão. O `S-28` pina `dependencies` vazio no pacote publicado.
- Nenhuma regra nova: `recordReview`, `reevaluateDifficulty` e as leituras do store são as mesmas funções do CLI (Core TS compartilhado).
- Teclado: setas ou `j`/`k` movem; `Enter` faz check-in; `1`–`5` reavaliam; `i` abre o detalhe; `l` abre a lista de todas as fichas; `?` abre a ajuda; `q` sai; as teclas de `## Escrita` abrem as telas de item, arquivo morto, config e export/import.
- O campo de texto em raw mode é a única entrada de texto da v1: valor, cursor, `←`/`→`/`Home`/`End`, `Backspace`, `Delete`, `Enter` confirma e `Esc` cancela; a largura trunca com `…` como as tabelas (Escrita na TUI com campo de texto em raw mode).
- Escrita destrutiva — `remove`, `cold purge` e o `export` sobre arquivo existente — nunca executa sem a confirmação explícita da TUI; o `--yes` continua sendo a flag do CLI.
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
- Continua aceitando `q`, `?`, `l` (lista de todas as fichas) e `a` (item novo); editar, arquivar ou remover exigem um item em foco.

### Fichas

- Lista as fichas ativas e arquivadas com o status de cada uma; o arquivo morto continua só na tela do `c`.
- Abre com `l` a partir da fila, inclusive a vazia, e usa as colunas e a geometria da fila, com a mesma navegação (`↑` `↓`/`k` `j`, `PgUp` `PgDn`, `g` `G`).
- `i` ou `Enter` abre o detalhe do item em foco; `x`/`X` arquivam e desarquivam pela mesma função do CLI, sem tela nova e sem confirmação.
- Fecha com `Esc` ou `l`; `q` e `Ctrl-C` mantêm a saída da TUI.

### Stats

- Painel somente-leitura do contexto do dia: streak de fila zerada, `checkins_today`, atrasados e para hoje, ativos/arquivados/arquivo morto e a contagem da fila por matéria.
- Abre com `s` a partir da fila (inclusive a fila vazia) e fecha com `s`, `Esc` ou `q`.
- Fonte: as mesmas leituras dos comandos (`stats` e `due`), sem regra nova no core; o streak é `N dias` com o último dia (Painel de stats da TUI na tecla s).
- Sem cor e sem UTF-8 o painel continua legível; as contagens zeradas desenham zeros.

### Ajuda

- Lista as teclas de leitura e de escrita — navegação, check-in, reavaliação, detalhe, `a`/`e`, `x`/`X`, `D`, `c`, `C`, `E`/`I`, `l`, `R`/`P`, `y`/`n` e saída — e lembra que os comandos de linha continuam sendo a porta de script e de leitor de tela.
- Fecha com `Esc`, `?` ou `q`.

## Escrita

Os comandos de escrita são telas da mesma sessão, sobre as mesmas funções que o CLI já chama, sem regra nova no core (Escrita na TUI com campo de texto em raw mode). O campo de texto é a peça comum: valor, cursor, `←`/`→`/`Home`/`End`, `Backspace`, `Delete`, `Enter` confirma e `Esc` cancela; a largura trunca com `…` como as tabelas. O contrato de render e os frames dessas telas entram na implementação do BOS-69; esta spec fixa o escopo, a tecla de entrada e o reuso.

### Item novo (`add`)

- `a` na fila, inclusive a vazia, abre o formulário com os campos do `study add`: título, matéria, dificuldade, nota e link.
- Título e matéria são obrigatórios, e dificuldade vazia é inválida, como o prompt do `CLI.md`.
- `Enter` no último campo grava pela mesma função do `add`; a barra confirma `Item criado: <título> (<id8>)` e a fila é relida.
- `Esc` cancela sem escrever.

### Edição (`edit`)

- `e` no item em foco abre o formulário com os valores atuais; só o que mudou vai para a função do `edit`.
- Sem pergunta, como o `edit` do `CLI.md`: `Enter` grava e a fila é relida, `Esc` cancela sem escrever.

### Arquivar e desarquivar (`archive`, `unarchive`)

- `x` arquiva e `X` desarquiva o item em foco; são imediatos e não pedem confirmação.
- A barra confirma `Item arquivado: <título> (<id8>)` ou `Item desarquivado: <título> (<id8>)` e a fila é relida.

### Remover (`remove`)

- `D` no item em foco abre a confirmação `Remover <título>? (y/n)`.
- Só `y` chama a função do `remove`; `n` ou `Esc` cancela sem escrever, no lugar do `--yes` do CLI.

### Arquivo morto (`cold`)

- `c` abre a tela do arquivo morto com a lista do `cold list`, a data de migração e o item em foco.
- `R` restaura o item em foco; `P` pede a confirmação `Remover do arquivo morto? (y/n)` antes do `cold purge`.
- `Esc`, `q` ou `c` fecha e volta à fila.

### Config (`config`)

- `C` abre a tela de config com a única chave da v1 (`cold_archive_after_days`) e o valor atual, como o `config get`.
- `Enter` abre o campo; `Enter` de novo grava o valor novo pela função do `config set`, a barra confirma `<chave>: <valor>` e a tela é relida.
- `Esc` cancela sem escrever.

### Export e import (`export`, `import`)

- `E` abre o campo do caminho e exporta o acervo no JSON v1; se o arquivo de destino já existir, uma confirmação própria substitui o `--yes` do `export`.
- `I` abre o campo do caminho e importa o JSON v1; a barra mostra o `written` e o `skipped` do merge.
- O caminho é digitado no campo de texto: a v1 zero-dep não tem seletor de arquivo nativo.

### Confirmação

- Tela única de confirmação para `remove`, `cold purge` e o `export` sobre arquivo existente: `y` confirma, `n` ou `Esc` cancela.
- Nenhuma dessas ações escreve sem o `y` explícito.

## Teclas

| Tecla | Efeito | Onde |
| --- | --- | --- |
| `↑` `↓` ou `k` `j` | move o foco | fila, ajuda, fichas |
| `PgUp` `PgDn` | rola uma página | fila, fichas |
| `g` `G` | primeiro e último item | fila, fichas |
| `Enter` | check-in do item em foco; na reavaliação, mantém a dificuldade; nas fichas, abre o detalhe | fila, reavaliação, fichas |
| `1`–`5` | reavalia a dificuldade do item em foco | fila, reavaliação |
| `i` | abre o detalhe | fila, fichas |
| `l` | abre a lista de todas as fichas; na tela, fecha | fila, fila vazia |
| `s` | abre o painel de stats; no painel, fecha | fila, painel |
| `a` | abre o formulário de item novo | fila, fila vazia |
| `e` | abre a edição do item em foco | fila, detalhe |
| `x` `X` | arquiva e desarquiva o item em foco | fila, detalhe, fichas |
| `D` | pede confirmação para remover o item em foco | fila, detalhe |
| `c` | abre o arquivo morto; na tela, fecha | fila |
| `C` | abre a config | fila |
| `E` `I` | exporta e importa pelo caminho digitado | fila |
| `R` `P` | restaura e purga o item em foco do arquivo morto | arquivo morto |
| `y` `n` | confirma e cancela a ação destrutiva | confirmação |
| `Esc` | fecha painel ou cancela a reavaliação | detalhe, reavaliação, ajuda, fichas |
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
- Um caso de spawn (`apps/cli/test/tui/spawn.test.ts`) prova o caminho sem TTY: exit 1, mensagem no stderr e nada no stdout; com `--json` o erro `usage` sai no envelope.
- O PTY real fica em verificação manual, como o `T-26`; a suíte `U-nn` está registrada no `PLANO-DE-TESTES.md` e a varredura de `apps/cli/test/traceability.test.ts` exige o token de cada caso num arquivo de `apps/cli/test/tui`.

## Fora de escopo (v1)

- Busca e filtro por matéria (RF-24, recorte do RF-07): o campo de texto destrava o item, mas ele segue no BOS-68.
- Barra de streak permanente.
- `init` e `init --reset`, que continuam só no CLI.
- Seletor de arquivo nativo em `export`/`import`; o caminho é campo de texto.
- Mouse, temas, i18n e notificações.

## Em aberto

## Notas de implementação

- Módulos em `apps/cli/src/tui/`: `render.ts` (puro), `keys.ts` (puro), `session/` (store, ganchos e loop).
- Reusa `apps/cli/src/output/color.ts` (Cores da saída humana do CLI) e `apps/cli/src/context.ts` para abrir o store e rodar os ganchos.
- `apps/cli/src/output/human.ts` continua a ser a saída dos comandos; a TUI não o reusa para desenhar.
- Sem dependência nova de runtime: o bundle do `prepare` continua um arquivo só, com o core inlinado.
- `study tui` entra em `COMMANDS` e no bloco de uso do `cli.ts`, com `--help` inalterado.
- O campo de texto é uma peça pura do render (`field.ts`), testada sem PTY; o `RenderState` e os frames das telas de escrita entram na implementação do BOS-69.
