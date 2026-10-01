---
titulo: 'Origem de carregamento do renderer no desktop'
data: '2026-10-01'
status: 'aceito'
---

# Origem de carregamento do renderer no desktop

- Contexto: o [Scaffold do apps/desktop](scaffold-do-apps-desktop-com-electron.md) deixou a janela presa ao dev server do Vite (`STUDY_WEB_URL`): sem servidor no ar, o renderer não abre. O [Desktop com Electron reaproveitando o web](desktop-com-electron-reaproveitando-o-web.md) pede o web embalado, sem servidor local e sem backend. Faltava decidir de onde o renderer de produção é carregado — e essa origem decide o escopo do IndexedDB ([Persistência do web](persistencia-do-web-porta-assincrona-sobre-indexeddb.md), `MODELO-DE-DADOS.md`).
- Decisão: o renderer de produção é servido por um protocolo próprio privilegiado. O main registra o scheme `study` com `registerSchemesAsPrivileged` (`standard: true`, `secure: true`, `supportFetchAPI: true`) e atende por `protocol.handle`: `/` devolve o `index.html` e `/assets/*` resolve no diretório do bundle (`pnpm --filter @study/web build`, saída `apps/web/dist`), com guarda de travessia de caminho e 404 para alvo inexistente. A origem estável é `study://app`.
- Decisão: a precedência da fonte é `STUDY_WEB_URL` (dev server) > `STUDY_WEB_DIST` (bundle apontado) > default empacotado (`process.resourcesPath/web`); sem nenhum e fora de pacote, o default segue `http://localhost:4173`. O caminho de dev server não muda.
- Decisão: bundle ausente falha alto. Antes de criar a janela, o main valida o `index.html` do bundle; ausente, lança e cai no `reportFailure` (erro logado, `app.exit(1)`, sem janela em branco).
- Decisão: o perfil do Electron é dirigido por `STUDY_USER_DATA` (`app.setPath('userData', ...)`), o que deixa o smoke isolar dois lançamentos e provar que um item gravado sobrevive a fechar e reabrir.
- Decisão: o `apps/web` publica a porta do store em `globalThis.studyStore` (`openStore` e `browserIdb`), para o smoke do desktop exercitar a porta real sob a origem nova em vez de reimplementar o schema.
- Consequência: o IndexedDB passa a viver sob `study://app`. Dados gravados sob a origem antiga (`http://localhost:4173`) não aparecem na origem nova e não migram — fora do escopo deste ticket. A origem fica fixada para o ticket de instaladores.
- Consequência: o `base` default `/` do `vite build` funciona porque o handler resolve `/assets/*` a partir do diretório do bundle; nenhum asset é copiado ou reescrito.
- Consequência: `apps/desktop` segue sem bundle, sem `dist` e sem passo de build; `pnpm test` ganha o build do web dentro do projeto `desktop`, e o `apps/web/dist` continua fora do versionamento.
- Alternativa rejeitada: `file://` (`loadFile` sobre o bundle). Origem opaca, sem IndexedDB durável por origem e sensível ao caminho do arquivo.
- Alternativa rejeitada: servidor loopback dentro do app. Mantém um servidor local, que o Local-first com backend adiado dispensa, e a porta fica refém do SO.
- Alternativa rejeitada: `data:` ou `blob:` para o entry. Mesmo problema de origem opaca para o IndexedDB.
- Gatilho de revisão: o empacotador precisar de outro esquema de origem, ou o ticket de instaladores fixar uma origem diferente de `study://app`.
