# ADRs

Índice das decisões de arquitetura do projeto. Um arquivo por decisão, nomeado pelo assunto e sem número; o contexto, a decisão e as consequências ficam em cada arquivo.

| ADR | Decisão | Status |
| --- | --- | --- |
| [`arquivo-morto-em-180-dias.md`](arquivo-morto-em-180-dias.md) | Arquivo morto em 180 dias | aceito |
| [`assinatura-dos-instaladores-do-desktop.md`](assinatura-dos-instaladores-do-desktop.md) | Assinatura dos instaladores do desktop | aceito |
| [`camada-de-persistencia-do-cli-schema-mapeamento-e-store.md`](camada-de-persistencia-do-cli-schema-mapeamento-e-store.md) | Camada de persistência do CLI: schema, mapeamento e store | aceito |
| [`ci-com-lint-typecheck-e-testes-nas-prs-para-main.md`](ci-com-lint-typecheck-e-testes-nas-prs-para-main.md) | CI com lint, typecheck e testes nas PRs para main | aceito |
| [`ciclo-de-vida-do-item-e-arquivo-morto.md`](ciclo-de-vida-do-item-e-arquivo-morto.md) | Ciclo de vida do item e arquivo morto: linha em items, gancho no contexto e export antes da migração | aceito |
| [`convencao-de-modulo-pasta-com-index-e-uma-funcao-por-arquivo.md`](convencao-de-modulo-pasta-com-index-e-uma-funcao-por-arquivo.md) | Convenção de módulo: pasta com index.ts e uma função por arquivo | aceito |
| [`core-ts-compartilhado-por-cli-web-mobile-e-desktop.md`](core-ts-compartilhado-por-cli-web-mobile-e-desktop.md) | Core TS compartilhado por CLI, web, mobile e desktop | aceito |
| [`cores-da-saida-humana-do-cli.md`](cores-da-saida-humana-do-cli.md) | Cores da saída humana do CLI: paleta truecolor com detecção de terminal | aceito |
| [`desktop-com-electron-reaproveitando-o-web.md`](desktop-com-electron-reaproveitando-o-web.md) | Desktop com Electron reaproveitando o web | aceito |
| [`distribuicao-npm-global-do-cli-e-artefato-js.md`](distribuicao-npm-global-do-cli-e-artefato-js.md) | Distribuição npm-global do CLI e artefato JS | superado-parcialmente |
| [`dueitems-com-filtro-fila-do-dia.md`](dueitems-com-filtro-fila-do-dia.md) | dueItems com filtro: a fila do dia reusa a porta de consulta | aceito |
| [`empacotador-do-desktop.md`](empacotador-do-desktop.md) | Empacotador do desktop | aceito |
| [`engine-de-dados-por-plataforma.md`](engine-de-dados-por-plataforma.md) | Engine de dados por plataforma | aceito |
| [`engine-sqlite-do-cli-node-sqlite.md`](engine-sqlite-do-cli-node-sqlite.md) | Engine SQLite do CLI | aceito |
| [`escrita-na-tui-com-campo-de-texto-em-raw-mode.md`](escrita-na-tui-com-campo-de-texto-em-raw-mode.md) | Escrita na TUI com campo de texto em raw mode | aceito |
| [`export-import-do-json-v1-no-web.md`](export-import-do-json-v1-no-web.md) | Export/import do JSON v1 no web: leitor próprio, abertura relaxada e prova cruzada | aceito |
| [`export-import-do-json-v1.md`](export-import-do-json-v1.md) | Export/import do JSON v1: isenções do contexto e merge por updated_at | aceito |
| [`fichas-da-tui-na-tecla-l.md`](fichas-da-tui-na-tecla-l.md) | Fichas da TUI na tecla l | aceito |
| [`filtro-por-materia-na-tui-adiado.md`](filtro-por-materia-na-tui-adiado.md) | Filtro por matéria na TUI adiado | aceito |
| [`finditems-com-filtro-porta-de-consulta-do-store.md`](finditems-com-filtro-porta-de-consulta-do-store.md) | findItems com filtro: a porta de consulta do store | aceito |
| [`gancho-do-streak-de-fila-zerada.md`](gancho-do-streak-de-fila-zerada.md) | Roll-forward do streak de fila zerada no gancho de contexto, com export/import/init isentos | aceito |
| [`golden-fixtures-formato-e-quem-valida.md`](golden-fixtures-formato-e-quem-valida.md) | Golden fixtures: formato do vetor e quem valida | aceito |
| [`init-destrutivo-com-backup-e-confirmacao-reforcada.md`](init-destrutivo-com-backup-e-confirmacao-reforcada.md) | Init destrutivo com backup e confirmação reforçada | aceito |
| [`instalacao-local-do-cli-symlink-do-shim-no-path.md`](instalacao-local-do-cli-symlink-do-shim-no-path.md) | Instalação local do CLI por symlink do shim do pnpm no PATH | superado |
| [`item-nao-ativo-e-legivel-e-editavel.md`](item-nao-ativo-e-legivel-e-editavel.md) | Item não ativo é legível e editável; só o check-in recusa | aceito |
| [`local-first-com-backend-adiado.md`](local-first-com-backend-adiado.md) | Local-first com backend adiado | aceito |
| [`mobile-com-react-native-expo.md`](mobile-com-react-native-expo.md) | Mobile com React Native (Expo) | aceito |
| [`mvc-no-cli.md`](mvc-no-cli.md) | MVC no CLI: camadas explícitas e o controller que devolve view-model | aceito |
| [`nome-publicado-do-cli-sob-o-escopo-bosi-programming.md`](nome-publicado-do-cli-sob-o-escopo-bosi-programming.md) | Nome publicado do CLI sob o escopo @bosi-programming | aceito |
| [`ordem-de-construcao-com-gates.md`](ordem-de-construcao-com-gates.md) | Ordem de construção com gates | aceito |
| [`origem-de-carregamento-do-renderer-no-desktop.md`](origem-de-carregamento-do-renderer-no-desktop.md) | Origem de carregamento do renderer no desktop | aceito |
| [`painel-de-stats-da-tui-na-tecla-s.md`](painel-de-stats-da-tui-na-tecla-s.md) | Painel de stats da TUI na tecla s | aceito |
| [`persistencia-do-web-porta-assincrona-sobre-indexeddb.md`](persistencia-do-web-porta-assincrona-sobre-indexeddb.md) | Persistência do web: porta assíncrona sobre IndexedDB | aceito |
| [`porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md`](porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md) | Porta de abertura do contexto e a sessão longa da TUI: limite de ação e contrato de estado | aceito |
| [`porta-de-terminal-injetada-e-zona-do-laco-da-tui.md`](porta-de-terminal-injetada-e-zona-do-laco-da-tui.md) | Porta de terminal injetada e a zona do laço da TUI | aceito |
| [`rastreabilidade-t-nn-do-cli-verificacao-manual-e-medicao-da-rnf-03.md`](rastreabilidade-t-nn-do-cli-verificacao-manual-e-medicao-da-rnf-03.md) | Rastreabilidade T-nn do CLI, verificação manual e medição da RNF-03 | aceito |
| [`rastreabilidade-u-nn-da-tui.md`](rastreabilidade-u-nn-da-tui.md) | Rastreabilidade U-nn da TUI por token literal | aceito |
| [`reavaliacao-apos-check-in-na-sessao-da-tui.md`](reavaliacao-apos-check-in-na-sessao-da-tui.md) | Reavaliação após o check-in na sessão da TUI | aceito |
| [`reavaliacao-de-dificuldade-a-cada-check-in.md`](reavaliacao-de-dificuldade-a-cada-check-in.md) | Reavaliação de dificuldade a cada check-in | aceito |
| [`referencia-de-item-por-uuid-prefixo-ou-titulo.md`](referencia-de-item-por-uuid-prefixo-ou-titulo.md) | Referência de item por UUID, prefixo ou título | aceito |
| [`regra-de-agendamento-sem-recall.md`](regra-de-agendamento-sem-recall.md) | Regra de agendamento sem recall | superado-parcialmente |
| [`roll-forward-do-streak-na-abertura-do-web.md`](roll-forward-do-streak-na-abertura-do-web.md) | Roll-forward do streak na abertura do web | aceito |
| [`scaffold-do-apps-desktop-com-electron.md`](scaffold-do-apps-desktop-com-electron.md) | Scaffold do apps/desktop: Electron sobre o renderer do web | aceito |
| [`scaffold-do-apps-web-react-vite-e-mvc-por-feature.md`](scaffold-do-apps-web-react-vite-e-mvc-por-feature.md) | Scaffold do apps/web: React + Vite, core pelo src e MVC por feature | aceito |
| [`scaffold-do-monorepo-pnpm-sem-build.md`](scaffold-do-monorepo-pnpm-sem-build.md) | Scaffold do monorepo pnpm sem build | superado-parcialmente |
| [`sentry-no-piloto.md`](sentry-no-piloto.md) | Sentry no piloto | aceito |
| [`shell-do-web-hash-proprio-e-injecao-de-store-e-deps.md`](shell-do-web-hash-proprio-e-injecao-de-store-e-deps.md) | Shell do web: hash próprio e injeção de store e deps | aceito |
| [`superficie-da-tui-zero-dep-raw-mode-tela-alternativa-e-saida.md`](superficie-da-tui-zero-dep-raw-mode-tela-alternativa-e-saida.md) | Superfície da TUI: zero-dep, raw mode, tela alternativa e saída | aceito |
| [`teclas-da-tui-como-adaptador-de-entrada-puro.md`](teclas-da-tui-como-adaptador-de-entrada-puro.md) | Teclas da TUI como adaptador de entrada puro: vocabulário próprio e pending entre reads | aceito |
| [`tui-sem-subcomando-em-terminal-interativo.md`](tui-sem-subcomando-em-terminal-interativo.md) | TUI sem subcomando em terminal interativo | aceito |
| [`vocabulario-de-error-code-e-envelope-sem-comando.md`](vocabulario-de-error-code-e-envelope-sem-comando.md) | Vocabulário fechado de error.code e envelope no study sem comando | aceito |
