# RNF-06 — Acessibilidade

**Categoria (ISO 25010):** Usabilidade

## Requisito

- Interface acessível no nível **WCAG 2.1 AA**.
- Elementos interativos (icon buttons) com `aria-label`.
- Navegação completa por teclado.

## Métrica / critério de verificação

- Contraste AA; foco visível; operável só com teclado.
- Todos os controles sem texto visível possuem `aria-label`.

## Como verificar

- Auditoria (axe/Lighthouse) & teste manual de teclado.

## Relacionados

- CDUs: [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md), [CDU-03](../Casos%20de%20uso/CDU-03%20-%20Marcar%20conteúdo%20como%20revisado.md), [CDU-04](../Casos%20de%20uso/CDU-04%20-%20Expandir%20conteúdo.md)
- RNFs: RNF-08 (design system)
