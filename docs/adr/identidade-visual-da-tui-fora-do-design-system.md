---
titulo: 'Identidade visual da TUI fora do design system'
data: '2026-10-02'
status: 'aceito'
---

# Identidade visual da TUI fora do design system

- Contexto: a TUI, o web e o desktop devem parecer o mesmo produto sem que a TUI quebre as próprias restrições. O `bosi-design-system` (v0.6.0, local, não publicado) é React 19 + Svelte 5 + Tailwind 4 sobre DOM; não há camada agnóstica de framework. As `exports` oferecem só `./react`, `./svelte` e um `./css` que aponta para `./dist/global.css`, arquivo que não existe no repositório.
- Contexto: a TUI é zero-dep por decisão da [Superfície da TUI](superficie-da-tui-zero-dep-raw-mode-tela-alternativa-e-saida.md) e o `S-28` pina `dependencies` vazio no pacote publicado (`tests/scaffold.test.ts`); o `render(state)` é puro e devolve o frame como string, sem DOM, sem `node:*` e sem `process` (`docs/especificacao/TUI-RENDER.md`). A identidade da TUI é textual e independente de cor: sobrevive a `--no-color`, `NO_COLOR`, `TERM=dumb`, stdout não-TTY e à queda ASCII — a pergunta compartilhada é sobre tokens e paleta, nunca sobre componentes.
- Contexto: o que existe para compartilhar são os tokens do `@theme` de `lib/global.css` do design system. A paleta da TUI é a do ADR [Cores da saída humana do CLI](cores-da-saida-humana-do-cli.md) — âmbar `#E8A13B`, verde `#64C889`, cinza-médio `#909BA6`, cinza-escuro `#5F6977` e vermelho `#E06C75` —, e nenhum desses cinco hexes aparece no `@theme`; o conjunto semântico também é outro (pares claro/escuro de tema contra âmbar de atraso e verde de hoje). Compartilhar só tokens não é um alias: exigiria re-derivar a paleta da TUI dos tokens semânticos e emendar o ADR de cores e o `color.test.ts`.
- Contexto: a licença do design system está inconsistente no próprio repositório — o `package.json` declara `GPLv3`, enquanto o arquivo `LICENSE` contém texto MIT com copyright de Rayyamhk. Derivar tokens ou componentes de um pacote nessa condição para dentro do CLI publicado no npm é risco jurídico sem resposta.
- Contexto: a divergência de identidade é entre a TUI e o par web/desktop; o desktop herda o renderer do web ([Desktop com Electron](desktop-com-electron-reaproveitando-o-web.md)), então não há três identidades, há duas. O `BOS-64` acompanha a publicação do design system e é pré-condição para qualquer adoção.

- Decisão: as três opções foram comparadas e cada uma colide com o zero-dep e o `S-28` assim:

| Opção | Colisão com o zero-dep / `S-28` | Custo |
| --- | --- | --- |
| Compartilhar só tokens | Import em runtime viola o zero-dep e o `S-28`; geração no build não toca `dependencies`, mas acopla a publicação do CLI a um pacote externo não publicável e de licença não resolvida | Alto: re-derivar a paleta da TUI, emendar o ADR de cores e o `color.test.ts`, e esperar o `BOS-64` |
| Expor camada agnóstica no design system | Não viola o zero-dep por si (o consumo seria no build), mas a camada não existe e é trabalho no repositório do design system, bloqueado pela publicação do `BOS-64` | Alto e fora deste repo, sem origem pinada |
| Manter a TUI fora e documentar a divergência | Nenhuma: `dependencies` segue vazio, sem runtime novo e sem comportamento alterado | Baixo: um ADR novo, uma linha no índice e uma referência cruzada no ADR da superfície |

- Decisão: a recomendação única é **manter a TUI fora do design system e não adotar agora**; a divergência fica documentada neste ADR. O custo estimado é um ADR novo, uma linha no índice de `docs/adr/README.md` e uma referência cruzada a partir do ADR da superfície — nenhum código de runtime muda.
- Decisão: a avaliação de licença conclui por **não derivar** tokens nem componentes do design system enquanto a divergência `GPLv3` no `package.json` versus MIT no `LICENSE` (copyright Rayyamhk) não for resolvida na origem.
- Decisão: como a recomendação é não adotar, nenhum ticket de implementação derivado é aberto. A publicação da `BOS-65` registra a decisão; a reavaliação depende do gatilho abaixo.
- Consequência: a TUI mantém a paleta própria do ADR de cores, e `apps/cli/src/output/color.ts` e o `color.test.ts` ficam intactos. A identidade compartilhada entre TUI, web e desktop fica restrita à linguagem textual e à estrutura de tela, não à paleta.
- Consequência: o `S-28` continua verde sem edição, e `apps/cli/package.json` segue com `dependencies` vazio.
- Alternativa rejeitada: compartilhar só tokens em runtime — viola o zero-dep, o `S-28` e a pureza do `render`.
- Alternativa rejeitada: gerar os tokens no build — não viola o `S-28`, mas acopla a publicação do CLI a um pacote externo não publicável, sem licença resolvida e antes do `BOS-64`.
- Alternativa rejeitada: expor uma camada agnóstica agora — é trabalho no repositório do design system, fora deste repo e bloqueado pela publicação do `BOS-64`.
- Alternativa rejeitada: adotar os componentes React/Svelte — não rodam sobre um `render(state)` que devolve string, sem DOM.
- Gatilho de revisão: o design system publicar uma **camada agnóstica** de tokens de framework, com origem pinada, depois do `BOS-64`. Nesse momento a opção de compartilhar só tokens volta à mesa, com a paleta re-derivada e o ADR de cores e o `color.test.ts` atualizados no mesmo passo.
