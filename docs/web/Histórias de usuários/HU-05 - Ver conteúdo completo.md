# HU-05 — Ver conteúdo completo

**Épico:** Gestão · **Prioridade:** Should · **Estimativa:** 1 SP

## História

Como usuário, quero expandir um cartão, para ler o conteúdo completo a revisar sem sair da lista.

## Valor de negócio

Permite revisar o conteúdo no próprio contexto da lista, sem abrir outra tela.

## Critérios de aceite

```gherkin
Cenário: Expandir um cartão
  Dado um cartão colapsado
  Quando aciono o ícone "expandir"
  Então o conteúdo do cartão é exibido abaixo do cabeçalho

Cenário: Recolher um cartão
  Dado um cartão expandido
  Quando aciono "recolher"
  Então o conteúdo é ocultado e o cartão volta ao estado colapsado

Cenário: Conteúdo vazio
  Dado um cartão com conteúdo vazio
  Então vejo um indicador de conteúdo vazio
```

## Regras de negócio
- Nenhuma regra de agendamento envolvida.

## Requisitos não funcionais
- `RNF-05`, `RNF-06`, `RNF-07`.

## Caso de uso relacionado
- [CDU-04](../Casos%20de%20uso/CDU-04%20-%20Expandir%20conteúdo.md)

## Definition of Done
- [ ] Alternância colapsado/expandido.
- [ ] Exibição do conteúdo.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
