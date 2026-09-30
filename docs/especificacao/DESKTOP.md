# Desktop — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-28 | Base: `docs/engenharia/ROADMAP.md`

## Convenções

- `apps/desktop` encapsula o renderer de `apps/web` em Electron, com a mesma persistência IndexedDB (Desktop com Electron reaproveitando o web, Engine de dados por plataforma).
- Herda as telas do web: este documento não define tela nova. Telas, estados e contrato com o core ficam no `WEB.md`.
- Mesmo `@study/core` do CLI e do web, sem UI duplicada e sem regra reimplementada (Core TS compartilhado).
- Electron é Node/TS puro; não reintroduz uma segunda stack (Desktop com Electron reaproveitando o web).
- Offline-first (RNF-01) e pt-BR centralizado no módulo de strings do web (RNF-06).

## Empacotamento

- Instaladores assinados: dmg (macOS), nsis (Windows) e AppImage (Linux).
- O pacote carrega o bundle do renderer do web; a persistência continua no IndexedDB do renderer.
- Sem servidor local e sem backend: o app é o web embalado (Local-first com backend adiado, Desktop com Electron reaproveitando o web).
- A versão do instalador acompanha a versão do app web empacotado.

## Smoke

- Abre sem o navegador e mostra a fila do dia.
- Passa nos fluxos principais do web: adicionar, fila, check-in, arquivar e export/import.
- O smoke roda sobre o app empacotado, não sobre o dev server.

## Critérios de aceite

- O app instalado abre e usa as mesmas telas do web (herdadas), sem UI própria.
- O IndexedDB do desktop é o mesmo contrato do web e do `MODELO-DE-DADOS.md`.
- dmg, nsis e AppImage são gerados e assinados.
- O smoke de abertura e dos fluxos principais passa sobre o pacote.
