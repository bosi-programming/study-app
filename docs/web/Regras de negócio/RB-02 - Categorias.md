# RB-02 — Categorias

**Categoria:** Dados

## Regra

- Categorias são texto livre, **criadas pelo usuário** ao criar || editar um cartão.
- Ao digitar, o sistema sugere categorias já existentes nos cartões.
- O filtro de categoria (CDU-08) lista apenas as categorias presentes em algum cartão.
- Não existe entidade "categoria" separada; a lista é derivada dos cartões.

## Contexto

Permite organizar & filtrar conteúdos sem uma tela de gestão de categorias.

## Exemplos

- Ao criar um cartão e digitar "Inglês", "Inglês" passa a existir quando o cartão é salvo.
- Se todos os cartões de "Inglês" forem excluídos, "Inglês" some do filtro.

## Exceções / bordas

- Normalização & comparação conforme RB-08 (trim, case-insensitive, vazio proibido).
- Limite de tamanho conforme RB-10.

## CDUs & HUs relacionados

- CDUs: [CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md), [CDU-05](../Casos%20de%20uso/CDU-05%20-%20Editar%20conteúdo.md), [CDU-06](../Casos%20de%20uso/CDU-06%20-%20Excluir%20conteúdo.md), [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md)
- HUs: [HU-01](../Histórias%20de%20usuários/HU-01%20-%20Cadastrar%20conteúdo.md), [HU-06](../Histórias%20de%20usuários/HU-06%20-%20Editar%20conteúdo.md), [HU-09](../Histórias%20de%20usuários/HU-09%20-%20Filtrar%20por%20categoria.md)

## Racional

Categorias inline reduzem atrito & mantêm o MVP sem CRUD de categorias.
