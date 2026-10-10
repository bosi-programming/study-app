# RB-05 — Estados vazios

**Categoria:** UI

## Regra

- Sem cartões cadastrados: mensagem informando que não há cartões.
- Sem resultados após aplicar filtros: mensagem informando que não há cartões p/ aqueles filtros.

## Contexto

Diferencia "nada cadastrado" de "nada corresponde ao filtro", orientando o usuário sobre o próximo passo.

## Exemplos

- Lista vazia e sem filtros → "Você ainda não tem cartões."
- Filtro de categoria "Inglês" sem resultados → "Nenhum cartão para esses filtros."

## Exceções / bordas

- As duas mensagens são distintas; nunca exibir a de filtros quando não há filtro ativo.

## CDUs & HUs relacionados

- CDUs: [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md), [CDU-07](../Casos%20de%20uso/CDU-07%20-%20Filtrar%20por%20data%20de%20revisão.md), [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md)
- HUs: [HU-02](../Histórias%20de%20usuários/HU-02%20-%20Ver%20lista%20de%20conteúdos.md), [HU-08](../Histórias%20de%20usuários/HU-08%20-%20Filtrar%20por%20data%20de%20revisão.md), [HU-09](../Histórias%20de%20usuários/HU-09%20-%20Filtrar%20por%20categoria.md)

## Racional

Evita ambiguidade em telas sem conteúdo.
