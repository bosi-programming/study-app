# WEB-09 — Filtrar por data de revisão

**Tipo:** feature · **Épico:** Filtros · **Depende de:** WEB-03, CORE-07

## Resumo

Filtrar a lista por intervalo da próxima data de revisão.

## O que muda na tela

- Campo `reviewDateFilter` (intervalo de datas) na faixa de filtros.
- Lista filtrada & mensagem de estado vazio quando não há resultados.

## Critérios de aceitação

- [ ] Campo de intervalo (início e/ou fim).
- [ ] Filtra via CORE-07 com intervalo **inclusivo** (RB-09).
- [ ] Combina com o filtro de categoria & mantém a ordenação (RB-03).
- [ ] Limpar o filtro volta a exibir todos os cartões.
- [ ] Sem resultados: mensagem de estado vazio (RB-05).

## Referências

- CDUs: CDU-07 · HUs: HU-08 · RN: RB-05, RB-09 · RNFs: RNF-08

## Pull request

- https://github.com/bosi-programming/study-app/pull/20 — em revisão (stack `core-03` ← #9 ← #10 ← #13 ← #14 ← #15 ← #16 ← #17 ← #18 ← #19 ← #20).
