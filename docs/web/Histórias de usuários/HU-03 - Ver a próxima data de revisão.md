# HU-03 — Ver a próxima data de revisão

**Épico:** Revisão espaçada · **Prioridade:** Must · **Estimativa:** 2 SP

## História

Como usuário, quero ver a próxima data de revisão de cada conteúdo, para não esquecer de revisá-lo no dia certo.

## Valor de negócio

É a proposta central do produto: dizer ao usuário a melhor data p/ revisar, aplicando repetição espaçada.

## Critérios de aceite

```gherkin
Cenário: Cartão recém-criado
  Dado um cartão com quantidadeRevisoes = 0
  Então dataProximaRevisao = dataCriacao + 7 dias

Cenário: Intervalos dobrando a partir de 7
  Dado um cartão já revisado
  Então o intervalo é 7 × 2^quantidadeRevisoes dias

Cenário: Teto de intervalo
  Dado quantidadeRevisoes alta
  Então o intervalo é limitado a 365 dias
  E dataProximaRevisao = base + 365 dias

Cenário: Base do cálculo
  Dado um cartão nunca revisado
  Então a base é dataCriacao
  Dado um cartão já revisado
  Então a base é dataUltimaRevisao
```

## Regras de negócio
- `RB-01` (cálculo & teto de 365 dias).

## Requisitos não funcionais
- `RNF-06` (exibição da data no cartão).

## Caso de uso relacionado
- Referenciada por [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md) & [CDU-03](../Casos%20de%20uso/CDU-03%20-%20Marcar%20conteúdo%20como%20revisado.md).

## Definition of Done
- [ ] Função pura de cálculo (`7 × 2^n`, teto 365, base correta).
- [ ] Datas como dias de calendário no fuso local.
- [ ] Exibida em cada cartão.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
