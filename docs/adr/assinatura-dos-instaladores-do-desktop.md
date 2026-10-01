---
titulo: 'Assinatura dos instaladores do desktop'
data: '2026-10-01'
status: 'aceito'
---

# Assinatura dos instaladores do desktop

- Contexto: o [Empacotador do desktop](empacotador-do-desktop.md) escolheu o `electron-builder` e os três alvos, mas não decidiu como cada artefato é assinado. O `DESKTOP.md` e o ticket pedem os três assinados, e o repositório não pode guardar segredo nenhum. Cada sistema tem um mecanismo diferente e o AppImage não tem assinatura embutida.
- Decisão: macOS pelo `codesign` com `hardenedRuntime` e os entitlements mínimos do Chromium (JIT, memória executável e cliente de rede), e a notarização pelo `notarytool` com `stapler staple` — no `electron-builder`, o `mac.notarize` com `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` e `APPLE_TEAM_ID`; o certificado Developer ID chega por `CSC_LINK`/`CSC_KEY_PASSWORD`.
- Decisão: Windows pelo `signtool` do próprio `electron-builder`, alimentado por `CSC_LINK`/`CSC_KEY_PASSWORD`; sem certificado o SmartScreen bloqueia até o usuário liberar, e essa consequência é aceita.
- Decisão: Linux por assinatura GPG destacada em `apps/desktop/scripts/sign-appimage.ts`, que grava `<artefato>.AppImage.sig` com `--batch --pinentry-mode loopback`, `--detach-sign` e `--armor`; a chave é importada no runner e nunca entra no repositório.
- Decisão: todo segredo vem de variável de ambiente, e no CI de `secrets.*` — nenhum valor literal no repositório, nos scripts ou no bundle. Um teste-guarda varre arquivos versionados, scripts, config e workflow.
- Decisão: a distinção entre release e empacotamento local é explícita (`STUDY_RELEASE`). Em release, `assertSigningReady` lança listando o que falta; fora dele, o plano devolve `signed: false` com aviso e o artefato sai não assinado, sem quebrar quem só quer testar o pacote.
- Consequência: o CI de PR (`ci.yml`) continua sem segredo nenhum e sem assinar; um fork builda sem chave e não quebra.
- Consequência: um run de release sem os segredos falha alto em vez de entregar artefato não assinado. A prova final de que a Apple notariza e de que o SmartScreen aceita o `.exe` exige os certificados reais, e fica registrada como verificação de release, não como teste de `pnpm test`.
- Alternativa rejeitada: assinatura embutida no AppImage. O formato não tem assinatura interna; o destacado `.sig` é o que o formato oferece.
- Alternativa rejeitada: guardar o certificado ou a chave no repositório, mesmo cifrado. O ticket proíbe segredo versionado e o CI não deve depender disso.
- Alternativa rejeitada: exigir assinatura também no empacotamento local. Quebraria o loop de quem só quer gerar o instalador sem ter os certificados.
- Gatilho de revisão: os segredos passarem a vir de um cofre (OIDC/Vault), a assinatura embutida do AppImage virar padrão, ou o SmartScreen deixar de ser consequência aceita.
