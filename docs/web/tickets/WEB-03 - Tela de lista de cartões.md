# WEB-03 — Tela de lista de cartões

**Tipo:** feature · **Épico:** Lista · **Depende de:** WEB-01, WEB-02, CORE-06

## Resumo

Tela principal: barra de filtros & lista de cartões colapsados com ações, ordenada pela próxima revisão.

## O que muda na tela

- Cabeçalho com logo.
- Faixa de filtros (data de revisão + categoria).
- Lista de cartões colapsados: próxima data, nome, categoria & icon buttons (marcar revisado, editar, excluir, expandir).
- Mensagens de estado vazio distintas (sem cartões vs. sem resultados para filtros).
- Cartões vencidos com destaque vermelho.

## Critérios de aceitação

- [ ] Largura máx. 1024px, 40px lateral, espaçamentos 40/8/20px (RNF-04, RNF-05).
- [ ] Ordem via CORE-06 (próxima data asc; empate por nome).
- [ ] Cartão colapsado exibe próxima data, nome & categoria + os 4 icon buttons.
- [ ] Cartão vencido (CORE-08) com destaque `--color-error` do DS.
- [ ] Estado vazio: "sem cartões" quando não há cartões; "sem resultados para os filtros" quando há filtro ativo.
- [ ] Icon buttons com `aria-label` & operáveis por teclado (RNF-06).
- [ ] Componentes do DS (`bosi-design-system`) usados na tela.
- [ ] Render/ordenação de 500 cartões < 100ms (RNF-10).

## Referências

- CDUs: CDU-02 · HUs: HU-02 · RN: RB-03, RB-05, RB-11 · RNFs: RNF-04, RNF-05, RNF-06, RNF-08, RNF-10

## Pull request

- https://github.com/bosi-programming/study-app/pull/13 — em revisão (stack `core-03` ← #9 ← #10 ← #13).
