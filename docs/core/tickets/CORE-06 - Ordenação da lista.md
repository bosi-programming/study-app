# CORE-06 — Ordenação da lista

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01

## Resumo

Função pura de ordenação dos cartões para exibição na lista.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] Ordem ascendente por `dataProximaRevisao`.
- [ ] Empate resolvido por `nome` ascendente (ordem alfabética pt-BR).
- [ ] Função não muta a coleção de entrada.
- [ ] Testes cobrindo ordenação & desempate.

## Referências

- CDUs: CDU-02, CDU-03, CDU-07, CDU-08 · HUs: HU-02 · RN: RB-03 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md), [RNF-10](../web/Requisitos%20não%20funcionais/RNF-10%20-%20Desempenho.md)
