---
numero: 17
titulo: 'CI com lint, typecheck e testes nas PRs para main'
data: '2026-09-22'
status: 'aceito'
---

# ADR-017 — CI com lint, typecheck e testes nas PRs para main

- Contexto: os 269 testes e o `pnpm typecheck` só rodavam se alguém lembrasse de rodar local, e a PR #1 entrou em `main` sem nenhum check. Não existia `.github/workflows` nem dependência de lint no repositório, então o gate precisava nascer com as duas peças: o comando de lint e o workflow que o chama.
- Decisão: um workflow `.github/workflows/ci.yml` com um job `ci` em `ubuntu-latest`, disparado por `pull_request` com base `main` (nunca `pull_request_target`), com `permissions: contents: read` e sem segredo algum — PR de fork roda igual. Os passos, nesta ordem, são `actions/checkout@v4`, `pnpm/action-setup@v4` (sem `version:` fixo: lê o `packageManager` da raiz, hoje `pnpm@12.4.1`), `actions/setup-node@v4` com `node-version: 24` e `cache: pnpm`, `pnpm install --frozen-lockfile`, e então um passo por gate: `pnpm lint`, `pnpm typecheck` e `pnpm test`.
- A ordem não é estética: o `pnpm/action-setup` vem antes do `setup-node` porque o cache do pnpm é resolvido pelo próprio `setup-node`, e o `--frozen-lockfile` fecha a instalação antes de qualquer gate rodar.
- Um passo por gate, sem `continue-on-error`, sem `|| true` e sem `if: always()`: o vermelho diz qual gate falhou sem precisar abrir o log inteiro, e nenhum passo muta o resultado do outro.
- Decisão: o lint é o ESLint 10.11.0 em flat config ESM (`eslint.config.js`, ESM porque o repo é `"type": "module"`) com `@eslint/js` 10.0.1 e `typescript-eslint` 8.70.1 recommended, os três como devDependencies exatas de raiz — nenhum membro do workspace declara lint. Flat config é o único formato no 10, e fixar as versões exatas segue o resto do repo (typescript 5.9.3, vitest 4.1.11, `@types/node` 24.13.4).
- A config não recorta por `files`: o `eslint .` vale para todo o TS do repositório — `packages/*`, `apps/*` e `fixtures/*` (src e test), `tests/`, `scripts/` e os TS da raiz —, ignorando `node_modules`, `coverage`, `recipes` e `.scratch`. É mais largo que os globs `*/src` da fase 1 de propósito: o AC do ticket diz `packages/*` sem recortar `src`, e arquivo de teste é código.
- Sem regras type-aware nesta primeira versão, e sem `no-console`: type-aware duplicaria o `pnpm typecheck` que já existe e pagaria o grafo de tipos em cada execução, e `no-console` quebraria o CLI e os `scripts/`, que imprimem de propósito.
- O gate nasce verde: nenhuma regra do preset é neutralizada com `eslint-disable`; um achado vira correção no mesmo PR.
- Consequência: `pnpm lint` é o terceiro comando de raiz, ao lado de `pnpm typecheck` e `pnpm test`, e o CI chama exatamente esses três. O comando local é o do CI, então o resultado local é o do CI.
- Consequência: exigir o check `ci` para merge em `main` é branch protection, configuração do repositório que o arquivo do workflow não escreve — fica como entrega manual do dono do repo depois que o check aparecer na primeira PR.
- Consequência: o `pnpm-lock.yaml` carrega as três dependências novas no mesmo PR, então o `pnpm install --frozen-lockfile` do CI continua válido; drift entre manifesto e lockfile passa a falhar antes dos gates, que é o comportamento desejado.
- Alternativa rejeitada: nascer na linha 9.x do ESLint — é a linha de manutenção e só adiaria a migração para o 10 sem ganho imediato.
- Alternativa rejeitada: validar o YAML com `actionlint` ou um linter de YAML — fora do escopo do ticket; a primeira execução real prova que o arquivo é válido e que as actions resolvem.
- Alternativa rejeitada: rodar lint, typecheck e test num único passo encadeado — um passo só esconde qual gate quebrou.
- Gatilho de revisão: precisar de regra type-aware, de matriz de versões de Node ou de um segundo job (cobertura, publicação); ou o gate de cobertura do ENG-4 querer entrar no CI.
