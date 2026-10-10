# CORE-07 — Filtros (data inclusivo + categoria)

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01, CORE-05

## Resumo

Funções puras de filtragem dos cartões por intervalo de data de revisão & por categoria, combináveis.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] `filtrarPorData(cartoes, { inicio?, fim? })` seleciona `dataProximaRevisao` no intervalo **inclusivo** `[inicio, fim]`.
- [ ] Aceita só `inicio`, só `fim` || ambos.
- [ ] `filtrarPorCategoria(cartoes, categoria)` compara **case-insensitive** (RB-08).
- [ ] Os filtros são combináveis em conjunção (E).
- [ ] Testes cobrindo bordas do intervalo (pontas inclusas) & a combinação.

## Referências

- CDUs: CDU-07, CDU-08 · HUs: HU-08, HU-09 · RN: RB-09, RB-02 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
