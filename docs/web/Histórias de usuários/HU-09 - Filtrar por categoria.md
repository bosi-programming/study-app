# HU-09 — Filtrar por categoria

**Épico:** Organização · **Prioridade:** Could · **Estimativa:** 3 SP

## História

Como usuário, quero filtrar conteúdos por categoria, para focar num assunto específico.

## Valor de negócio

Permite separar contextos (ex.: só "Inglês") sem sair da tela principal.

## Critérios de aceite

```gherkin
Cenário: Listar categorias disponíveis
  Dado a lista exibida
  Quando abro o dropdown de Categoria
  Então vejo apenas categorias presentes em algum cartão

Cenário: Filtrar por categoria
  Dado o dropdown aberto
  Quando seleciono uma categoria
  Então vejo apenas cartões dessa categoria

Cenário: Combinar com filtro de data
  Dado que tenho uma categoria selecionada
  Quando também aplico um filtro de data
  Então os dois filtros são aplicados em conjunto
  E a lista mantém a ordenação de RB-03

Cenário: Sem categorias disponíveis
  Dado que não há cartões
  Então o dropdown exibe estado vazio ou fica desabilitado

Cenário: Sem resultados
  Dado um filtro de categoria ativo
  Quando nenhum cartão corresponde
  Então vejo a mensagem de que não há cartões para aqueles filtros

Cenário: Limpar o filtro
  Dado um filtro de categoria ativo
  Quando limpo o filtro
  Então a lista volta a exibir todos os cartões
```

## Regras de negócio
- `RB-02` (categorias), `RB-03` (ordenação), `RB-05` (estado vazio).

## Requisitos não funcionais
- `RNF-04`, `RNF-05`, `RNF-06`, `RNF-08`, `RNF-10`.

## Caso de uso relacionado
- [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md)

## Definition of Done
- [ ] Dropdown derivado das categorias dos cartões.
- [ ] Combinação com o filtro de data.
- [ ] Estado vazio & sem resultados.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
