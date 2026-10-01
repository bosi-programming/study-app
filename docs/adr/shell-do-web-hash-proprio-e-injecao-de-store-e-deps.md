---
titulo: 'Shell do web: hash próprio e injeção de store e deps'
data: '2026-10-01'
status: 'aceito'
---

# Shell do web: hash próprio e injeção de store e deps

- Contexto: o `WEB.md` fixa "uma tela por rota, navegação por hash" e o scaffold do `apps/web` (BOS-41) deixou a raiz montando só a feature-demo `due`, sem rota; a porta `Store` (BOS-42) é assíncrona e tempo e id chegam por `deps` (`WEB.md` — Contrato com o core). As telas do BOS-43 (ENG-18) precisavam de um ponto que decidisse quem abre o banco, quem monta os `deps` e como a rota chega à tela, sem que a UI leia relógio ou IndexedDB por conta própria.
- Decisão: o roteamento é um roteador de hash próprio, sem `react-router` nem biblioteca de estado — `src/routing.ts` é puro (o union `Route` das seis rotas e de um parâmetro, `parseHash` e `hrefFor`) e `src/useHashRoute.ts` é o único que escuta `hashchange` e lê `globalThis.location`; hash desconhecido cai na fila.
- Decisão: `App({ store, deps })` recebe a porta e as dependências prontas. `main.tsx` é o único ponto que chama `openStore(browserIdb())` e monta o `systemDeps` — o espelho de `apps/cli/src/deps.ts` sem API de Node, com `localDateOf` na borda — e os testes montam `<App store deps />` sobre `fake-indexeddb`, sem tocar o banco do navegador.
- Decisão: a UI nunca lê relógio nem `indexedDB`: todo `today`/`now` entra pelos `deps` e toda leitura e escrita passa pela porta. É a mesma direção de camadas que o `apps/web/test/architecture.test.ts` prende (sem rede em `src/**`, sem react no model, sem view no controller).
- Decisão: o boot é o limite de erro da raiz. A falha de `openStore` não entrega uma tela quebrada: `main.tsx` renderiza a mensagem da tabela `## Erros` do `WEB.md` (`não foi possível salvar; tente de novo`), a mesma que o `src/errors.ts` traduz para as falhas de store em tempo de uso.
- Consequência: nenhuma dependência de runtime nova — `react` e `react-dom` continuam as únicas, e a varredura de `apps/web/test/architecture.test.ts` reprova quem acrescentar outra. Nenhum `pnpm-lock.yaml` novo e nenhum ADR de dependência a mais.
- Consequência: o shell é o contrato herdado do desktop. O `apps/desktop` carrega o mesmo `App` pelo dev server ([Desktop com Electron reaproveitando o web](desktop-com-electron-reaproveitando-o-web.md)) e o smoke dele mira o shell; rota nova nasce no mesmo union e na mesma barra de navegação.
- Consequência: a composição demo do `due` sai da raiz e o vetor do scaffold continua valendo; o model de `due` passa a alimentar a prévia de vencimento da tela de adicionar.
- Alternativa rejeitada: `react-router` — seis rotas, um parâmetro e um app offline não pagam uma dependência de runtime; ela ainda custaria um ADR e mexeria no lockfile do CI.
- Alternativa rejeitada: abrir o store dentro do `App` — acoplaria a raiz ao navegador, os testes perderiam o `fake-indexeddb` injetado e o desktop perderia a costura de injeção.
- Alternativa rejeitada: cada controller ler `location.hash` por conta própria — repetiria o parser e deixaria a navegação fora do teste puro.
- Gatilho de revisão: uma rota precisar de estado compartilhado entre telas, ou a navegação por hash deixar de expressar o que o app precisa (histórico com substituição, rota aninhada, guarda de rota).
