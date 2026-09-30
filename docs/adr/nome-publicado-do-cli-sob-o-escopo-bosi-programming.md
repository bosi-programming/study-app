---
titulo: 'Nome publicado do CLI sob o escopo @bosi-programming'
data: '2026-09-29'
status: 'aceito'
---

# Nome publicado do CLI sob o escopo `@bosi-programming`

- Contexto: o [Distribuição npm-global do CLI e artefato JS](distribuicao-npm-global-do-cli-e-artefato-js.md) escolheu publicar o CLI como `study-cli`, sem escopo. O primeiro `npm publish` foi recusado com `E403 ... Package name too similar to existing package studycli`, e o próprio registry sugeriu `@bosi-programming/study-cli`. O `studycli@0.2.0` já existe e a proteção anti-typosquatting do npm bloqueia nome parecido com um pacote existente; o `study-cli` segue livre no registry, mas inalcançável para esta conta.
- Restrição: o npm só aceita um nome parecido com um existente debaixo de um escopo próprio. A conta é `bosi-programming` (`npm whoami`), então o escopo homônimo existe sem criar organização, e `@bosi-programming/study-cli` responde 404 (livre). Pacote escopado nasce `restricted` por default, então o acesso público precisa ser declarado.
- Decisão: publicar como `@bosi-programming/study-cli` e instalar global com `npm install -g @bosi-programming/study-cli`. O manifesto declara `publishConfig.access: "public"`, então o `--access=public` deixa de ser obrigatório na linha de comando. O membro `apps/cli` renomeia de `study-cli` para `@bosi-programming/study-cli` e a devDependency da raiz acompanha, mantendo o `workspace:*` e o shim do dev loop.
- Consequência: o comando instalado continua `study` — só o `bin` importa para quem usa, e ele não muda. Mudam o nome no registry, o nome do tarball (`bosi-programming-study-cli-0.1.0.tgz`) e o comando de instalação documentado no `README.md`.
- Revisa parcialmente o [Distribuição npm-global do CLI e artefato JS](distribuicao-npm-global-do-cli-e-artefato-js.md): o artefato JS, o bundle do `prepare`, o `bin.study`, o `files: ["dist"]` e o `allowBuilds` do esbuild seguem valendo; muda só o nome publicado, de sem escopo para escopado.
- Alternativas rejeitadas: manter `study-cli` — o registry recusa e não há como liberar; pedir despublicação do `studycli` — não é nosso e o npm não libera nome por semelhança; trocar por outro nome sem escopo — o escopo é a saída que o próprio registry indica e casa com a conta; publicar sem `publishConfig` — o pacote escopado nasceria restrito e o `npm install -g` falharia para terceiros.
