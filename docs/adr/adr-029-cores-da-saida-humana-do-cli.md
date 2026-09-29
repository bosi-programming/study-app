---
numero: 29
titulo: 'Cores da saída humana do CLI: paleta truecolor com detecção de terminal'
data: '2026-09-28'
status: 'aceito'
---

# ADR-029 — Cores da saída humana do CLI: paleta truecolor com detecção de terminal

- Contexto: o `CLI.md` v5 fechou a V1 com largura fixa e "sem cores obrigatórias", e a saída humana nasceu só com texto. As imagens de design do produto (o `study due` e o `study review`) pedem hierarquia visual: atrasado em âmbar, hoje e check-in em verde, metadados em cinza e rótulos em cinza-médio.
- Contexto: o CLI é publicado no npm e a saída humana é lida por pessoas num terminal e por testes que dão spawn no bin e comparam texto, então a cor não pode alterar o conteúdo nem depender do terminal de quem roda a suíte.
- Decisão: a cor é **decoração, não contrato**. O texto sem os escapes é byte a byte igual ao de antes; nenhuma mensagem, coluna ou separador muda. A paleta vive em `apps/cli/src/output/color.ts` — âmbar `#E8A13B` para atraso, verde `#64C889` para hoje e check-in, cinza-médio `#909BA6` para rótulos, cinza-escuro `#5F6977` para metadados e vermelho `#E06C75` para erro — e usa **truecolor** (`38;2;r;g;b`), sem degradação para 256 ou 16 cores.
- Decisão: a paleta liga por padrão **só quando o stdout é um terminal**. Desligam: `--json` (o envelope é contrato de máquina, RNF-08), `--no-color` e `NO_COLOR` (não vazio); liga `FORCE_COLOR` (não vazio e diferente de `0`); `TERM=dumb` desliga. A precedência é `--json`/`--no-color` > `FORCE_COLOR` > `NO_COLOR` > TTY.
- Decisão: `--no-color` entra nas flags globais e no bloco de uso, ao lado de `--json` e `--no-input`.
- Consequência: os testes que dão spawn no bin fixam `NO_COLOR=1` e `FORCE_COLOR` vazio no env do `runStudy` (`helpers.ts`), para que a saída comparada não dependa do terminal de quem roda `pnpm test`; o `color.test.ts` força `FORCE_COLOR` para pinar a paleta e o `--no-color`.
- Consequência: o `CLI.md` sobe para a v6 e passa a documentar a paleta e a decisão de ligar/desligar; o `docs/README.md` acompanha o número de ADRs.
- Alternativa rejeitada: ligar a cor sempre e deixar o consumidor desligar — quebraria o parse de quem lê a saída humana por pipe e o snapshot de `--json`.
- Alternativa rejeitada: honrar só o TTY, sem `FORCE_COLOR`/`NO_COLOR` — não haveria como pinar a paleta num teste de spawn nem respeitar a preferência de acessibilidade de quem usa o CLI.
- Alternativa rejeitada: 16 ou 256 cores ANSI — o design é de tons específicos (`#E8A13B`, `#64C889`) e a aproximação mudaria a leitura.
- Alternativa rejeitada: colorir o canal `--json` — quebraria o envelope estável por `schema_version: 1`.
- Gatilho de revisão: uma cor nova ou uma mudança de tom exige atualizar o `color.test.ts`, o `CLI.md` e este ADR; um sinal novo de terminal (ex.: NO_COLOR v2) reabre a precedência.
