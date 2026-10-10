# CORE-01 — Modelo & tipos do Cartão

**Tipo:** feature · **Épico:** Core · **Depende de:** —

## Resumo

Definir o tipo `Cartao` & a fábrica de criação, base de todas as regras do `@study/core`.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] Tipo `Cartao` com: `id`, `nome`, `categoria`, `conteudo`, `dataUltimaRevisao` (nullable), `quantidadeRevisoes`, `dataProximaRevisao`, `dataCriacao`.
- [ ] `quantidadeRevisoes` inicia em `0` & `dataUltimaRevisao` em `null` na criação.
- [ ] Fábrica de criação define `dataCriacao = hoje` (RB-07) & `dataProximaRevisao = dataCriacao + 7` (RB-01).
- [ ] Tipos & fábrica exportados por `@study/core`.

## Referências

- CDUs: — · HUs: — · RN: RB-01, RB-07 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
