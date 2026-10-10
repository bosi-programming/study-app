# CORE-04 — Validação de campos & limites

**Tipo:** feature · **Épico:** Core · **Depende de:** CORE-01

## Resumo

Validação pura dos campos do cartão (obrigatoriedade, normalização & limites de tamanho).

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] `Nome`, `Categoria` & `Conteúdo` obrigatórios; vazios após `trim` são inválidos.
- [ ] Limites: nome ≤ 40, categoria ≤ 40, conteúdo ≤ 5000 caracteres.
- [ ] Valores normalizados com `trim` antes de validar & gravar.
- [ ] Retorna lista de erros por campo (para a UI exibir).
- [ ] Testes cobrindo cada campo vazio, valor no limite & acima do limite.

## Referências

- CDUs: CDU-01, CDU-05 · HUs: HU-01, HU-06 · RN: RB-06, RB-08, RB-10 · RNFs: [RNF-09](../web/Requisitos%20não%20funcionais/RNF-09%20-%20Código%20compartilhado%20em%20packages-core.md), [RNF-12](../web/Requisitos%20não%20funcionais/RNF-12%20-%20Cobertura%20de%20testes.md)
