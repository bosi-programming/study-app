# CORE-05 — Normalização & derivação de categorias

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01

## Resumo

Normalizar nomes de categoria & derivar a lista distinta a partir dos cartões.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [x] Normalização com `trim`; comparação & agrupamento **case-insensitive** ("Inglês" == "inglês").
- [x] A grafia exibida preserva o valor; só a chave de comparação é case-insensitive.
- [x] `categoriasDistintas(cartoes)` retorna categorias únicas (sem duplicatas por caixa) & ordenadas.
- [x] Testes cobrindo duplicatas por caixa, espaços & ordenação.

## Entrega

Implementada como funções puras em `packages/core/src/category.ts`, reexportadas por `@study/core` (RNF-09): `categoryKey(category)` == `category.trim().toLowerCase()` (a chave de comparação, RB-08 — Unicode default, locale-independente) & `distinctCategories(cards)` — deduplica por `categoryKey`, preserva a **primeira** grafia vista na ordem dos cartões (a chave nunca substitui o valor exibido) & ordena ascendente com `localeCompare(other, 'pt-BR')` (RB-03); devolve array novo & não muta a entrada. *(Nomes de código em inglês, conforme AGENTS.md — o `categoriasDistintas` do critério é o `distinctCategories`.)* Testes em `packages/core/test/category.test.ts` (+ barrel em `index.test.ts`): duplicatas por caixa & espaços, ordenação pt-BR, determinismo & não-mutação; local gate verde (typecheck + lint + coverage 100%). PR: https://github.com/bosi-programming/study-app/pull/4

## Referências

- CDUs: CDU-01, CDU-05, CDU-08 · HUs: HU-01, HU-09 · RN: RB-02, RB-08 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md)
