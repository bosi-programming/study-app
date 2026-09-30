# Documentos de Engenharia

Projeto: app de estudo com repetição espaçada. Ritmo: menos de 10h/semana.

Comandos, pré-requisitos e layout do workspace ficam no `README.md` da raiz.

## Índice

| Documento | Conteúdo | Status |
| --- | --- | --- |
| `docs/produto/FEASIBILITY.md` | Estudo de viabilidade e decisões-raiz | Aprovado |
| `docs/produto/PRD.md` | Produto, público, escopo, métricas | Rascunho v3 |
| `docs/especificacao/REQUISITOS.md` | Requisitos funcionais, regras e critérios de aceite | Rascunho v3 |
| `docs/especificacao/MODELO-DE-DADOS.md` | Entidades, schema e contrato JSON | Rascunho v1 |
| `docs/especificacao/CLI.md` | Comandos, flags, saídas e códigos de erro | Rascunho v6 |
| `docs/especificacao/TUI.md` | Superfície interativa: telas, teclas, sessão e estados | Rascunho v1 |
| `docs/especificacao/TUI-FRAMES.md` | Frames de referência das telas da TUI | Rascunho v1 |
| `docs/especificacao/CORE.md` | API do domínio: portas, item, regra de agendamento, erros | Rascunho v1 |
| `docs/especificacao/WEB.md` | Telas, estados e contrato com o core do app web | Rascunho v1 |
| `docs/especificacao/PILOTO.md` | Aviso LGPD, eventos do Sentry e roteiro de entrevista do piloto | Rascunho v1 |
| `docs/especificacao/MOBILE.md` | Expo, `expo-sqlite`, telas e lojas do app mobile | Rascunho v1 |
| `docs/especificacao/DESKTOP.md` | Electron sobre o renderer do web, empacotamento e smoke | Rascunho v1 |
| `docs/engenharia/INVENTARIO-DE-REQUISITOS.md` | Onde faltam requisitos, por fase, e onde cada documento mora | Rascunho v1 |
| `docs/engenharia/PLANO-DE-TESTES.md` | Estratégia, golden fixtures e cobertura | Rascunho v4 |
| `docs/engenharia/ROADMAP.md` | Fases, tarefas, gates e calendário | Rascunho v3 |
| `docs/engenharia/VERIFICACAO-FASE-1.md` | Registro datado do DoD e das verificações manuais da fase 1 | Rascunho v1 |
| `docs/adr/README.md` | ADRs numerados com contexto e consequências | 32 ADRs |

## Ordem de leitura

1. `docs/produto/FEASIBILITY.md` — por que construir e com quais restrições.
2. `docs/produto/PRD.md` — o que é o produto e para quem.
3. `docs/especificacao/REQUISITOS.md` — o que o sistema faz, com critérios de aceite.
4. `docs/especificacao/MODELO-DE-DADOS.md` — como os dados existem.
5. `docs/especificacao/CLI.md` — a interface da fase 1.
6. `docs/especificacao/TUI.md` — a superfície interativa sobre o mesmo CLI.
7. `docs/especificacao/TUI-FRAMES.md` — como as telas da TUI ficam desenhadas.
8. `docs/especificacao/CORE.md` — como o domínio e a regra de agendamento funcionam por dentro.
9. `docs/engenharia/INVENTARIO-DE-REQUISITOS.md` — onde faltam requisitos, por fase, e onde cada documento mora.
10. `docs/especificacao/WEB.md` — a interface da fase 2.
11. `docs/especificacao/PILOTO.md` — LGPD, eventos e entrevista da fase 3.
12. `docs/especificacao/MOBILE.md` — o app Expo da fase 4.
13. `docs/especificacao/DESKTOP.md` — o app Electron da fase 5.
14. `docs/engenharia/PLANO-DE-TESTES.md` — como provar que funciona.
15. `docs/engenharia/ROADMAP.md` — em que ordem construir.
16. `docs/adr/README.md` — por que as escolhas técnicas foram feitas.
