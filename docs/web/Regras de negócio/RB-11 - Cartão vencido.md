# RB-11 — Cartão vencido

**Categoria:** UI

## Regra

- Um cartão está **vencido** quando `dataProximaRevisao < hoje` (ver RB-07).
- Cartões vencidos são exibidos com **destaque visual vermelho**, usando o token `--color-error` do `bosi-design-system` (`#741427`).
- O destaque não altera a ordenação (RB-03); cartões vencidos já tendem ao topo pela data.

## Contexto

Na lista (CDU-02), sinaliza o que já passou do prazo de revisão.

## Exemplos

- Próxima revisão = ontem → cartão exibido com destaque vermelho.
- Próxima revisão = hoje || futuro → sem destaque.

## Exceções / bordas

- Igualdade com hoje **não** é vencido (borda em RB-07).
- O destaque é apenas visual; não muda estado nem dados.

## CDUs & HUs relacionados

- CDUs: [CDU-02](../Casos%20de%20uso/CDU-02%20-%20Listar%20conteúdos.md)
- HUs: [HU-02](../Histórias%20de%20usuários/HU-02%20-%20Ver%20lista%20de%20conteúdos.md)

## Racional

Feedback visual imediato do que está atrasado.
