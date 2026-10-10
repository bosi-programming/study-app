# RNF-10 — Desempenho

**Categoria (ISO 25010):** Eficiência de desempenho

## Requisito

- Renderização & ordenação da lista de **500 cartões** em menos de **100ms**.

## Métrica / critério de verificação

- Ordenar & renderizar 500 cartões < 100ms (ambiente de referência do dev).

## Como verificar

- Benchmark (ver `scripts/bench-web.ts` no `package.json`).

## Relacionados

- RNFs: RNF-12 (cobertura)
