# WEB-04 — Cadastrar conteúdo

**Tipo:** feature · **Épico:** Lista · **Depende de:** WEB-01, WEB-02, CORE-02, CORE-04, CORE-05

## Resumo

Formulário para criar um cartão com nome, categoria & conteúdo.

## O que muda na tela

- Ação "Novo conteúdo" abre um formulário.
- Campos Nome, Categoria (com sugestões das existentes) & Conteúdo.
- Mensagens de erro de validação por campo.
- Após salvar, o cartão aparece na lista.

## Critérios de aceitação

- [ ] Formulário com os 3 campos; Categoria sugere categorias existentes (CORE-05).
- [ ] Validação via CORE-04 (obrigatórios, trim, limites 40/40/5000).
- [ ] Salvar cria o cartão com `dataProximaRevisao = hoje + 7` (CORE-02) & persiste (WEB-02).
- [ ] Categoria nova pode ser criada inline.
- [ ] Cancelar não cria cartão.
- [ ] Componentes do DS no formulário.

## Referências

- CDUs: CDU-01 · HUs: HU-01 · RN: RB-01, RB-06, RB-08, RB-10 · RNFs: RNF-08

## Pull request

- https://github.com/bosi-programming/study-app/pull/15 — em revisão (stack `core-03` ← #9 ← #10 ← #13 ← #14 ← #15).
