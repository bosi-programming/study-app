# Tickets — Web

| ID | Título | Depende de | CDUs | HUs | RN | RNFs |
| --- | --- | --- | --- | --- | --- | --- |
| [WEB-01](./WEB-01%20-%20Setup%20Tailwind%20e%20bosi-design-system.md) | Setup Tailwind CSS 4 + bosi-design-system | — | — | — | — | RNF-07, RNF-08 |
| [WEB-02](./WEB-02%20-%20Camada%20de%20persistência%20IndexedDB.md) | Camada de persistência IndexedDB | CORE-01 | CDU-01..08 | HU-10 | — | RNF-01, RNF-02, RNF-11, RNF-13 |
| [WEB-03](./WEB-03%20-%20Tela%20de%20lista%20de%20cartões.md) | Tela de lista de cartões | WEB-01, WEB-02, CORE-06 | CDU-02 | HU-02 | RB-03, RB-05, RB-11 | RNF-04, RNF-05, RNF-06, RNF-08, RNF-10 |
| [WEB-04](./WEB-04%20-%20Cadastrar%20conteúdo.md) | Cadastrar conteúdo | WEB-01, WEB-02, CORE-02, CORE-04, CORE-05 | CDU-01 | HU-01 | RB-01, RB-06, RB-08, RB-10 | RNF-08 |
| [WEB-05](./WEB-05%20-%20Editar%20conteúdo.md) | Editar conteúdo | WEB-04, CORE-04, CORE-05 | CDU-05 | HU-06 | RB-06, RB-08, RB-10 | RNF-08 |
| [WEB-06](./WEB-06%20-%20Excluir%20conteúdo.md) | Excluir conteúdo | WEB-02, WEB-03 | CDU-06 | HU-07 | RB-04 | RNF-08 |
| [WEB-07](./WEB-07%20-%20Marcar%20como%20revisado.md) | Marcar como revisado | WEB-03, CORE-03 | CDU-03 | HU-04 | RB-01, RB-07 | RNF-08 |
| [WEB-08](./WEB-08%20-%20Expandir%20conteúdo.md) | Expandir conteúdo | WEB-03 | CDU-04 | HU-05 | — | RNF-06, RNF-08 |
| [WEB-09](./WEB-09%20-%20Filtrar%20por%20data%20de%20revisão.md) | Filtrar por data de revisão | WEB-03, CORE-07 | CDU-07 | HU-08 | RB-05, RB-09 | RNF-08 |
| [WEB-10](./WEB-10%20-%20Filtrar%20por%20categoria.md) | Filtrar por categoria | WEB-03, CORE-05, CORE-07 | CDU-08 | HU-09 | RB-02, RB-05, RB-08 | RNF-08 |
| [WEB-11](./WEB-11%20-%20Exibir%20a%20próxima%20data%20de%20revisão.md) | Exibir a próxima data de revisão | WEB-01, CORE-02 | CDU-02 | HU-03 | RB-01, RB-07 | RNF-08 |

## Ordem sugerida

WEB-01 → WEB-02 → WEB-03 → WEB-11 → WEB-04 → WEB-05 → WEB-06 → WEB-07 → WEB-08 → WEB-09 → WEB-10.

## Convenções

- 1 arquivo Markdown por ticket; IDs `WEB-*` estáveis.
- Regras de negócio são consumidas de `@study/core` (tickets CORE-*), nunca reimplementadas na UI.
- Tickets de infraestrutura têm "O que muda na tela" = "Nenhuma mudança visual — infraestrutura".
