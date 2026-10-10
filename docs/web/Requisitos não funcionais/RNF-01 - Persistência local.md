# RNF-01 — Persistência local

**Categoria (ISO 25010):** Segurança / Privacidade

## Requisito

- Todos os dados são persistidos **localmente** no browser via **IndexedDB**.
- Nenhum dado sai do dispositivo.

## Métrica / critério de verificação

- 100% das operações de leitura/escrita usam IndexedDB.
- Zero requisições contendo dados do usuário.

## Como verificar

- Inspeção de rede sem chamadas de dados.
- Testes de persistência com `fake-indexeddb`.

## Relacionados

- CDUs: todos ([CDU-01](../Casos%20de%20uso/CDU-01%20-%20Cadastrar%20conteúdo.md) a [CDU-08](../Casos%20de%20uso/CDU-08%20-%20Filtrar%20por%20categoria.md))
- HUs: [HU-10](../Histórias%20de%20usuários/HU-10%20-%20Dados%20salvos%20no%20navegador.md)
- RNFs: RNF-14 (sem rede), RNF-13 (escrita atômica)
