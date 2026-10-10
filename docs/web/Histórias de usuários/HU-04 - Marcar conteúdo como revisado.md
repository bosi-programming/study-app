# HU-04 — Marcar conteúdo como revisado

**Épico:** Revisão espaçada · **Prioridade:** Must · **Estimativa:** 2 SP

## História

Como usuário, quero marcar um conteúdo como revisado, para que o sistema calcule a próxima data com o intervalo maior.

## Valor de negócio

Fecha o ciclo de repetição espaçada: cada revisão afasta a próxima, concentrando o esforço no que está "vencido".

## Critérios de aceite

```gherkin
Cenário: Marcar como revisado
  Dado um cartão na lista
  Quando aciono o ícone "marcar como revisado"
  Então dataUltimaRevisao = hoje
  E quantidadeRevisoes é incrementada em 1
  E dataProximaRevisao = hoje + min(7 × 2^quantidadeRevisoes, 365)
  E o cartão é persistido no IndexedDB

Cenário: Reordenar após revisar
  Dado que marquei um cartão como revisado
  Então a lista é reordenada conforme RB-03

Cenário: Falha ao persistir
  Dado que a gravação falha
  Então vejo uma mensagem de erro
  E os valores anteriores do cartão são mantidos

Cenário: Posição do ícone
  Dado um cartão colapsado
  Então o ícone "marcar como revisado" aparece antes do ícone de editar
```

## Regras de negócio
- `RB-01` (recalcula próxima data), `RB-03` (reordenação).

## Requisitos não funcionais
- `RNF-01`, `RNF-06`, `RNF-07`.

## Caso de uso relacionado
- [CDU-03](../Casos%20de%20uso/CDU-03%20-%20Marcar%20conteúdo%20como%20revisado.md)

## Definition of Done
- [ ] Ícone (icon button) antes do botão de editar.
- [ ] Atualiza última revisão, contador & próxima data.
- [ ] Persiste & reordena.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
