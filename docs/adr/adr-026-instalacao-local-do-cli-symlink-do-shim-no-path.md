---
numero: 26
titulo: 'Instalação local do CLI por symlink do shim do pnpm no PATH'
data: '2026-09-27'
status: 'aceito'
---

# ADR-026 — Instalação local do CLI por symlink do shim do pnpm no PATH

- Contexto: o [ADR-013](adr-013-scaffold-do-monorepo-pnpm-sem-build.md) prova o bin do CLI ponta a ponta e o `pnpm install` cria `node_modules/.bin/study`, mas o shim só é resolvido de dentro do repo; o item "instalar" do Definition of done da fase 1 ficou registrado como `pnpm install`, que instala o workspace e não deixa o comando disponível. Publicar está fora: o pacote é `private: true`, o [AGENTS.md](../../AGENTS.md) diz que nenhum pacote é publicado e o ADR-013 não tem `dist/`, então o mecanismo não pode depender de registry.
- Decisão: a instalação é local e sem build — linkar o shim que o pnpm já cria (`node_modules/.bin/study`) para um diretório que já esteja no `PATH` (ex.: `~/.local/bin`), rodando da raiz do repo: `ln -sf "$PWD/node_modules/.bin/study" ~/.local/bin/study`. O `-f` torna a reinstalação idempotente; desinstalar é `rm ~/.local/bin/study`, igualmente idempotente.
- O alvo é o shim, não `apps/cli/src/main.ts`: o shim resolve o próprio diretório por `readlink` e executa `node <repo>/node_modules/@study/cli/src/main.ts`, então o link no `PATH` sobrevive ao `pnpm install` regerar o shim no mesmo caminho.
- Consequência: o shell corrente mantém cache de `PATH`, então o `README.md` manda abrir um shell novo antes de conferir com `study --help`. O link guarda um caminho absoluto da máquina: mover ou renomear o repo quebra o comando e o conserto é re-rodar o passo de instalação. Sem `dist/`, sem `.d.ts` e sem registry; nada muda em comandos, flags, prompts ou no caminho padrão do banco.
- Alternativas rejeitadas: `pnpm link --global` (exige o bin global do pnpm no `PATH`, um pré-requisito a mais), exportar `node_modules/.bin` no perfil do shell (não instala um comando e morre junto com o perfil) e publicar no npm/brew/npx (o pacote é privado e não há `dist/`).
