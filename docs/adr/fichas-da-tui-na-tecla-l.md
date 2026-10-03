---
titulo: 'Fichas da TUI na tecla l'
data: '2026-10-03'
status: 'aceito'
---

# Fichas da TUI na tecla l

- Contexto: a escrita devolvida pela TUI (BOS-69) arquiva e desarquiva com `x`/`X` (Escrita na TUI com campo de texto em raw mode), mas um item arquivado sai da fila do dia e não sobra superfície que o alcance: o `c` só lista o arquivo morto e o `list` só existe na linha de comando. Sem uma tela de todas as fichas, o `X` fica sem lugar de uso.
- Decisão: a tela `items` entra no `RenderState`/`SessionState` como `RenderScreen` própria, aberta por `l` a partir da fila — inclusive a vazia — e fechada por `Esc` ou `l`. Onde a fila lista a fila do dia, ela lista todas as fichas ativas e arquivadas, com o status de cada uma; o arquivo morto continua só na tela do `c`.
- Decisão: a tela usa as mesmas colunas e a mesma geometria da fila (`frameWidths` com a célula de status a mais) e a mesma navegação (`↑` `↓`/`k` `j`, `PgUp` `PgDn`, `g` `G`), com o foco e a rolagem do `windowRows` da fila.
- Decisão: `i` ou `Enter` abrem o detalhe do item em foco e `Esc` volta para a lista; `x`/`X` arquivam e desarquivam o foco chamando as mesmas funções do CLI (`archiveItem`/`unarchiveItem`), sem tela nova e sem confirmação; `q` e `Ctrl-C` mantêm a saída da TUI.
- Decisão: a lista sai das leituras que o CLI já faz — `store.listItems()` com as ativas antes das arquivadas —, sem regra nova no `packages/core`.
- Consequência: `docs/especificacao/TUI.md` sobe para v5, com a seção `### Fichas` e a linha `l` em `## Teclas`; a `TUI-FRAMES.md` ganha o frame `Fichas` e a `TUI-RENDER.md` o campo `items` e a linha de precedência.
- Consequência: a suíte `U-nn` ganha `U-26` (teclas e frame) e `U-27` (sessão), e a faixa sobe para `U-01..U-27`.
- Alternativa rejeitada: listar as arquivadas na própria fila — a fila é a do dia (RF-05) e misturar status quebraria o recorte de atrasados e de hoje.
- Alternativa rejeitada: usar o `c` como lista de tudo — o arquivo morto é outro status (`cold`) e tem as ações próprias de restaurar e purgar.
- Alternativa rejeitada: uma tela só de arquivados — deixaria o `X` fora de contexto e separaria ativas e arquivadas sem motivo; a lista única mantém a mesma geometria para as duas.
- Gatilho de revisão: a lista crescer para busca e filtro por matéria (RF-24, BOS-68) ou o `packages/core` ganhar uma leitura própria de "todas as fichas".
