---
titulo: 'Filtro por matéria na TUI adiado'
data: '2026-10-02'
status: 'aceito'
---

# Filtro por matéria na TUI adiado

- Contexto: o RF-24 pede busca e filtro por matéria dentro da TUI, e o `docs/especificacao/TUI.md` §`Fora de escopo (v1)` já listava "Busca e filtro por matéria" fora da v1. O `-s` existe no CLI (`study due -s`, `study list -s`) e o painel de stats do RF-07 mostra a contagem por matéria, somente-leitura. O filtro interativo exige entrada de texto em raw mode, e a v1 da TUI é de tecla única.
- Decisão: adiar o filtro interativo e a busca por termo (RF-24). O `-s` continua só no CLI; o recorte do RF-07 entra pelo painel de stats, que é contagem, não filtro.
- Decisão: quando o filtro voltar, decidir normalização de acento e caixa (via `normalizeText`), limpeza do filtro, interação com o foco e com o estado vazio.
- Consequência: a implementação do filtro vira ticket próprio ligado a este BOS-57, e a spec mantém o item em `Fora de escopo (v1)`.
- Alternativa rejeitada: um filtro em v1 com tecla única — não cobre busca por termo e inventaria uma navegação só para matéria.
- Alternativa rejeitada: mover o `-s` do CLI para dentro da TUI — tiraria o recorte dos scripts e da leitora de tela, que são a porta acessível.
- Gatilho de revisão: a TUI ganhar entrada de texto em raw mode, ou o filtro por matéria virar pedido recorrente com o `-s` do CLI como paliativo.
