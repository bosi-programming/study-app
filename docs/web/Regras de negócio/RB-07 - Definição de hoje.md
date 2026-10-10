# RB-07 — Definição de "hoje"

**Categoria:** Agendamento

## Regra

- Todas as datas são **dias de calendário** (sem hora).
- "Hoje" é o dia atual no **fuso horário local** do dispositivo.
- Comparações de data (ordenação, filtro, vencido) consideram apenas o dia.

## Contexto

O cálculo da próxima data (RB-01) & o filtro por data (RB-09) dependem de uma definição estável de dia, independente de hora/minuto.

## Exemplos

- Marcar como revisado às 23h59 grava `dataUltimaRevisao = <dia local>`, não o dia UTC.
- Uma próxima data igual ao dia atual é considerada "hoje" (não vencida).

## Exceções / bordas

- Mudança de fuso do dispositivo pode alterar a interpretação do dia corrente; aceitável no MVP local.

## CDUs & HUs relacionados

- CDUs: [CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md), [CDU-03](../Casos%20de%20uso/CDU-03%20-%20Marcar%20conteúdo%20como%20revisado.md), [CDU-07](../Casos%20de%20uso/CDU-07%20-%20Filtrar%20por%20data%20de%20revisão.md)
- HUs: [HU-03](../Histórias%20de%20usuários/HU-03%20-%20Ver%20a%20próxima%20data%20de%20revisão.md), [HU-04](../Histórias%20de%20usuários/HU-04%20-%20Marcar%20conteúdo%20como%20revisado.md)

## Racional

Evita bugs de hora em cálculos de dias.
