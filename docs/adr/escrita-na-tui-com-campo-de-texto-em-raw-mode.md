---
titulo: 'Escrita na TUI com campo de texto em raw mode'
data: '2026-10-02'
status: 'aceito'
---

# Escrita na TUI com campo de texto em raw mode

- Contexto: a v1 da TUI deixava `add`, `edit`, `archive`, `remove`, `cold`, `config`, `export` e `import` fora do escopo e vivia do teclado de uma linha. O BOS-57 registrou o adiamento do filtro por matéria (RF-24) com o gatilho "a TUI ganhar entrada de texto em raw mode". O BOS-69 inverte a decisão de escopo e devolve os comandos de escrita à TUI, sem tirar nada do CLI: `a TUI nunca é a única forma de fazer algo` (`docs/especificacao/TUI.md`, Convenções).
- Decisão: a TUI ganha um campo de texto puro em raw mode — valor, cursor, `Backspace`, `Delete`, `←`/`→`/`Home`/`End`, largura e truncamento — como peça de estado do `RenderState`, testado sem PTY.
- Decisão: cada comando de escrita entra por uma tecla própria a partir da fila (`a` item novo, `e` edição, `x`/`X` arquivar/desarquivar, `D` remover, `c` arquivo morto, `C` config, `E`/`I` export/import) e chama a mesma função que o CLI já chama, sem regra nova no `packages/core`.
- Decisão: `remove`, `cold purge` e o `export` sobre arquivo existente exigem uma confirmação explícita da TUI, no lugar do `--yes`; `archive`/`unarchive` são imediatos.
- Decisão: `export` e `import` recebem o caminho por campo de texto — a v1 zero-dep não tem seletor de arquivo nativo.
- Consequência: `docs/especificacao/TUI.md` sobe para v3 e o campo destrava o filtro por matéria (RF-24), que segue no BOS-68; o `RenderState` e os frames das telas de escrita entram na implementação do BOS-69.
- Alternativa rejeitada: manter a escrita só no CLI — obrigaria a decorar a linha de comando no uso diário, que é o que a TUI existe para evitar, e deixaria `study` sem paridade com o CLI.
- Alternativa rejeitada: um seletor de arquivo nativo para `export`/`import` — quebra a v1 zero-dep; o caminho é campo de texto.
- Alternativa rejeitada: confirmação por redigitação do título — mais atrito que o `--yes` do CLI sem ganho de segurança proporcional.
- Gatilho de revisão: o campo crescer para edição multi-linha ou colagem, ou a TUI ganhar dependência de runtime.
