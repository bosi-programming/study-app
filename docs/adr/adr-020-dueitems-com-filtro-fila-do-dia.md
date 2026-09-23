---
numero: 20
titulo: 'dueItems com filtro: a fila do dia reusa a porta de consulta'
data: '2026-09-23'
status: 'aceito'
---

# ADR-020 — `dueItems` com filtro: a fila do dia reusa a porta de consulta

- Contexto: o [ADR-016](adr-016-camada-de-persistencia-do-cli-schema-mapeamento-e-store.md) fixou as primitivas do store e registrou o gatilho de revisão — a consulta que não coubesse nelas. O [ADR-018](adr-018-finditems-com-filtro-porta-de-consulta-do-store.md) criou o `ItemFilter` (`status`, `subjectKey`) e o `filterClauses` compartilhado para o `findItems`, e deixou escrito que o segundo consumidor reabriria a definição da porta. A ENG-7 tem esse segundo consumidor: o `study due -s <matéria>` da tabela de flags do `docs/especificacao/CLI.md` precisa de `status = 'active' AND due_date <= hoje AND subject_key = ?`, e o `dueItems(today)` sozinho não fecha. Filtrar a matéria em memória dentro de `due.ts` repetiria a alternativa que o ADR-018 já rejeitou: duplicar a semântica do `subjectKey` normalizado e varrer a tabela inteira antes de cortar.
- Decisão: `dueItems(today, filter?: ItemFilter)` recebe o mesmo `ItemFilter` do ADR-018. O filtro efetivo é `{ status: 'active', ...filter }` — o padrão preserva a base de hoje (`status = 'active' AND due_date <= ?`) e uma chave explícita do chamador vence o padrão, sem cláusula duplicada — e as cláusulas saem do mesmo `filterClauses` privado que `listItems` e `findItems` usam. O `ORDER BY due_date, id` continua a invariante de exibição: "atrasados primeiro" e o desempate do `id` vêm dele, não do comando.
- Consequência: `due` não escreve SQL nem reordena. A fila é uma consulta do store, e o CLI só parte o resultado em atrasado/hoje com `isLate(item, today)` e monta a saída.
- Consequência: `list`, `find` e `due` são o mesmo construtor de cláusulas com bases diferentes, então uma regra de filtro nova vale para os três de uma vez. O `ItemFilter` segue sendo a porta de consulta da persistência desta fase; o próximo consumidor (web, mobile ou desktop) que quiser a mesma superfície reabre a definição compartilhada, como o ADR-016 previu.
- Alternativa rejeitada: filtrar a matéria em memória em `due.ts` — deixaria o store intacto, mas duplicaria o `subjectKey` normalizado e varreria a tabela inteira.
- Alternativa rejeitada: um tipo próprio (`{ subjectKey? }`) só para a fila — dois tipos de filtro para a mesma porta, para divergirem na primeira regra nova.
- Alternativa rejeitada: manter `dueItems(today)` e acrescentar um `dueItemsBySubject(today, subjectKey)` — duas consultas com a mesma cláusula de vencimento, contra o compartilhamento que o ADR-018 começou.
