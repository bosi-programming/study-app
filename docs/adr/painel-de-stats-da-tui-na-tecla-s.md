---
titulo: 'Painel de stats da TUI na tecla s'
data: '2026-10-02'
status: 'aceito'
---

# Painel de stats da TUI na tecla s

- Contexto: a proposta do anexo do BOS-57 desenhava uma barra de streak e contagens do dia numa tecla `s`, e o `docs/especificacao/TUI.md` §`Em aberto` listava "Barra de status com streak e contagens do dia". O `docs/especificacao/TUI-RENDER.md` fixa o `RenderState` e a precedência de frames, e o `docs/especificacao/TUI-FRAMES.md` trazia o frame `Stats` como proposta, com uma barra de dez blocos.
- Decisão: a tela `stats` entra no `RenderState`/`SessionState` como quinta `RenderScreen`, aberta por `s` a partir da fila — inclusive a fila vazia — e fechada por `s`, `Esc` ou `q`. É somente-leitura e não mexe no foco.
- Decisão: a fonte são as mesmas leituras dos comandos, sem regra nova no core — `readQueueStreak` para o streak, as contagens de status e os check-ins de hoje (`checkins_today`) do `stats`, o recorte de atrasados e de hoje do `due`, e a contagem da fila por matéria do RF-07. Os check-ins por matéria do `stats` não entram: o painel desenha a fila por matéria, não o histórico de check-ins.
- Decisão: o streak aparece como `N dias` mais o último dia. A barra de dez blocos da proposta fica adiada porque `meta` só guarda `streak_current`/`streak_last_day`, e o histórico de fila zerada por dia não é derivável do banco.
- Consequência: o contrato de render ganha o campo e a linha de precedência do painel, e o `TUI-FRAMES.md` ganha o frame decidido.
- Alternativa rejeitada: uma barra permanente na fila — o rodapé já carrega `N atrasados, M para hoje`, e o painel sob demanda não rouba linha da lista.
- Alternativa rejeitada: a barra de dez blocos — exigiria inventar histórico que o banco não guarda.
- Alternativa rejeitada: abrir o painel em toda tela — em `detail`, `reevaluate` e `help` a tecla `s` não tem contexto de fila.
- Gatilho de revisão: o banco passar a guardar o histórico diário do streak, ou o painel crescer para exibir dado que exija uma leitura nova do core.
