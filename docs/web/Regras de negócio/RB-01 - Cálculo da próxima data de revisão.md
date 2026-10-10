# RB-01 — Cálculo da próxima data de revisão

**Categoria:** Agendamento

## Regra

- `intervalo` (dias) = `min(7 × 2^quantidadeRevisoes, 365)`.
- `dataProximaRevisao = base + intervalo`, em dias de calendário, com:
  - `base = dataCriacao` quando `quantidadeRevisoes = 0` (nunca revisado);
  - `base = dataUltimaRevisao` caso contrário.

## Contexto

É a regra central do produto (repetição espaçada). Aplicada ao cadastrar (CDU-01), ao marcar como revisado (CDU-03) & refletida na lista (CDU-02).

## Exemplos

| quantidadeRevisoes | intervalo (dias) |
| --- | --- |
| 0 | 7 |
| 1 | 14 |
| 2 | 28 |
| 3 | 56 |
| 4 | 112 |
| 5 | 224 |
| 6 | 365 |
| 7+ | 365 |

## Exceções / bordas

- Cartão novo: `quantidadeRevisoes = 0`, `dataUltimaRevisao = null`, `dataProximaRevisao = dataCriacao + 7`.
- Ao marcar como revisado (CDU-03): `dataUltimaRevisao = hoje`, `quantidadeRevisoes += 1`, recalcular com a nova contagem.
- Teto de 365 dias nunca é ultrapassado.
- "Hoje" & todas as datas seguem RB-07 (dia de calendário no fuso local).

## CDUs & HUs relacionados

- CDUs: [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md), [CDU-03](../Casos%20de%20uso/CDU-03%20-%20Marcar%20conteúdo%20como%20revisado.md)
- HUs: [HU-03](../Histórias%20de%20usuários/HU-03%20-%20Ver%20a%20próxima%20data%20de%20revisão.md), [HU-04](../Histórias%20de%20usuários/HU-04%20-%20Marcar%20conteúdo%20como%20revisado.md)

## Racional

Intervalos que dobram a partir de 7 dias equilibram frequência inicial alta com custo crescente de retenção. O teto de 365 evita intervalos absurdos.
