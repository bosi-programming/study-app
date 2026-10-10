# RB-03 — Ordenação da lista

**Categoria:** UI

## Regra

- Ordem padrão: `dataProximaRevisao` ascendente.
- Empate: `nome` ascendente (ordem alfabética, pt-BR).

## Contexto

A lista (CDU-02) deve mostrar primeiro o que precisa ser revisado antes. A ordenação é reaplicada após cadastrar, revisar, editar, excluir & filtrar.

## Exemplos

- Cartões com datas 2026-10-12 e 2026-10-10 → o de 10/10 vem primeiro.
- Dois cartões com a mesma data: "Ábaco" antes de "Zebra".

## Exceções / bordas

- Cartões vencidos (`dataProximaRevisao < hoje`) sobem naturalmente ao topo (ver RB-11).

## CDUs & HUs relacionados

- CDUs: [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md), [CDU-03](../Casos%20de%20uso/CDU-03%20-%20Marcar%20conteúdo%20como%20revisado.md), [CDU-07](../Casos%20de%20uso/CDU-07%20-%20Filtrar%20por%20data%20de%20revisão.md), [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md)
- HUs: [HU-02](../Histórias%20de%20usuários/HU-02%20-%20Ver%20lista%20de%20conteúdos.md)

## Racional

Compartilha a função de ordenação entre todas as operações de lista.
