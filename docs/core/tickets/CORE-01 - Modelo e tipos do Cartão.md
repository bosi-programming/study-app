# CORE-01 — Modelo & tipos do Cartão

**Tipo:** feature · **Épico:** Core · **Depende de:** —

## Resumo

Definir o tipo `Cartao` & a fábrica de criação, base de todas as regras do `@study/core`.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [x] Tipo `Cartao` com: `id`, `nome`, `categoria`, `conteudo`, `dataUltimaRevisao` (nullable), `quantidadeRevisoes`, `dataProximaRevisao`, `dataCriacao`.
- [x] `quantidadeRevisoes` inicia em `0` & `dataUltimaRevisao` em `null` na criação.
- [x] Fábrica de criação define `dataCriacao = hoje` (RB-07) & `dataProximaRevisao = dataCriacao + 7` (RB-01).
- [x] Tipos & fábrica exportados por `@study/core`.

## Entrega

**Entregue.** Implementado em `packages/core/src` (`data.ts`, `card.ts`, `index.ts`) com testes em `packages/core/test` (23/23, cobertura 100%). Merge direto em `main` (`b126049`), sem PR. Código em inglês (ver `AGENTS.md`): `Cartao`→`Card`, `criarCartao`→`createCard`, `Dia`→`CalendarDay`.

## Referências

- CDUs: — · HUs: — · RN: RB-01, RB-07 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
