# Tickets — Core

| ID | Título | Depende de | RN | HUs | RNFs |
| --- | --- | --- | --- | --- | --- |
| [CORE-01](./CORE-01%20-%20Modelo%20e%20tipos%20do%20Cartão.md) | Modelo & tipos do Cartão | — | RB-01, RB-07 | — | RNF-09 |
| [CORE-02](./CORE-02%20-%20Cálculo%20da%20próxima%20data%20de%20revisão.md) | Cálculo da próxima data de revisão | CORE-01 | RB-01, RB-07 | HU-03 | RNF-09, RNF-12 |
| [CORE-03](./CORE-03%20-%20Transição%20marcar%20como%20revisado.md) | Transição "marcar como revisado" | CORE-01, CORE-02 | RB-01, RB-07 | HU-04 | RNF-09, RNF-12 |
| [CORE-04](./CORE-04%20-%20Validação%20de%20campos%20e%20limites.md) | Validação de campos & limites | CORE-01 | RB-06, RB-08, RB-10 | HU-01, HU-06 | RNF-09, RNF-12 |
| [CORE-05](./CORE-05%20-%20Normalização%20e%20derivação%20de%20categorias.md) | Normalização & derivação de categorias | CORE-01 | RB-02, RB-08 | HU-01, HU-09 | RNF-09 |
| [CORE-06](./CORE-06%20-%20Ordenação%20da%20lista.md) | Ordenação da lista | CORE-01 | RB-03 | HU-02 | RNF-09, RNF-10 |
| [CORE-07](./CORE-07%20-%20Filtros%20(data%20inclusivo%20e%20categoria).md) | Filtros (data inclusivo + categoria) | CORE-01, CORE-05 | RB-02, RB-09 | HU-08, HU-09 | RNF-09 |
| [CORE-08](./CORE-08%20-%20Predicado%20de%20cartão%20vencido.md) | Predicado de cartão vencido | CORE-01, CORE-02 | RB-07, RB-11 | HU-02 | RNF-09 |

## Ordem sugerida

CORE-01 → CORE-02 → CORE-04 → CORE-05 → CORE-06 → CORE-07 → CORE-08 → CORE-03.

## Convenções

- 1 arquivo Markdown por ticket; IDs `CORE-*` estáveis.
- Todo código de regra de negócio vive em `packages/core` (RNF-09).
