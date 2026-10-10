# WEB-01 — Setup Tailwind CSS 4 + bosi-design-system

**Tipo:** infra · **Épico:** Fundação · **Depende de:** —

## Resumo

Configurar Tailwind CSS 4 & integrar o `bosi-design-system`, base da UI.

## O que muda na tela

Nenhuma mudança visual — infraestrutura (habilita os componentes do design system).

## Critérios de aceitação

- [ ] Tailwind CSS 4 configurado (`@tailwindcss/vite` + `@import 'tailwindcss'`).
- [ ] Dependência `bosi-design-system` (GitHub `bosi-programming/bosi-design-system`, sem pin).
- [ ] `@source "../node_modules/bosi-design-system/react-dist"` no CSS de entrada.
- [ ] `onlyBuiltDependencies` do pnpm inclui `bosi-design-system`.
- [ ] Um componente do DS (ex.: `Typography`) renderiza na app sem erro.
- [ ] Build de produção conclui sem erro.

## Referências

- CDUs: — · HUs: — · RN: — · RNFs: RNF-07, RNF-08
