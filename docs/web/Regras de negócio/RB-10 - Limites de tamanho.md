# RB-10 — Limites de tamanho

**Categoria:** Dados

## Regra

- **Nome**: máximo **40** caracteres.
- **Categoria**: máximo **40** caracteres.
- **Conteúdo**: máximo **5000** caracteres.
- Valores acima do limite são rejeitados na validação (ver RB-06).

## Contexto

Aplicado ao cadastrar (CDU-01) & editar (CDU-05). Mantém a UI & os registros do IndexedDB sob controle.

## Exemplos

- Nome com 41 caracteres → erro de validação.
- Conteúdo com 5001 caracteres → erro de validação.

## Exceções / bordas

- Contagem de caracteres após `trim` (RB-08/RB-06).
- O limite é por campo; não há limite de quantidade de cartões.

## CDUs & HUs relacionados

- CDUs: [CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md), [CDU-05](../Casos%20de%20uso/CDU-05%20-%20Editar%20conteúdo.md)
- HUs: [HU-01](../Histórias%20de%20usuários/HU-01%20-%20Cadastrar%20conteúdo.md), [HU-06](../Histórias%20de%20usuários/HU-06%20-%20Editar%20conteúdo.md)

## Racional

Limites coerentes com o layout & evitam abuso de armazenamento.
