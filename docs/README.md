# Documentos de Engenharia

Projeto: app de estudo com repetição espaçada. Ritmo: menos de 10h/semana.

| Documento | Conteúdo | Status |
| --- | --- | --- |
| `FEASIBILITY.md` | Estudo de viabilidade e decisões-raiz | Aprovado |
| `docs/PRD.md` | Produto, público, escopo, métricas | Rascunho v3 |
| `docs/REQUISITOS.md` | Requisitos funcionais, regras e critérios de aceite | Rascunho v2 |
| `docs/MODELO-DE-DADOS.md` | Entidades, schema e contrato JSON | Rascunho v1 |
| `docs/CLI.md` | Comandos, flags, saídas e códigos de erro | Rascunho v2 |
| `docs/CORE.md` | API do domínio: portas, item, regra de agendamento, erros | Rascunho v1 |
| `docs/PLANO-DE-TESTES.md` | Estratégia, golden fixtures e cobertura | Rascunho v3 |
| `docs/ROADMAP.md` | Fases, tarefas, gates e calendário | Rascunho v2 |
| `docs/DECISOES.md` | ADRs numerados com contexto e consequências | Rascunho, até ADR-014 |

## Ordem de leitura

1. `FEASIBILITY.md` — por que construir e com quais restrições.
2. `docs/PRD.md` — o que é o produto e para quem.
3. `docs/REQUISITOS.md` — o que o sistema faz, com critérios de aceite.
4. `docs/MODELO-DE-DADOS.md` — como os dados existem.
5. `docs/CLI.md` — a interface da fase 1.
6. `docs/CORE.md` — como o domínio e a regra de agendamento funcionam por dentro.
7. `docs/PLANO-DE-TESTES.md` — como provar que funciona.
8. `docs/ROADMAP.md` — em que ordem construir.
9. `docs/DECISOES.md` — por que as escolhas técnicas foram feitas.

## Como rodar

Pré-requisitos: Node >= 24 e pnpm 12.4.1 (o `packageManager` do `package.json`; o corepack troca a versão sozinho).

```bash
pnpm install
pnpm test          # 4 projetos: core, golden, cli, scaffold
pnpm test:golden   # só o projeto golden
pnpm typecheck     # tsc --noEmit nos 3 pacotes + tsconfig da raiz
pnpm bench         # stub: declara o bloqueio da RNF-03 (ENG-5 + ENG-6), ainda não mede
pnpm sqlite:probe  # prova o schema canônico no engine do CLI (ADR-014)
```

Membros do workspace: `packages/core` (`@study/core`), `apps/cli` (`@study/cli`) e `fixtures/golden` (`@study/golden`).

## Deferido

- UX de mobile (React Native, iOS + Android) e desktop: telas, notificações, ícones, publicação nas lojas.
- Monetização, nome do app, branding, i18n.
- Backend/Postgres: só no gatilho definido no PRD.
