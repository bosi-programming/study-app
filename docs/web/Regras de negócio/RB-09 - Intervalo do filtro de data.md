# RB-09 — Intervalo do filtro de data

**Categoria:** UI

## Regra

- O filtro de data de revisão seleciona cartões cuja `dataProximaRevisao` está no intervalo informado.
- O intervalo é **inclusivo** em ambas as pontas: `[início, fim]`.
- Pode-se informar só início, só fim, || ambos.
- O filtro de data combina com o de categoria em conjunção (E), sob a ordenação de RB-03.

## Contexto

Aplicado na lista (CDU-07) sobre a `dataProximaRevisao`.

## Exemplos

- Intervalo 2026-10-10 a 2026-10-17 inclui cartões com próxima data exatamente em 10/10 e em 17/10.
- Só início = "a partir de"; só fim = "até".

## Exceções / bordas

- Intervalo inválido (início > fim): o sistema sinaliza || ignora.
- Sem resultados: estado vazio de filtro (RB-05).

## CDUs & HUs relacionados

- CDUs: [CDU-07](../Casos%20de%20uso/CDU-07%20-%20Filtrar%20por%20data%20de%20revisão.md)
- HUs: [HU-08](../Histórias%20de%20usuários/HU-08%20-%20Filtrar%20por%20data%20de%20revisão.md)

## Racional

Intervalo inclusivo é o comportamento esperado em filtros de data.
