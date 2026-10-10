# RNF-08 — Design system

**Categoria (ISO 25010):** Usabilidade / Manutenibilidade

## Requisito

- A UI deve usar os componentes do **`bosi-design-system`**.
- Import via `bosi-design-system/react`.
- Dependência direta do GitHub: `github:bosi-programming/bosi-design-system` (**sem pin de versão**).
- Integração com Tailwind CSS 4:
  - em `index.css`: `@import 'tailwindcss';` & `@source "../node_modules/bosi-design-system/react-dist";`;
  - `@tailwindcss/vite` no Vite;
  - `onlyBuiltDependencies` do pnpm inclui `bosi-design-system`.

## Métrica / critério de verificação

- Componentes de UI importados do DS sempre que disponíveis.
- Build resolve `bosi-design-system/react` & as classes do DS são geradas pelo Tailwind.

## Como verificar

- Build de produção + inspeção de componentes renderizados.

## Relacionados

- RNFs: RNF-05 (espaçamentos), RNF-06 (acessibilidade), RNF-07 (stack)
