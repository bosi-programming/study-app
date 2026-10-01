# Verificação da Fase 5 — Desktop

Versão: 1 | Data: 2026-10-01 | Base: `docs/engenharia/ROADMAP.md` (Fase 5) e `docs/engenharia/PLANO-DE-TESTES.md`

Registro datado do que a entrega de instaladores da fase 5 fecha: o empacotamento
assinado do desktop (BOS-60, ENG-35), o item do Definition of done da fase que
ainda estava aberto. Isto é evidência de execução, não gate de CI: o que exige
artefato, segredo ou runner de outro SO roda no workflow de release, não no
`pnpm test`.

PR: [#40 — feat(desktop): package the desktop into signed installers (ENG-35)](https://github.com/bosi-programming/study-app/pull/40), aberto em draft.

## Definition of done

| Item | Comando | Evidência | Data | Resultado |
| --- | --- | --- | --- | --- |
| Instaladores assinados: dmg, nsis e AppImage | `pnpm --filter @study/desktop package` | `apps/desktop/electron-builder.yml` com os três targets; `.github/workflows/release.yml` em matrix nativa, `upload-artifact` por perna e release draft só na tag; casos `S-56` e `S-59` | 2026-10-01 | PASS local no macOS — `Study-0.1.0-mac-arm64.dmg` com o bundle do web em `Contents/Resources/web`; as pernas Windows e Linux ficam para o run de release |
| A versão do instalador acompanha a do app web | `apps/desktop/scripts/version.ts` | versão lida de `apps/web/package.json` e injetada por `--config.extraMetadata.version`; guarda de paridade, recusa de `0.0.0` e de não-semver e `app.getVersion()` no smoke; casos `S-57` | 2026-10-01 | PASS — `app.getVersion()` do app empacotado igual à versão do web |
| Nenhum segredo no repositório nem no bundle | `pnpm vitest run --project scaffold` | varredura de arquivos versionados (`p12`/`pfx`/`pem`/`key`/`gpg`/`p8`), de literais em scripts e config e de `secrets.*` no workflow; `files` limita o asar a `src/**` + `package.json`; caso `S-60` | 2026-10-01 | PASS |
| Empacotador e fluxo de assinatura em ADR | — | `docs/adr/empacotador-do-desktop.md` e `docs/adr/assinatura-dos-instaladores-do-desktop.md`, ambos `status: aceito` e indexados em `docs/adr/README.md`; caso `S-61` | 2026-10-01 | PASS |
| Smoke de abertura e dos fluxos principais sobre o pacote | `STUDY_PACKAGED_APP=apps/desktop/dist pnpm vitest run --project desktop test/packaged-smoke.test.ts` | abre em `study://app` sem dev server nem `STUDY_WEB_DIST`, renderiza a fila do dia e abre o store com `schema_version = 1`; casos `smoke-*` | 2026-10-01 | PASS contra o `dmg` local; roda por perna no release |
| App instalado e usado sem abrir o navegador (DoD da fase) | — | em aberto: exige promover o PR, um run de tag com os segredos e os certificados reais | (a preencher) | (a preencher) |

## O que a entrega faz

- O `apps/desktop` ganha um passo de empacotamento com o `electron-builder` e uma
  configuração única em `apps/desktop/electron-builder.yml` — o manifesto não
  recebe a chave `build`, que o `S-44` veda. A config declara exatamente três
  targets: `dmg` no macOS, `nsis` no Windows e `AppImage` no Linux.
- O renderer continua sendo o do web. O pacote builda `apps/web/dist` e o copia
  por `extraResources` para `web`, que é o `process.resourcesPath/web` que o
  `main.ts` já procura; o `assertBundle` segue como guarda de falha alta.
- A versão do instalador sai de `apps/web/package.json` e é injetada no
  empacotamento, então instalador e web empacotado não divergem; `apps/desktop`
  fica em paridade por guarda de teste.
- A assinatura é por plataforma: macOS com `codesign` + `notarytool` +
  `stapler staple` (via `mac.notarize`, com `hardenedRuntime` e entitlements);
  Windows com `signtool` por `CSC_LINK`/`CSC_KEY_PASSWORD`; Linux com assinatura
  GPG destacada (`.AppImage.sig`), porque o AppImage não tem assinatura embutida.
- Todo segredo vem de variável de ambiente, e de `secrets.*` no CI. Um build de
  release sem os segredos (`STUDY_RELEASE=1`) falha alto; o empacotamento local
  sem segredos avisa e sai não assinado. O `ci.yml` de PR segue sem segredo algum.
- O `release.yml` roda em matrix nativa por tag (`v*`) ou `workflow_dispatch`,
  usa `--publish never` e sobe os instaladores como artifacts; uma perna final
  cria release draft só na tag — nunca publica nem promove sozinho.

## Como usar

```bash
pnpm --filter @study/desktop package        # builda o web e empacota para o SO atual
pnpm --filter @study/desktop sign:appimage  # assinatura GPG destacada do AppImage
STUDY_RELEASE=1 pnpm --filter @study/desktop package  # release: falha se faltar segredo
```

No CI, o workflow `Release` dispara por tag `v*` ou por `workflow_dispatch` e
espera os segredos de cada plataforma: `CSC_LINK`/`CSC_KEY_PASSWORD` (certificado
e senha), `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID` (notarização)
e `GPG_PRIVATE_KEY`/`GPG_KEY_ID`/`GPG_PASSPHRASE` (AppImage). O AppImage é
assinado numa perna Linux dedicada e o smoke empacotado roda por SO sobre o
artefato gerado. A regra de bump e os caminhos de carregamento estão no
`docs/especificacao/DESKTOP.md` e no `README.md`.

## Rodada de `pnpm test`

| Data | Escopo | Arquivos | Casos | Resultado |
| --- | --- | --- | --- | --- |
| 2026-10-01 | repo (`pnpm test`) | 75 (+1 pulado) | 1193 | verde, 1 arquivo/1 caso pulado (o smoke empacotado, atrás de `STUDY_PACKAGED_APP`) |
| 2026-10-01 | `--project desktop --project scaffold` | 7 (+1 pulado) | 212 | verde, 1 caso pulado (o smoke empacotado) |

`pnpm lint` e `pnpm typecheck` fecharam sem erro, incluindo `apps/desktop/scripts`
e os testes novos.

## Verificação manual e deferida

| Caso | Comando | O que mede | Data | Resultado |
| --- | --- | --- | --- | --- |
| Empacotamento real | `pnpm --filter @study/desktop package` | o `dmg` sai com `apps/web/dist` em `Contents/Resources/web` e a versão do web | 2026-10-01 | PASS — `Study-0.1.0-*.dmg` |
| Smoke empacotado | `STUDY_PACKAGED_APP=... pnpm vitest run --project desktop test/packaged-smoke.test.ts` | a janela abre em `study://app` sem dev server, mostra a fila do dia e persiste | 2026-10-01 | PASS |
| Release sem segredos | `STUDY_RELEASE=1 pnpm --filter @study/desktop package` | que o build de release não entrega artefato não assinado | 2026-10-01 | PASS — falhou alto listando `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` |

Fora do alcance automatizável aqui, deferido ao run de release:

- As pernas Windows (`nsis` + `signtool`) e Linux (`AppImage` + GPG) só rodam em
  `windows-latest`/`ubuntu-latest`, dentro do `release.yml`.
- Que a Apple de fato notariza e que o SmartScreen aceita o `.exe` exige os
  certificados reais e um run de tag.
- O próprio `release.yml` ainda não rodou no GitHub Actions.
- O formato do segredo `GPG_PRIVATE_KEY` (armored vs. base64): o workflow assume
  armored com `gpg --batch --import`; um valor base64 falharia no import.

## Verificações já cobertas por teste

| AC do ticket | Caso | Onde |
| --- | --- | --- |
| AC1 — três instaladores no pipeline | `pacote-targets`, `release-matriz`, `release-artefatos` | `apps/desktop/test/package-config.test.ts` (`S-56`), `tests/release.test.ts` (`S-59`) |
| AC2 — os três saem assinados | `mac-assinatura-config`, `windows-assinatura-config`, `linux-gpg-destacado`, `release-sem-segredos-falha`, `local-sem-segredos-avisa` | `package-config.test.ts` (`S-56`/`S-58`) |
| AC3 — nenhum segredo no repo nem no bundle | `sem-arquivo-de-segredo`, `sem-literal-de-segredo`, `workflow-so-secrets`, `bundle-limpo` | `tests/release.test.ts` (`S-60`), `package-config.test.ts` (`S-56`) |
| AC4 — a versão do instalador acompanha a do web | `versao-em-paridade`, `versao-injetada-no-pacote`, `release-recusa-0-0-0`, `smoke-confere-versao` | `package-config.test.ts` (`S-57`) e o smoke empacotado |
| AC5 — ADRs aceitos e indexados | `adr-empacotador-aceito`, `adr-assinatura-aceito`, `indice-de-adrs-completo` | `tests/adr.test.ts` (`S-61`) |
| AC6 — o pacote carrega o renderer sem dev server | `extra-resources-web`, `main-ts-no-pacote`, `smoke-abre-study-app`, `smoke-mostra-fila` | `package-config.test.ts` (`S-56`) e o smoke empacotado |

## Em aberto

- Promover o PR draft e mergear — decisão de quem revisa.
- Provisionar os certificados e segredos (Apple Developer pago, certificado
  Windows, par GPG) e rodar a primeira tag para fechar o DoD da fase.
- O `D-02` segue coberto em parte pelo scaffold do desktop e o `D-03` (paridade
  completa com as telas do web) segue pendente, como o `PLANO-DE-TESTES.md` já
  registra.
