# HU-06 — Editar conteúdo

**Épico:** Gestão · **Prioridade:** Should · **Estimativa:** 2 SP

## História

Como usuário, quero editar um conteúdo, para corrigir ou atualizar nome, categoria e o próprio conteúdo.

## Valor de negócio

Mantém os dados corretos ao longo do tempo sem precisar excluir & recadastrar.

## Critérios de aceite

```gherkin
Cenário: Editar com dados válidos
  Dado um cartão na lista
  Quando aciono o ícone "editar"
  Então o formulário abre preenchido com os valores atuais
  Quando altero os campos e confirmo
  Então as alterações são persistidas no IndexedDB
  E a lista é atualizada

Cenário: Sugerir categorias existentes
  Dado que edito o campo Categoria
  Então vejo as categorias já existentes como sugestão
  E posso digitar uma categoria nova

Cenário: Campos obrigatórios vazios
  Dado que deixo Nome ou Conteúdo vazio
  Quando confirmo
  Então vejo um erro de validação

Cenário: Cancelar a edição
  Dado o formulário aberto
  Quando o fecho sem confirmar
  Então nenhuma alteração é persistida

Cenário: Categoria atualizada reflete no filtro
  Dado que mudei a categoria de um cartão
  Então o filtro de categoria lista as categorias atuais
```

## Regras de negócio
- `RB-02` (categorias).

## Requisitos não funcionais
- `RNF-01`, `RNF-04`, `RNF-07`.

## Caso de uso relacionado
- [CDU-05](../Casos%20de%20uso/CDU-05%20-%20Editar%20conteúdo.md)

## Definition of Done
- [ ] Formulário pré-preenchido.
- [ ] Validação & persistência.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
