# TUI — Contrato do renderizador puro

Versão: 2 | Data: 2026-10-02 | Base: `docs/especificacao/TUI.md` e `docs/especificacao/TUI-FRAMES.md`

O `TUI.md` descreve as telas e a `TUI-FRAMES.md` mostra os retratos. Este documento fixa o que falta entre os dois: o contrato de entrada do desenho — o `RenderState` que o loop monta — e o mapeamento de estado para frame. É o que o comando `study tui` e o loop (BOS-53) consomem para ligar a sessão (BOS-50) ao desenho sem importar a view.

## Onde mora

- `apps/cli/src/tui/render/`, pasta-módulo pela convenção de módulo do CLI (pasta com `index.ts` e uma função por arquivo; o `render.ts` único passou do limite). A boca pública é `render(state)` e os tipos, reexportados pelo `index.ts`.
- O desenho é puro: não importa `tui/session/**`, `process`, `node:*`, nem lê relógio ou ambiente. Importa só `@study/core` e `output/color.ts` (MVC no CLI: `tui/render/` é view).
- `render` é total: mesmo estado devolve a mesma string, com `\n` entre as linhas e sem `\n` no fim. Quem escreve no terminal numa única chamada é o loop.

## Contrato de entrada — `RenderState`

| Campo | Tipo | O que é |
| --- | --- | --- |
| `today` | `string` | data local corrente, usada no cabeçalho e no cálculo de atraso |
| `screen` | `RenderScreen` | discriminante: `queue`, `detail`, `reevaluate`, `help` ou `stats` |
| `queue` | `readonly Item[]` | itens da fila do dia, já na ordem de exibição |
| `focusId` | `string \| null` | id do item em foco |
| `detail` | `RenderDetail \| null` | item mais histórico, na tela `detail` |
| `reevaluation` | `RenderReevaluation \| null` | item mais dificuldade atual, na tela `reevaluate` |
| `confirmation` | `string \| null` | título do check-in recém-registrado, para o rodapé da reavaliação |
| `stats` | `RenderStats \| null` | dados do painel, na tela `stats` |
| `streak` | `QueueStreak` | streak de fila zerada, para o frame vazio |
| `banner` | `string \| null` | aviso não fatal; vira uma linha do frame |
| `fatal` | `string \| null` | erro fatal; `render` devolve string vazia |
| `viewport` | `RenderViewport` | `columns` e `rows` do terminal |
| `color` | `boolean` | liga a paleta de cores da saída humana do CLI |
| `utf8` | `boolean` | escolhe as bordas UTF-8 ou a queda ASCII |

Tipos de apoio:

- `RenderViewport` — `{ columns, rows }`.
- `RenderDetail` — `{ item: Item, history: readonly ReviewLog[] }`.
- `RenderReevaluation` — `{ item: Item, currentDifficulty: Difficulty }`.
- `RenderStats` — `{ streak: QueueStreak, checkinsToday: number, items: { active: number, archived: number, cold: number }, due: { overdue: number, today: number }, bySubject: Readonly<Record<string, number>> }`.
- `RenderScreen` — `'queue' | 'detail' | 'reevaluate' | 'help' | 'stats'`.

O `RenderState` é declarado sobre tipos do core e não carrega o `SessionState`. Quem faz a conversão é o loop: copia `today`, `queue`, `focusId`, `reevaluation`, `streak`, `banner` e `fatal` da sessão; resolve `detail` a partir do `detailItemId` mais o store; guarda `confirmation` no check-in; monta `stats` com as mesmas leituras dos comandos (`stats` e `due`) quando a tela é `stats`; tira `viewport` do tamanho inicial e do `SIGWINCH`; resolve `color` por `resolveColorEnabled` e `utf8` pelo locale.

## Estado para frame

A ordem de precedência é `fatal`, janela pequena, `screen`.

| Condição | Frame |
| --- | --- |
| `fatal !== null` | string vazia; a mensagem sai no stderr pelo loop |
| `columns < 60` ou `rows < 15` | mensagem de janela pequena, em duas linhas |
| `screen: 'queue'` com `queue.length === 0` | frame vazio, com o streak |
| `screen: 'queue'` com fila | fila |
| `screen: 'detail'` | caixa `Detalhe`; `detail: null` cai na fila |
| `screen: 'reevaluate'` | corpo da fila mais o rodapé de reavaliação |
| `screen: 'help'` | caixa `Ajuda` |
| `screen: 'stats'` | caixa `Stats`; somente-leitura |

Banner e confirmação de check-in são linhas dentro de um frame, nunca frames próprios.

## Frames

- **Fila.** Cabeçalho `Fila de hoje — <today>`, filete, `Atrasados (n)` e `Hoje (n)` com numeração contínua 1..N, filete e o rodapé `Enter revisar · i detalhe · ? ajuda · q sair` com `N atrasados, M para hoje` alinhado à direita.
- **Fila vazia.** Cabeçalho, filete, `Fila zerada — streak de N dia(s)` e `? ajuda · q sair` centralizados no corpo, filete.
- **Detalhe.** Caixa com o título do item e `Esc · i · q` à direita, `[matéria]` e prefixo do id, campos (Dificuldade, Vencimento, Intervalo, Check-ins, Nota, Link, Status), `Histórico (n)` com as linhas de check-in ou `nenhum check-in` e a nota de rolagem. O histórico que passa da altura é cortado.
- **Reavaliação.** Corpo da fila mais o rodapé de quatro linhas: a confirmação `✓ Check-in registrado: <título>` (só com `confirmation`), a dificuldade atual, os cinco valores com rótulo e `Esc cancela · Enter mantém · 1–5 recalcula`.
- **Ajuda.** Caixa com as onze teclas da v1, o lembrete dos comandos de linha e `Esc · ? · q para fechar`.
- **Stats.** Caixa `Stats` com o streak `N dias` e o último dia, `checkins_today`, atrasados e para hoje, ativos/arquivados/arquivo morto e a contagem da fila por matéria, mais `s · Esc · q fecha`.
- **Janela pequena.** `Aumente a janela para pelo menos` e `60 colunas e 15 linhas.`, cada linha truncada com `…` se `columns` for menor. 60x15 desenha.

## Geometria das colunas

`columns` é a largura do frame. Na linha de item, o prefixo de foco ocupa 2 colunas (`> ` ou `  `), o índice 4, a meta 7 (`d4  n=2`) e a margem 1: 14 fixas. O resto `F = columns - 14` é dividido em matéria `S`, título `T` e vencimento `D`:

- `S = clamp(floor(F * 0.22), 9, 15)`
- `D = clamp(F - S - 12, 23, 28)`
- `T = F - S - D`

Em 84 colunas dá 15/27/28, igual ao `TUI-FRAMES.md`; em 60 dá 10/12/24. Matéria e título truncam por code point com `…`; nada quebra linha e toda linha de item é preenchida até exatamente `columns`, então o `>` não muda largura.

## Rolagem

- A lista é montada como blocos (linhas de item, rótulos de seção e a linha em branco entre seções).
- `capacity = rows - chrome`, menos 2 quando houver recorte; `chrome` é cabeçalho, filetes e rodapé.
- `start = clamp(linhaEmFoco - floor(capacity / 2), 0, max(0, total - capacity))`; o foco nunca sai da janela.
- `↑ n acima` e `↓ n abaixo` aparecem só quando há item fora da janela; `a–b de N` entra no rodapé só quando houver recorte.

## Cor e bordas

- `output/color.ts` expõe `paint(hex, texto, enabled, bold)` e as constantes da paleta; as funções `muted`, `dim`, `heading`, `accent`, `accentStrong`, `success`, `successStrong` e `danger` seguem existindo para os comandos de linha, agora sobre `paint`.
- Sem cor não há escape e o atraso ganha `!` no lugar do âmbar (`! venceu <data> (<n>d)`); com cor fica só o âmbar. A geometria, as posições e as larguras batem com o frame colorido, e o texto difere só pelo `! `.
- Bordas com `utf8`: `╭ ╮ ╰ ╯ ─ │`. Sem `utf8`: `+ - |`. O texto não muda.

## Como usar

```ts
import { render, type RenderState } from './tui/render/index.ts'

const frame = render(state)
```

O loop monta o `RenderState`, chama `render` e escreve a string numa única chamada; `fatal` devolve `''` e a mensagem vai para o stderr.

## Fora de escopo

- Ler o store ou decidir regra: o desenho recebe estado pronto.
- Escrever no terminal, tratar teclado, `SIGWINCH` ou restaurar a tela.
- Rolagem do histórico do detalhe na v1.
- Mouse, temas e i18n.

## Referências

- `docs/especificacao/TUI.md` — telas, teclas, fluxos e regras de renderização.
- `docs/especificacao/TUI-FRAMES.md` — retratos de referência.
- Cores da saída humana do CLI (paleta), MVC no CLI (camadas e direção de import) e Convenção de módulo: pasta com `index.ts` e uma função por arquivo.
