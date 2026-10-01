---
titulo: 'Reavaliação após o check-in na sessão da TUI'
data: '2026-10-01'
status: 'aceito'
---

# Reavaliação após o check-in na sessão da TUI

- Contexto: a [Porta de abertura do contexto e sessão longa da TUI](porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md) fixou o `SessionState` com `screen` e `reevaluation` e a regra de que toda ação relê o store. A sessão da ENG-25 mantinha a tela na fila depois do check-in e `settle`/`reevaluate` cancelavam a reavaliação de qualquer item que tivesse saído da fila. O check-in reagenda o item revisado (vencimento novo = hoje + intervalo), então o item recém-revisado sempre sai da fila — e a AC "`Enter` faz check-in e abre a reavaliação" (RF-12), da `docs/especificacao/TUI.md`, não fechava com a sessão como estava.
- Decisão: o check-in abre a reavaliação do item revisado. `checkIn` devolve o id e a dificuldade do item gravado e o `dispatch` publica `screen: 'reevaluate'` com `reevaluation: { itemId, currentDifficulty }`. A `confirmation` (título do item) fica com o laço, porque o `SessionState` não a carrega.
- Decisão: a reavaliação deixa de ser limpa por "não estar na fila". `settle` perde essa regra e um `reconcileReevaluation` limpa a reavaliação quando o item sumiu ou não está ativo — lido por id do store depois da releitura — voltando para a fila.
- Decisão: `reevaluate` lê o item por id do store, sem exigir que ele esteja na fila, exige `status === 'active'` e grava a dificuldade nova. Item arquivado ou removido limpa a reavaliação e não escreve.
- Consequência: os casos existentes de "item fora da fila" seguem verdes porque arquivam o item (inativo); o contrato preservado é o do item inativo ou removido, não o do item ativo reagendado.
- Consequência: `apply` e `render` chamam o reconcile depois da releitura, então o item revisado continua reavaliável pela TUI (RF-11/RF-12/RF-13) mesmo fora da fila, e a reavaliação some quando o item deixa de ser ativo.
- Alternativa rejeitada: manter a reavaliação só para itens na fila — o item revisado nunca estaria na fila, e o RF-12 não teria como acontecer pela TUI.
- Alternativa rejeitada: a sessão guardar o `Item` inteiro na reavaliação — o estado deixaria de ser dado puro e envelheceria; guardar o id e reler o store mantém a regra "toda ação relê".
- Gatilho de revisão: a reavaliação passar a valer para item não ativo, ou a TUI ganhar uma tela que dependa de a reavaliação estar na fila.
