# Regras de negócio — Study Web

| ID | Regra | Categoria | CDUs | HUs |
| --- | --- | --- | --- | --- |
| [RB-01](./RB-01%20-%20Cálculo%20da%20próxima%20data%20de%20revisão.md) | Cálculo da próxima data de revisão | Agendamento | CDU-02, CDU-03 | HU-03, HU-04 |
| [RB-02](./RB-02%20-%20Categorias.md) | Categorias | Dados | CDU-01, CDU-05, CDU-06, CDU-08 | HU-01, HU-06, HU-09 |
| [RB-03](./RB-03%20-%20Ordenação%20da%20lista.md) | Ordenação da lista | UI | CDU-02, CDU-03, CDU-07, CDU-08 | HU-02 |
| [RB-04](./RB-04%20-%20Confirmação%20de%20exclusão.md) | Confirmação de exclusão | UI | CDU-06 | HU-07 |
| [RB-05](./RB-05%20-%20Estados%20vazios.md) | Estados vazios | UI | CDU-02, CDU-07, CDU-08 | HU-02, HU-08, HU-09 |
| [RB-06](./RB-06%20-%20Validação%20de%20campos.md) | Validação de campos | Dados | CDU-01, CDU-05 | HU-01, HU-06 |
| [RB-07](./RB-07%20-%20Definição%20de%20hoje.md) | Definição de "hoje" | Agendamento | CDU-01, CDU-03, CDU-07 | HU-03, HU-04 |
| [RB-08](./RB-08%20-%20Normalização%20de%20categoria.md) | Normalização de categoria | Dados | CDU-01, CDU-05, CDU-08 | HU-01, HU-09 |
| [RB-09](./RB-09%20-%20Intervalo%20do%20filtro%20de%20data.md) | Intervalo do filtro de data | UI | CDU-07 | HU-08 |
| [RB-10](./RB-10%20-%20Limites%20de%20tamanho.md) | Limites de tamanho | Dados | CDU-01, CDU-05 | HU-01, HU-06 |
| [RB-11](./RB-11%20-%20Cartão%20vencido.md) | Cartão vencido | UI | CDU-02 | HU-02 |

## Categorias

- **Agendamento:** RB-01, RB-07.
- **Dados:** RB-02, RB-06, RB-08, RB-10.
- **UI:** RB-03, RB-04, RB-05, RB-09, RB-11.

## Convenções

- Cada regra é testável & vive em arquivo próprio.
- IDs `RB-*` são estáveis & referenciados por CDUs, HUs & `index.md`.
