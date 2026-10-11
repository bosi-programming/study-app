# WEB-10 — Filtrar por categoria

**Tipo:** feature · **Épico:** Filtros · **Depende de:** WEB-03, CORE-05, CORE-07

## Resumo

Filtrar a lista por categoria, a partir das categorias existentes.

## O que muda na tela

- Dropdown "Categoria" na faixa de filtros, listando as categorias dos cartões.
- Lista filtrada & mensagem de estado vazio quando não há resultados.

## Critérios de aceitação

- [ ] Dropdown lista as categorias derivadas dos cartões (CORE-05), sem duplicatas por caixa.
- [ ] Filtra via CORE-07 com comparação case-insensitive (RB-08).
- [ ] Combina com o filtro de data & mantém a ordenação (RB-03).
- [ ] Sem categorias disponíveis: dropdown vazio/desabilitado.
- [ ] Sem resultados: mensagem de estado vazio (RB-05).
- [ ] Limpar o filtro volta a exibir todos os cartões.

## Referências

- CDUs: CDU-08 · HUs: HU-09 · RN: RB-02, RB-05, RB-08 · RNFs: RNF-08

## Pull request

- https://github.com/bosi-programming/study-app/pull/21 — em revisão (stack `core-03` ← #9 ← #10 ← #13 ← #14 ← #15 ← #16 ← #17 ← #18 ← #19 ← #20 ← #21).
