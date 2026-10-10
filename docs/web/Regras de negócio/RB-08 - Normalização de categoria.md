# RB-08 — Normalização de categoria

**Categoria:** Dados

## Regra

- O valor da categoria é normalizado com `trim`.
- A comparação & a sugestão de categorias são **case-insensitive** ("Inglês" == "inglês").
- Categoria vazia (após `trim`) é proibida (ver RB-06).

## Contexto

Garante que o filtro (CDU-08) & a sugestão agrupem corretamente categorias escritas com caixas diferentes.

## Exemplos

- "Português", "português" & "PORTUGUÊS" são tratadas como a mesma categoria no filtro & na sugestão.
- "  Inglês  " é armazenada como "Inglês".

## Exceções / bordas

- O valor exibido preserva a grafia da última edição; só a chave de comparação é case-insensitive.
- Limite de tamanho conforme RB-10.

## CDUs & HUs relacionados

- CDUs: [CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md), [CDU-05](../Casos%20de%20uso/CDU-05%20-%20Editar%20conteúdo.md), [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md)
- HUs: [HU-01](../Histórias%20de%20usuários/HU-01%20-%20Cadastrar%20conteúdo.md), [HU-09](../Histórias%20de%20usuários/HU-09%20-%20Filtrar%20por%20categoria.md)

## Racional

Evita categorias duplicadas por diferença de caixa.
