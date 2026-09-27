# study-app

App pessoal de repetição espaçada que diz o que revisar hoje. Local-first e multiplataforma: o CLI é a primeira superfície, seguido de web, mobile (React Native/Expo) e desktop (Electron), todos sobre o mesmo `packages/core` em TypeScript puro.

Ritmo do projeto: menos de 10h/semana. As decisões de produto e de arquitetura estão em `docs/`.

## Pré-requisitos

- Node >= 24 — o type stripping do Node roda o TypeScript direto, sem passo de build.
- pnpm 12.4.1 — o `packageManager` do `package.json`; o corepack troca a versão sozinho.

## Como rodar

```bash
pnpm install
pnpm test          # 4 projetos: core, golden, cli, scaffold
pnpm test:golden   # só o projeto golden: forma dos fixtures + vetores
pnpm test:coverage # linhas de packages/core/src (falha abaixo de 90%)
pnpm lint          # ESLint em todo o TS do repo (ADR-017)
pnpm typecheck     # tsc --noEmit nos 3 pacotes + tsconfig da raiz
pnpm bench         # stub: declara o bloqueio da RNF-03, ainda não mede
pnpm sqlite:probe  # prova o schema canônico no engine do CLI (ADR-014)
```

## Instalar o comando `study`

O `pnpm install` deixa o CLI em `node_modules/.bin/study`, mas só dentro do repo. Para rodar `study` de qualquer diretório, linke esse shim num diretório que já esteja no `PATH` — o exemplo usa `~/.local/bin`, troque pelo seu:

```bash
mkdir -p ~/.local/bin
ln -sf "$PWD/node_modules/.bin/study" ~/.local/bin/study
```

Rode os dois comandos a partir da raiz do repo. Abra um shell novo para ele recarregar o `PATH` e confirme com `study --help`.

O alvo é o shim do pnpm, não `apps/cli/src/main.ts`: o `pnpm install` recria o shim no mesmo caminho, então o link continua válido. O link guarda um caminho absoluto da máquina, então mover ou renomear o repo quebra o comando — re-rodar o passo de instalação conserta.

Para desinstalar, remova o link:

```bash
rm ~/.local/bin/study
```

## Layout do workspace

| Membro | Pacote | O que é |
| --- | --- | --- |
| `packages/core` | `@study/core` | Domínio e regra de agendamento, em TS puro, sem API de Node ou browser. |
| `apps/cli` | `@study/cli` | Superfície da fase 1; declara o bin `study`. |
| `fixtures/golden` | `@study/golden` | Golden fixtures importáveis, vetores de regressão de todos os apps. |

Não existe `dist/`: `core` e `golden` exportam `./src/index.ts` e o Node 24 consome o TypeScript direto.

## Documentos

O mapa completo, com status e ordem de leitura, está em `docs/README.md`. Por tema:

- `docs/produto/` — por que construir e o que é o produto.
- `docs/especificacao/` — os contratos: requisitos, modelo de dados e CLI.
- `docs/engenharia/` — como provar que funciona e em que ordem construir.
- `docs/adr/` — as decisões de arquitetura, uma por arquivo.
