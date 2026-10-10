# HU-10 — Dados salvos no navegador

**Épico:** Persistência · **Prioridade:** Must · **Estimativa:** 5 SP

## História

Como usuário, quero que meus dados fiquem salvos no navegador, para não perdê-los ao fechar ou recarregar a página.

## Valor de negócio

Sem persistência local o produto não se sustenta: os conteúdos & o progresso de revisão precisam sobreviver a recarregamentos, sem backend.

## Critérios de aceite

```gherkin
Cenário: Persistir ao cadastrar
  Dado que cadastro um conteúdo
  Então ele é gravado no IndexedDB

Cenário: Persistir ao revisar, editar e excluir
  Dado que reviso, edito ou excluo um cartão
  Então a mudança é refletida no IndexedDB

Cenário: Recarregar a página
  Dado que tenho cartões salvos
  Quando recarrego a página
  Então os cartões continuam disponíveis com o mesmo estado

Cenário: Funcionar offline
  Dado que já carreguei o app uma vez
  Quando fico offline
  Então consigo cadastrar, revisar, editar, excluir e filtrar

Cenário: Nada sai do dispositivo
  Dado qualquer uso do app
  Então nenhum dado é enviado para fora do dispositivo
```

## Regras de negócio
- Nenhuma regra de agendamento envolvida.

## Requisitos não funcionais
- `RNF-01` (IndexedDB, sem rede), `RNF-02` (offline).

## Caso de uso relacionado
- Transversal a todos os CDUs ([CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md) a [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md)).

## Definition of Done
- [ ] Camada de persistência (IndexedDB) única & testada.
- [ ] Operações de CRUD & recálculo persistidos.
- [ ] Nenhuma chamada de rede.
- [ ] Testes (TDD) cobrindo os cenários acima.
- [ ] Lint & typecheck verdes.
