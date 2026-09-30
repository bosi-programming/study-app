# Mobile — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-28 | Base: `docs/engenharia/ROADMAP.md`

## Convenções

- React Native com Expo para iOS e Android, TypeScript estrito, consumindo `@study/core` direto do `src` (Core TS compartilhado, Mobile com React Native (Expo)).
- Persistência em `expo-sqlite`, no schema canônico do `MODELO-DE-DADOS.md` (Engine de dados por plataforma); o mesmo schema do CLI.
- Uma base de UI para as duas lojas; nenhuma regra reimplementada.
- Offline-first (RNF-01), pt-BR centralizado (RNF-06) e sem conta nem login (RNF-02).
- Build iOS por EAS, sem Xcode local (Mobile com React Native (Expo)).
- A regra de agendamento é a mesma do CLI e do web: os fluxos espelham o `WEB.md` e mudam só a casca nativa.

## Spike de uma semana

- Expo + `expo-sqlite` + tela de fila rodando no emulador e num device real.
- O spike prova o caminho de build e a persistência; não entrega tela de produto.
- Falha do spike além de 2 semanas é o risco declarado da Fase 4 no `ROADMAP.md`.

## Telas e fluxos

Mesmos fluxos do web, com a casca do React Native (o detalhe de cada um fica no `WEB.md`):

- Adicionar item com título, matéria e dificuldade de 1 a 5 (`RF-01`).
- Fila do dia com atrasados primeiro e resumo por matéria (`RF-05`, `RF-06`, `RF-07`).
- Check-in com reavaliação de dificuldade (`RF-08`, `RF-12`).
- Arquivar e desarquivar (`RF-14`, `RF-15`), com o arquivo morto em lista própria (`RF-16`, `RF-17`).
- Stats: streak, contagens e check-ins do dia (`RF-21`..`RF-23`).
- Export/import na tela de dados (`RF-18`..`RF-20`).
- Toda tela cobre vazio, carregando, offline e erro (`WEB.md` — Estados).

## Persistência

- `expo-sqlite` com o schema canônico: tabelas `items`, `review_logs`, `meta` e `cold_archive`, com os índices do `MODELO-DE-DADOS.md`.
- Mesma forma de porta do store do CLI (Camada de persistência do CLI): criar, ler, listar, filtrar, arquivar, migrar e exportar.
- `late` é 0/1 no banco e boolean na leitura; `title_key` e `subject_key` saem da mesma normalização.

## Notificações locais

- Lembrete local de revisão com `expo-notifications`, agendado pelo vencimento do item.
- Notificação é opcional e pedida só depois do primeiro item criado; negar não afeta o app.
- Não há push remoto nem servidor: o lembrete é agendado no próprio device (RNF-01).

## Lojas e distribuição

- EAS Build para iOS e Android, TestFlight para iOS e faixa interna do Google Play para Android.
- Conta Apple (US$ 99/ano) e Google Play (US$ 25 único) são pré-requisitos da fase (Ordem de construção com gates).
- Publicação nas lojas abertas só depois do spike aprovado e da faixa interna estável.

## Critérios de aceite

- O app roda em iOS e Android a partir da mesma base Expo.
- A regra vem de `@study/core` e a persistência é `expo-sqlite` no schema canônico.
- Os cinco fluxos do web existem no mobile com os mesmos IDs de requisito.
- O lembrete local dispara no vencimento, sem rede.
- EAS Build gera build instalável para TestFlight e faixa interna.
