# RNF-13 — Escrita atômica

**Categoria (ISO 25010):** Confiabilidade

## Requisito

- Operações de escrita no IndexedDB são **atômicas**: falha parcial não corrompe os dados.
- Falha de persistência é tratada & reportada ao usuário.

## Métrica / critério de verificação

- Após falha simulada, os dados permanecem consistentes (estado anterior || novo, nunca meio-termo).

## Como verificar

- Testes com `fake-indexeddb` injetando falha de transação.

## Relacionados

- HUs: [HU-04](../Histórias%20de%20usuários/HU-04%20-%20Marcar%20conteúdo%20como%20revisado.md), [HU-07](../Histórias%20de%20usuários/HU-07%20-%20Excluir%20conteúdo.md)
- RNFs: RNF-01 (persistência)
