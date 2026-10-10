# CORE-03 — Transição "marcar como revisado"

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01, CORE-02

## Resumo

Função pura que, a partir de um cartão & de "hoje", produz o cartão revisado com a nova data recalculada.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] `marcarComoRevisado(cartao, hoje)` define `dataUltimaRevisao = hoje`.
- [ ] Incrementa `quantidadeRevisoes` em 1.
- [ ] Recalcula `dataProximaRevisao` via CORE-02 (respeitando o teto de 365).
- [ ] Função imutável: retorna um novo `Cartao`, sem mutar a entrada.
- [ ] Testes cobrindo 1ª revisão (→ +14) & revisões subsequentes.

## Referências

- CDUs: CDU-03 · HUs: HU-04 · RN: RB-01, RB-07 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md), [RNF-12](../web/Requisitos%20não%20funcionais/RNF-12%20-%20Cobertura%20de%20testes.md)
