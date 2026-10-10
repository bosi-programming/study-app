# CORE-05 — Normalização & derivação de categorias

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01

## Resumo

Normalizar nomes de categoria & derivar a lista distinta a partir dos cartões.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] Normalização com `trim`; comparação & agrupamento **case-insensitive** ("Inglês" == "inglês").
- [ ] A grafia exibida preserva o valor; só a chave de comparação é case-insensitive.
- [ ] `categoriasDistintas(cartoes)` retorna categorias únicas (sem duplicatas por caixa) & ordenadas.
- [ ] Testes cobrindo duplicatas por caixa, espaços & ordenação.

## Referências

- CDUs: CDU-01, CDU-05, CDU-08 · HUs: HU-01, HU-09 · RN: RB-02, RB-08 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
