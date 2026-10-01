---
titulo: 'Empacotador do desktop'
data: '2026-10-01'
status: 'aceito'
---

# Empacotador do desktop

- Contexto: o [Desktop com Electron reaproveitando o web](desktop-com-electron-reaproveitando-o-web.md) deixou o `apps/desktop` como casca do renderer do web, mas não decidiu como ele vira instalador. O [Scaffold do apps/desktop](scaffold-do-apps-desktop-com-electron.md) mantém o manifesto sem passo de build, e o `DESKTOP.md` pede dmg, nsis e AppImage assinados. Faltava escolher quem gera os três artefatos e onde essa configuração mora.
- Decisão: o empacotador é o `electron-builder`, com uma configuração única em `apps/desktop/electron-builder.yml` — fora do `package.json`, que o `S-44` veda a chave `build`. A config declara exatamente três targets: `dmg` no macOS, `nsis` no Windows e `AppImage` no Linux, um por runner nativo no workflow de release.
- Decisão: o pacote leva o renderer do web por `extraResources`, de `../web/dist` para `web`, que é o `process.resourcesPath/web` que o `main.ts` já procura; `files` limita o asar a `src/**` e `package.json`, então o bundle não arrasta script, teste nem material de assinatura.
- Decisão: o `main` continua em TypeScript, sem passo de build do main; o Electron 44 roda o `src/main.ts` direto, como o smoke do desktop já prova em CI, e o pacote usa o mesmo carregador. A contingência (compilar o main num `dist/` próprio) fica registrada como risco, não como plano.
- Decisão: a versão do instalador sai de `apps/web/package.json` e é injetada no empacotamento por `--config.extraMetadata.version`, então instalador e app web empacotado nunca divergem; um teste-guarda recusa `0.0.0` e versão fora de semver.
- Decisão: o NSIS é assistido e por usuário (`oneClick: false`, `perMachine: false`, `allowToChangeInstallationDirectory: true`), o formato de app pessoal fora de loja, sem UAC.
- Consequência: a saída do pacote é `apps/desktop/dist`, já coberta pelo `dist/` do `.gitignore`; nenhum artefato é versionado.
- Consequência: o `pnpm test` segue sem empacotar, sem segredo e sem rede; o que exige artefato roda no workflow de release, com smoke sobre o pacote.
- Alternativa rejeitada: `electron-forge`. Cobre os três alvos, mas espalha a configuração por makers e plugins e traz um ciclo de vida próprio de publish que o ticket deixa fora de escopo.
- Alternativa rejeitada: `electron-packager` com scripts próprios de dmg, nsis e AppImage. Empacota, mas não assina nem notariza, e obrigaria a manter três pipelines à mão.
- Alternativa rejeitada: publicar direto num canal de atualização. Auto-update e canal beta estão fora do escopo do ticket.
- Gatilho de revisão: um alvo novo (msi, deb, rpm, zip), a saída do Electron 44 deixar de rodar o main em TypeScript, ou a publicação em lojas entrar em escopo.
