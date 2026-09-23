---
numero: 18
titulo: 'findItems com filtro: a porta de consulta do store'
data: '2026-09-22'
status: 'aceito'
---

# ADR-018 — `findItems` com filtro: a porta de consulta do store

- Contexto: o [ADR-016](adr-016-camada-de-persistencia-do-cli-schema-mapeamento-e-store.md) fixou as primitivas do store e registrou o gatilho de revisão — a ENG-6 precisar de uma consulta que não cabe nelas. O `study find` do `docs/especificacao/CLI.md` aceita os mesmos filtros de `list` (`--status` e `-s`) e ordena por vencimento, então a busca precisa de título, status e matéria na mesma consulta: `findItems(term)` sozinho não fecha, e filtrar em memória no comando espalharia regra de consulta para a borda.
- Decisão: `findItems(term, filter?: ItemFilter)` recebe o mesmo `ItemFilter` (`status`, `subjectKey`) que `listItems` já aceitava. As cláusulas e os parâmetros saem de um `filterClauses(filter)` privado, compartilhado pelas duas consultas, e ambas mantêm `ORDER BY due_date, id` como invariante de exibição. O `LIKE ... ESCAPE` e o escape de `%`, `_` e `\` continuam no store.
- Consequência: o comando `find` não escreve SQL nem filtra em memória — compõe a primitiva, como o ADR-016 manda; `list` e `find` passam a ser a mesma consulta ordenada, provada pelos casos `store-findItems-filtra` e `store-findItems-combina`.
- Consequência: `ItemFilter` é a porta de consulta da persistência para os comandos desta fase; o segundo consumidor (web/mobile) que quiser a mesma superfície reabre a definição da porta compartilhada, como o ADR-016 previu.
- Alternativa rejeitada: filtrar por status e matéria em memória, dentro de `find.ts` — manteria o store intacto, mas duplicaria a semântica do `subjectKey` normalizado e varreria a tabela inteira antes de cortar.
- Alternativa rejeitada: uma consulta nova só para `find` — duas cópias das cláusulas de filtro, para divergirem na primeira mudança de regra.
