---
numero: 24
titulo: 'Vocabulário fechado de error.code e envelope no study sem comando'
data: '2026-09-24'
status: 'aceito'
---

# ADR-024 — Vocabulário fechado de `error.code` e envelope no `study` sem comando

- Contexto: o contrato de máquina do CLI nasceu espalhado — cada ticket da ENG-6 à ENG-10 fez o próprio recorte de `--json`, de erro e de exit code — e o `docs/especificacao/REQUISITOS.md` exige, no RNF-08, um envelope estável e versionado, consumido pelos snapshots (T-25) e pelos apps seguintes (web, mobile e desktop). A auditoria da ENG-11 achou o comportamento certo no essencial, mas dois pontos de contrato viviam só no código: os catorze valores que `error.code` pode assumir (oito de `CliError` em `apps/cli/src/errors.ts` mais os seis `kind` de `packages/core/src/errors.ts`) não estavam em documento nenhum, e `study --json` sem comando despejava o bloco de uso no stderr, fora do envelope, enquanto `comando desconhecido` já respondia no envelope com exit 1.
- Decisão: **`code` é o contrato; `message` é prosa.** O consumidor de `schema_version: 1` ramifica por `code`, e a `message` é para humano lendo o stderr. O vocabulário é **fechado em catorze valores** — `usage`, `invalid-status`, `invalid-value`, `invalid-state`, `unsupported-schema`, `backup-failed`, `aborted` e `internal`, mais os seis `kind` do core (`invalid-field`, `invalid-difficulty`, `invalid-ref`, `not-found`, `ambiguous-ref`, `item-not-active`) — e o `docs/especificacao/CLI.md` passa a nomeá-los na coluna `code` das 25 linhas da tabela de erros. Nada fora da lista é emitido, e a varredura de teste lê a coluna `code` da própria tabela como fonte, para que documento e código não possam divergir em silêncio.
- Decisão: um erro que **não é `CliError` nem `CoreError`** vira `code: internal` com exit 1. É o que o `errorPayload` já fazia; a decisão só o torna contrato, em vez de detalhe de implementação.
- Decisão: **`study --json` sem comando responde no envelope**, com `code: usage` e exit 1, como `comando desconhecido` — stdout vazio, erro no stderr. Sem `--json`, o bloco de uso humano continua no stderr, sem envelope, exit 1. `--help` fica de fora: **não é comando** e segue no canal humano (uso no stdout, exit 0, sem envelope), mesmo com `--json`.
- Decisão: a raiz do envelope de subcomando é a **palavra do comando** (`cold`, `config`), não o par (`cold list`), e o payload carrega `action`. O `## Contrato --json` do `CLI.md` passa a listar a forma do payload das 17 palavras de comando.
- Consequência: a ENG-12 pina snapshots contra este contrato, e ele é a leitura de web, mobile e desktop. O `packages/core` não muda: os seis `kind` já eram o contrato, e o mapeamento para exit code continua no CLI (`CORE_EXIT_CODES`).
- Consequência: `study` sem comando passa a ter duas saídas distintas por `--json`, e o único caso de envelope que não vem de uma ação de comando é justamente esse. `--help` continua sendo a única saída de uso no stdout.
- Alternativa rejeitada: deixar `code` sem documento e tratar a `message` como contrato — congelaria prosa, e qualquer ajuste de redação viraria quebra de contrato.
- Alternativa rejeitada: manter o bloco de uso cru no stderr também com `--json` — obrigaria o consumidor de `schema_version: 1` a ramificar por um canal que não é o envelope, que é o defeito que o RNF-08 fecha.
- Alternativa rejeitada: usar o par (`cold list`) como raiz do envelope — a chave passaria a depender do subcomando e quebraria "a palavra do comando como raiz".
- Alternativa rejeitada: mandar `--help` no envelope — o uso é o canal humano que funciona antes de qualquer contrato, e `--help` não é comando.
- Gatilho de revisão: um `CliErrorCode` ou um `kind` do core novo, ou uma superfície que precise de um `code` com semântica diferente da tabela.
