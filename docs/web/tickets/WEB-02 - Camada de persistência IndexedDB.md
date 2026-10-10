# WEB-02 — Camada de persistência IndexedDB

**Tipo:** infra · **Épico:** Fundação · **Depende de:** CORE-01

## Resumo

Camada única de persistência local dos cartões em IndexedDB, consumida por todas as telas.

## O que muda na tela

Nenhuma mudança visual — infraestrutura.

## Critérios de aceitação

- [ ] Store `cartoes` com chave `id`.
- [ ] Operações: listar, obter, criar, atualizar & remover.
- [ ] Escrita atômica: falha parcial não corrompe os dados (RNF-13).
- [ ] Nenhuma chamada de rede; dados só no dispositivo (RNF-01) & funciona offline (RNF-02).
- [ ] Testes com `fake-indexeddb` cobrindo CRUD & falha de transação.

## Referências

- CDUs: CDU-01 a CDU-08 · HUs: HU-10 · RN: — · RNFs: RNF-01, RNF-02, RNF-11, RNF-13
