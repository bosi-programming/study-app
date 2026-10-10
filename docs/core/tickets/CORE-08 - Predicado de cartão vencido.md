# CORE-08 — Predicado de cartão vencido

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01, CORE-02

## Resumo

Predicado puro que indica se um cartão está atrasado, usado p/ o destaque visual na lista.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] `estaVencido(cartao, hoje)` é `true` quando `dataProximaRevisao < hoje`.
- [ ] `dataProximaRevisao == hoje` **não** é vencido (RB-07).
- [ ] Considera apenas o dia de calendário (ignora hora).
- [ ] Testes cobrindo passado, hoje & futuro.

## Referências

- CDUs: CDU-02 · HUs: HU-02 · RN: RB-11, RB-07 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
