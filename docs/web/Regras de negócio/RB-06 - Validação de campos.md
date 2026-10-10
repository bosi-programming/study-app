# RB-06 — Validação de campos

**Categoria:** Dados

## Regra

- **Nome**, **Categoria** & **Conteúdo** são obrigatórios.
- Após `trim`, nenhum pode ser vazio.
- Um cartão só é persistido se todos passarem na validação.

## Contexto

Aplicada ao cadastrar (CDU-01) & editar (CDU-05), antes de gravar no IndexedDB.

## Exemplos

- Nome " " (só espaços) → inválido.
- Categoria vazia → inválido.
- Conteúdo vazio → inválido.

## Exceções / bordas

- Os valores são normalizados (`trim`) antes da validação & da gravação (ver RB-08).
- Limites de tamanho em RB-10.

## CDUs & HUs relacionados

- CDUs: [CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md), [CDU-05](../Casos%20de%20uso/CDU-05%20-%20Editar%20conteúdo.md)
- HUs: [HU-01](../Histórias%20de%20usuários/HU-01%20-%20Cadastrar%20conteúdo.md), [HU-06](../Histórias%20de%20usuários/HU-06%20-%20Editar%20conteúdo.md)

## Racional

Garante integridade mínima dos dados sem backend.
