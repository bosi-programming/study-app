# WEB-06 — Excluir conteúdo

**Tipo:** feature · **Épico:** Lista · **Depende de:** WEB-02, WEB-03

## Resumo

Excluir um cartão com confirmação.

## O que muda na tela

- Icon button "excluir" abre um diálogo de confirmação.
- Lista atualizada após confirmar.

## Critérios de aceitação

- [ ] Icon "excluir" abre diálogo de confirmação (RB-04).
- [ ] Confirmar remove o cartão do IndexedDB (WEB-02) & atualiza a lista.
- [ ] Cancelar não remove nada.
- [ ] Ao excluir o último cartão de uma categoria, ela some do filtro.
- [ ] Falha ao remover exibe erro & mantém o cartão.
- [ ] Diálogo usa componentes do DS.

## Referências

- CDUs: CDU-06 · HUs: HU-07 · RN: RB-04 · RNFs: RNF-08
