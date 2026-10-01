---
titulo: 'Rastreabilidade U-nn da TUI por token literal'
data: '2026-10-01'
status: 'aceito'
---

# Rastreabilidade `U-nn` da TUI por token literal

- Contexto: a TUI já está em `apps/cli/src/tui/` (BOS-50..BOS-54) com os casos in-process em `apps/cli/test/tui/`, mas a suíte não tinha id nem vínculo. O `docs/engenharia/PLANO-DE-TESTES.md` listava `T-nn` (domínio), `C-nn` (a regra, no core) e as faixas `W/P/M/D`, e a varredura do CLI cobria só `T-nn`/`RF-nn`. Um frame, uma tecla ou a recusa sem terminal podiam sumir sem nenhuma varredura reprovar, e o `T-nn` do domínio não responde pelo desenho.
- Decisão: **a suíte da TUI é uma faixa própria `U-01..U-13`**, subseção do plano no molde de `S-01..S-55`/`C-01..C-65`, fora da tabela `## Casos obrigatórios` — essa tabela é do domínio (`T-nn`) e a forma dela é pinada pelo scaffold. A faixa sai da fase 2; `U-13` é o PTY real, marcado `(manual)` como o `T-26`.
- Decisão: **o vínculo `U-nn` → teste é um token literal no arquivo**, extensão do molde do ADR [Rastreabilidade T-nn do CLI, verificação manual e medição da RNF-03](rastreabilidade-t-nn-do-cli-verificacao-manual-e-medicao-da-rnf-03.md) e do mesmo `describe('S-23 rastreabilidade T-nn do CLI')` de `apps/cli/test/traceability.test.ts`, que a varredura nova espelha. O `describe('rastreabilidade U-nn do CLI')`, no mesmo arquivo, lê a subseção do plano e exige os 13 ids contíguos, só o `U-13` `(manual)`, e cada `U-nn` não manual como token num arquivo de `apps/cli/test/tui/**/*.test.ts`.
- Decisão: **a TUI não ganha faixa `RF-nn` própria.** Os RF que ela reusa (RF-05, RF-06, RF-08, RF-10, RF-11, RF-12, RF-13, RF-21) seguem ancorados pelos `T-nn` existentes (T-11, T-16, T-03, T-04, T-19, T-05, T-21), porque a varredura `RF-01..RF-20` exige um arquivo que exercita `--json` e a TUI o recusa como entrada.
- Decisão: **os casos in-process já existentes ganham só o rótulo**, sem asserção nova. É o mesmo movimento que o `T-nn` fez em `apps/cli/test/cli.test.ts`: o token entra no `describe`/`it` que já prova o caso e a varredura liga o plano ao arquivo. Só o spawn sem TTY ganha arquivo próprio (`apps/cli/test/tui/spawn.test.ts`), porque a recusa depende de um processo sem TTY que o teste in-process não dá.
- Decisão: **o `spawn.test.ts` repete de propósito `tui-recusa-sem-tty`/`tui-recusa-json` de `apps/cli/test/cli.test.ts`.** A `U-nn` exige o token em `apps/cli/test/tui/**/*.test.ts` e o spawn é o único caso que a suíte in-process não dá; a cópia é consciente, para o vínculo ter um dono na faixa da TUI, em vez de um helper compartilhado que apagaria esse dono.
- Consequência: trocar o plano passa a reprovar a suíte do CLI — perder um `U-nn` da subseção, renumerar a faixa ou tirar o `(manual)` do `U-13` quebra a varredura, e trocar o token de um teste quebra o vínculo.
- Consequência: um `U-nn` novo exige uma linha na subseção do plano e um token literal num arquivo de `apps/cli/test/tui`, ou a marca `(manual)`. O vínculo envelhece junto com o documento, não com uma lista paralela escrita no teste.
- Consequência: as varreduras `S-23`/`S-24` ficam intactas. Os `T-nn` e os `RF-nn` que elas pinam continuam com a mesma forma, e a varredura nova é irmã delas, não substituta.
- Alternativa rejeitada: registrar a `U-nn` na tabela `## Casos obrigatórios` junto dos `T-nn` — a tabela é do domínio e o scaffold pina exatamente 27 ids `T-nn` contíguos; a TUI entraria como uma segunda natureza dentro de uma lista que não é dela.
- Alternativa rejeitada: escrever a lista de `U-nn` dentro do teste de rastreabilidade — a lista passaria a ser uma segunda cópia do plano e envelheceria em silêncio, que é o defeito que a varredura fecha.
- Alternativa rejeitada: estender a varredura `RF-01..RF-20` à TUI — os arquivos da TUI não exercitam `--json`, que a TUI recusa; pôr o token num arquivo in-process deixaria a varredura provar menos do que ela declara.
- Alternativa rejeitada: dar à TUI uma faixa `U-nn` mas manter o vínculo em prosa — foi a prosa solta que deixou `T-01`, `T-02`, `T-03` e `T-12` sem execução no CLI antes do molde de token.
- Gatilho de revisão: a TUI deixar de recusar `--json`, ou outra camada (web, mobile, desktop) querer a mesma varredura da `U-nn` para os próprios casos de tela.
