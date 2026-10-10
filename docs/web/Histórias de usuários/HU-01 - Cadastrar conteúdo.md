# HU-01 — Cadastrar conteúdo

**Épico:** Gestão · **Prioridade:** Must · **Estimativa:** 3 SP

## História

Como usuário, quero cadastrar um novo conteúdo, para poder revisá-lo no futuro.

## Valor de negócio

Habilita todo o fluxo do produto: sem um conteúdo cadastrado não há o que revisar.

## Critérios de aceite

```gherkin
Cenário: Cadastrar conteúdo com dados válidos
  Dado que estou na tela de lista
  Quando aciono "Novo conteúdo"
  E preencho Nome, Categoria e Conteúdo
  E confirmo
  Então o cartão é salvo no IndexedDB
  E a lista exibe o novo cartão

Cenário: Cartão novo é agendado para daqui 7 dias
  Dado que confirmo um conteúdo válido
  Quando o cartão é salvo
  Então quantidadeRevisoes = 0
  E dataUltimaRevisao = nulo
  E dataProximaRevisao = dataCriacao + 7 dias

Cenário: Sugerir categorias existentes
  Dado que existem cartões com a categoria "Inglês"
  Quando abro o campo Categoria
  Então "Inglês" é sugerida

Cenário: Criar categoria nova inline
  Dado que nenhuma sugestão corresponde
  Quando digito uma categoria inédita e confirmo
  Então o cartão é salvo com essa categoria

Cenário: Campos obrigatórios vazios
  Dado que deixo Nome ou Conteúdo vazio
  Quando confirmo
  Então vejo um erro de validação
  E nenhum cartão é salvo

Cenário: Cancelar o cadastro
  Dado que abri o formulário
  Quando o fecho sem confirmar
  Então nenhum cartão é criado
```

## Regras de negócio
- `RB-01` (cálculo da próxima data), `RB-02` (categorias).

## Requisitos não funcionais
- `RNF-01`, `RNF-04`, `RNF-05`, `RNF-06`, `RNF-08`, `RNF-09`, `RNF-13`.

## Caso de uso relacionado
- [CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md)

## Definition of Done
- [ ] Formulário com Nome, Categoria & Conteúdo.
- [ ] Validação de Nome & Conteúdo.
- [ ] Sugestão de categorias existentes.
- [ ] Persistência no IndexedDB.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
