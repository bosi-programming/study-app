# WEB-07 — Marcar como revisado

**Tipo:** feature · **Épico:** Revisão · **Depende de:** WEB-03, CORE-03

## Resumo

Marcar um cartão como revisado, recalculando a próxima data.

## O que muda na tela

- Icon button "marcar como revisado" no cartão, **antes** do botão de editar.
- Cartão reaparece reordenado com a nova próxima data.

## Critérios de aceitação

- [ ] Icon "marcar como revisado" posicionado antes do ícone de editar.
- [ ] Acionar atualiza o cartão via CORE-03 (última revisão = hoje, contador + 1, próxima data recalculada com teto 365) & persiste (WEB-02).
- [ ] Lista reordenada conforme RB-03 após revisar.
- [ ] Falha ao persistir exibe erro & mantém os valores anteriores.
- [ ] Icon button com `aria-label` (RNF-06).

## Referências

- CDUs: CDU-03 · HUs: HU-04 · RN: RB-01, RB-07 · RNFs: RNF-08
