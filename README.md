# study-app

App pessoal de repetição espaçada que diz o que revisar hoje. Local-first e multiplataforma: o CLI é a primeira superfície, seguido de web, mobile (React Native/Expo) e desktop (Electron), todos sobre o mesmo `packages/core` em TypeScript puro.

Ritmo do projeto: menos de 10h/semana. As decisões de produto e de arquitetura estão em `docs/`.

## Pré-requisitos

- Node >= 24 — o type stripping do Node roda o TypeScript direto, sem passo de build.
- pnpm 12.4.1 — o `packageManager` do `package.json`; o corepack troca a versão sozinho.

## Como rodar

```bash
pnpm install
pnpm test          # 6 projetos: core, golden, cli, web, desktop, scaffold
pnpm test:golden   # só o projeto golden: forma dos fixtures + vetores
pnpm test:coverage # linhas de packages/core/src (falha abaixo de 90%)
pnpm lint          # ESLint em todo o TS do repo (CI com lint, typecheck e testes nas PRs)
pnpm typecheck     # tsc --noEmit nos 5 pacotes + tsconfig da raiz
pnpm bench         # stub: declara o bloqueio da RNF-03, ainda não mede
pnpm bench:web     # mede a fila de 5.000 itens do web sobre o IndexedDB (RNF-03; W-11)
pnpm sqlite:probe  # prova o schema canônico no engine do CLI (Engine SQLite do CLI)
```

### Rodar o app desktop

O desktop não tem bundle nem `dist`: ele abre o renderer do `apps/web` pelo dev server do Vite, na porta fixa 4173. Com o dev server no ar, o Electron abre a janela sobre ele:

```bash
pnpm --filter @study/web dev        # renderer do web, em http://localhost:4173
pnpm --filter @study/desktop dev    # janela do Electron sobre esse renderer
```

`STUDY_WEB_URL` troca o endereço que a janela carrega, quando o renderer não está na porta padrão. O smoke do projeto `desktop` sobe o dev server sozinho dentro do `pnpm test`; instaladores assinados e bundle de produção ficam para o ticket de empacotamento da fase 5.

## Instalar o comando `study`

O CLI é publicado como `@bosi-programming/study-cli` e instala global pelo npm:

```bash
npm install -g @bosi-programming/study-cli
```

Depois disso `study --help` roda de qualquer diretório. Para desinstalar:

```bash
npm uninstall -g @bosi-programming/study-cli
```

O `pnpm install` continua criando `node_modules/.bin/study` para rodar o CLI de dentro do repo; isso é o dev loop, não a instalação global.

## Layout do workspace

| Membro | Pacote | O que é |
| --- | --- | --- |
| `packages/core` | `@study/core` | Domínio e regra de agendamento, em TS puro, sem API de Node ou browser. |
| `apps/cli` | `@bosi-programming/study-cli` | Superfície da fase 1; declara o bin `study`. |
| `apps/web` | `@study/web` | App React + Vite da fase 2; consome o `@study/core` pelo `src`. |
| `apps/desktop` | `@study/desktop` | Casca Electron da fase 5; abre o renderer do `apps/web` no desktop, sem UI própria. |
| `fixtures/golden` | `@study/golden` | Golden fixtures importáveis, vetores de regressão de todos os apps. |

Não existe `dist/` para `core` e `golden`: eles exportam `./src/index.ts` e o Node 24 consome o TypeScript direto. O `apps/web` consome o core pelo symlink do workspace, sem alias e sem pré-build. O `apps/desktop` carrega o renderer do `apps/web` a partir do dev server do Vite (`STUDY_WEB_URL`, porta 4173), sem bundle de produção. O `@bosi-programming/study-cli` gera um bundle em `apps/cli/dist/` no `prepare`, para o artefato publicado.

## Documentos

O mapa completo, com status e ordem de leitura, está em `docs/README.md`. Por tema:

- `docs/produto/` — por que construir e o que é o produto.
- `docs/especificacao/` — os contratos: requisitos, modelo de dados e CLI.
- `docs/engenharia/` — como provar que funciona e em que ordem construir.
- `docs/adr/` — as decisões de arquitetura, uma por arquivo.
