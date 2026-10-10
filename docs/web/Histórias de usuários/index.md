# Histórias de usuários — Study Web

| HU | Título | Épico | Prioridade | SP | CDU / RNF |
| --- | --- | --- | --- | --- | --- |
| [HU-01](./HU-01%20-%20Cadastrar%20conteúdo.md) | Cadastrar conteúdo | Gestão | Must | 3 | CDU-01 |
| [HU-02](./HU-02%20-%20Ver%20lista%20de%20conteúdos.md) | Ver lista de conteúdos | Gestão | Must | 3 | CDU-02 |
| [HU-03](./HU-03%20-%20Ver%20a%20próxima%20data%20de%20revisão.md) | Ver a próxima data de revisão | Revisão espaçada | Must | 2 | RB-01 |
| [HU-04](./HU-04%20-%20Marcar%20conteúdo%20como%20revisado.md) | Marcar conteúdo como revisado | Revisão espaçada | Must | 2 | CDU-03 |
| [HU-05](./HU-05%20-%20Ver%20conteúdo%20completo.md) | Ver conteúdo completo | Gestão | Should | 1 | CDU-04 |
| [HU-06](./HU-06%20-%20Editar%20conteúdo.md) | Editar conteúdo | Gestão | Should | 2 | CDU-05 |
| [HU-07](./HU-07%20-%20Excluir%20conteúdo.md) | Excluir conteúdo | Gestão | Should | 2 | CDU-06 |
| [HU-08](./HU-08%20-%20Filtrar%20por%20data%20de%20revisão.md) | Filtrar por data de revisão | Organização | Should | 3 | CDU-07 |
| [HU-09](./HU-09%20-%20Filtrar%20por%20categoria.md) | Filtrar por categoria | Organização | Could | 3 | CDU-08 |
| [HU-10](./HU-10%20-%20Dados%20salvos%20no%20navegador.md) | Dados salvos no navegador | Persistência | Must | 5 | RNF-01, RNF-02 |

## Rastreabilidade CDU ↔ HU

| CDU | HU |
| --- | --- |
| [CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md) | HU-01 |
| [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md) | HU-02 |
| [CDU-03](../Casos%20de%20uso/CDU-03%20-%20Marcar%20conteúdo%20como%20revisado.md) | HU-04 |
| [CDU-04](../Casos%20de%20uso/CDU-04%20-%20Expandir%20conteúdo.md) | HU-05 |
| [CDU-05](../Casos%20de%20uso/CDU-05%20-%20Editar%20conteúdo.md) | HU-06 |
| [CDU-06](../Casos%20de%20uso/CDU-06%20-%20Excluir%20conteúdo.md) | HU-07 |
| [CDU-07](../Casos%20de%20uso/CDU-07%20-%20Filtrar%20por%20data%20de%20revisão.md) | HU-08 |
| [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md) | HU-09 |
| (RB-01) | HU-03 |
| (RNF-01, RNF-02) | HU-10 |

## Priorização (MoSCoW)

- **Must:** HU-01, HU-02, HU-03, HU-04, HU-10 — soma 15 SP.
- **Should:** HU-05, HU-06, HU-07, HU-08 — soma 7 SP.
- **Could:** HU-09 — soma 3 SP.

Total: **25 SP**.

## Épicos

- **Gestão:** HU-01, HU-02, HU-05, HU-06, HU-07.
- **Revisão espaçada:** HU-03, HU-04.
- **Organização:** HU-08, HU-09.
- **Persistência:** HU-10.

## Unresolved

1. Nenhuma pendência de decisão nas HUs.
2. Ordem de implementação sugerida: HU-01 → HU-03 → HU-02 → HU-04 → HU-10 → (HU-05/06/07) → (HU-08/09). Confirmar se é a sequência desejada.
