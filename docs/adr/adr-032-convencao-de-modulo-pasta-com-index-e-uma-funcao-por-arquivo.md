---
numero: 32
titulo: 'Convenção de módulo: pasta com index.ts e uma função por arquivo'
data: '2026-09-30'
status: 'aceito'
---

# ADR-032 — Convenção de módulo: pasta com `index.ts` e uma função por arquivo

- Contexto: o CLI cresceu em arquivos de responsabilidade única com uma função de topo por arquivo (`output/color.ts`, `queueStreak.ts`, `coldArchive.ts`), mas alguns módulos passaram de 400 linhas com o tempo — `apps/cli/src/tui/session.ts` chegou a 403 linhas e 26 declarações de topo (9 tipos e 17 funções) num arquivo só. Nada no layout do repositório dizia onde traçar a linha, então cada módulo novo repetia o formato "tudo junto" porque era o único exemplo à mão.
- Decisão: um módulo grande do CLI pode ser uma **pasta-módulo**: uma pasta com o nome do módulo, um `index.ts` que é a única boca pública, e **uma função de topo por arquivo** com o nome do arquivo igual ao nome da função (`openSession.ts`, `moveFocus.ts`). Tipos ficam juntos num `types.ts` quando mais de uma função os compartilha — tipo não é função, e agrupá-los é o que mantém o grafo de `import` acíclico. O `index.ts` reexporta só a superfície pública; arquivos internos não aparecem na boca.
- Decisão: o `import` entre irmãos é pelo caminho relativo do arquivo (`./moveFocus.ts`) e o externo sobe para o `src` (`../../context.ts`), o mesmo estilo do resto do CLI. O grafo de dependência precisa ser acíclico e é conferido ao mover cada função.
- Consequência: `apps/cli/src/tui/session.ts` vira `apps/cli/src/tui/session/` com 19 arquivos (`index.ts`, `types.ts` e 17 funções). O `Session` devolvido por `openSession` continua um closure dentro de `openSession.ts`, então a superfície pública não muda de forma e nenhum comportamento muda.
- Consequência: a guarda de "sem I/O de processo" do [ADR-030](adr-030-porta-de-abertura-do-contexto-e-sessao-longa-da-tui.md) passa a varrer todos os `*.ts` da pasta, não só o `index.ts`; ler só a boca enfraqueceria a garantia em silêncio.
- Consequência: a convenção é citável pelos próximos módulos grandes do CLI (`output/human.ts`, `output/json.ts`, `output/color.ts`, `coldArchive.ts`, `import.ts`, `context.ts`, `args.ts`, `persistence/mapping.ts`, `deps.ts`), que ficam como mudanças próprias.
- Alternativa rejeitada: manter `session.ts` como shim que reexporta a pasta — deixaria um arquivo vestigial sem simplificar nada e daria duas formas do mesmo módulo.
- Alternativa rejeitada: prender "uma função por arquivo" num teste estrutural — a suíte importando a superfície pela boca nova já prova o split, e o teste engessaria a própria convenção que este ADR deixa aberta para os outros módulos.
