---
numero: 19
titulo: 'Item não ativo é legível e editável; só o check-in recusa'
data: '2026-09-22'
status: 'aceito'
---

# ADR-019 — Item não ativo é legível e editável; só o check-in recusa

- Contexto: a tabela de erros do `docs/especificacao/CLI.md` recusa item não ativo em duas linhas, e as duas abrem com a palavra "Check-in" — `item arquivado; use study unarchive <ref>` e `item no arquivo morto; use study cold restore <ref>`. O `ItemNotActiveError` do core nasce nesse caminho: quem o lança é `recordReview` (`packages/core/src/schedule.ts`). A ENG-6 copiou a guarda para `show` e `edit`, e o resultado foi um beco sem saída: o item arquivado aparecia em `list --status archived`, era apagado por `remove --yes`, mas `show` e `edit` saíam 3 mandando rodar `unarchive` — comando que a ENG-8 ainda não entregou.
- Decisão: `show` e `edit` resolvem a referência por qualquer status e não guardam contra item não ativo. A leitura lê e a escrita escreve, tanto em `archived` quanto em `cold`. A recusa por status continua sendo do core e vale só para o check-in, que é o caminho que a especificação descreve.
- Consequência: `list`, `find`, `show`, `edit` e `remove` tratam status como dado exibido ou filtro, nunca como permissão. Os casos `show-le-arquivado`, `show-le-arquivo-morto` e `edit-edita-arquivado` pinam isso.
- Consequência: o `ItemNotActiveError` fica sem consumidor no CLI até a ENG-7 (check-in) pousar. A classe e as mensagens seguem no core, pinadas pelos casos `C-53`; apagá-la agora removeria o erro que o `review` vai lançar.
- Alternativa rejeitada: manter a guarda e dar ao CLI uma mensagem própria para o caso — seria reescrever a mensagem do check-in e continuar recusando a leitura enquanto o `unarchive` da ENG-8 não existe.
- Alternativa rejeitada: liberar só a leitura e manter a recusa em `edit` — a especificação não recusa escrita em item não ativo, e a assimetria com `remove`, que já apaga arquivado, não se sustenta.
