# Frames da TUI — Referência

Versão: 2 | Data: 2026-10-02 | Base: `docs/especificacao/TUI.md`

Blocos das telas da `study tui` para conferência visual. O texto sem os escapes é a fonte; a cor é decoração do ADR Cores da saída humana do CLI.

## Paleta

| Papel | Hex | Uso |
| --- | --- | --- |
| Atraso | `#E8A13B` | vencimento passado e marcador de foco |
| Hoje | `#64C889` | vence hoje, check-in e status ativo |
| Rótulo | `#909BA6` | matéria, cabeçalho e rótulo de campo |
| Metadado | `#5F6977` | índice, `d`/`n`, separador e dica |
| Erro | `#E06C75` | mensagem de erro |

## Convenções

- O terminal dos frames de tela cheia tem 84 colunas.
- `>` marca o item em foco e não muda a largura da linha.
- Sem cor, o atraso vira `!` e nada muda de posição.
- Estes frames não criam requisito: eles ilustram o `TUI.md`.

## Fila cheia

Fila cheia: 8 atrasados e 4 hoje. Matéria em tom de rótulo, título em texto, e o atraso mais antigo no topo.

```text
Fila de hoje — 2026-09-28
────────────────────────────────────────────────────────────────────────────────────
Atrasados (8)
> 1.  [Cálculo]      Derivadas parciais         venceu 2026-08-22 (37d)     d4  n=2
  2.  [Estruturas …] Árvores balanceadas AVL    venceu 2026-09-07 (21d)     d5  n=0
  3.  [Inglês]       Phrasal verbs              venceu 2026-09-14 (14d)     d3  n=1
  4.  [Física]       Leis de Newton             venceu 2026-09-18 (10d)     d2  n=3
  5.  [História]     Revolução Industrial       venceu 2026-09-22 (6d)      d3  n=2
  6.  [Português]    Crase e regência verbal    venceu 2026-09-24 (4d)      d2  n=5
  7.  [Biologia]     Ciclo de Krebs e fosfori…  venceu 2026-09-27 (1d)      d4  n=4
  8.  [Cálculo]      Integrais por partes       venceu 2026-09-25 (3d)      d5  n=1

Hoje (4)
  9.  [Cálculo]      Séries de Taylor           vence hoje                  d4  n=1
  10. [Química]      Estequiometria             vence hoje                  d3  n=0
  11. [Estruturas …] Grafos: caminho mínimo     vence hoje                  d5  n=2
  12. [Inglês]       Reported speech            vence hoje                  d2  n=6
────────────────────────────────────────────────────────────────────────────────────
Enter revisar · i detalhe · ? ajuda · q sair                8 atrasados, 4 para hoje
```

## Fila rolada

Janela de 9 linhas com o foco no item 7: os indicadores ↑/↓ e o 3–11 de 12 mostram o recorte, e o foco nunca sai da tela.

```text
Fila de hoje — 2026-09-28
────────────────────────────────────────────────────────────────────────────────────
↑ 2 acima
Atrasados (8)
  3.  [Inglês]       Phrasal verbs              venceu 2026-09-14 (14d)     d3  n=1
  4.  [Física]       Leis de Newton             venceu 2026-09-18 (10d)     d2  n=3
  5.  [História]     Revolução Industrial       venceu 2026-09-22 (6d)      d3  n=2
  6.  [Português]    Crase e regência verbal    venceu 2026-09-24 (4d)      d2  n=5
> 7.  [Biologia]     Ciclo de Krebs e fosfori…  venceu 2026-09-27 (1d)      d4  n=4
  8.  [Cálculo]      Integrais por partes       venceu 2026-09-25 (3d)      d5  n=1

Hoje (4)
  9.  [Cálculo]      Séries de Taylor           vence hoje                  d4  n=1
  10. [Química]      Estequiometria             vence hoje                  d3  n=0
  11. [Estruturas …] Grafos: caminho mínimo     vence hoje                  d5  n=2
↓ 1 abaixo
────────────────────────────────────────────────────────────────────────────────────
Enter revisar · i detalhe · ? ajuda · q sair 3–11 de 12  ·  8 atrasados, 4 para hoje
```

## Painel de detalhe

Detalhe somente-leitura: campos do study show (RF-06) e histórico (RF-10). Esc, i ou q volta.

```text
╭─ Detalhe ────────────────────────────────────────────────────────────────────────╮
│                                                                                  │
│ Ciclo de Krebs e fosforilação oxidativa                               Esc · i · q│
│ [Biologia]   7a1f0c3d                                                            │
│                                                                                  │
│ Dificuldade  4 — difícil                      Vencimento   venceu 2026-09-27 (1d)│
│ Intervalo    24d                                                   Check-ins    4│
│ Nota         resumo do cap. 7                  Link         khanacademy.org/krebs│
│ Status       active                                                              │
│                                                                                  │
│ Histórico (4)                                                                    │
│   2026-09-27  n=4  intervalo 24d  no prazo                                       │
│   2026-08-30  n=3  intervalo 12d  no prazo                                       │
│   2026-08-12  n=2  intervalo 6d   no prazo                                       │
│   2026-08-01  n=1  intervalo 3d   atrasado                                       │
│                                                                                  │
│ As setas rolam o histórico quando ele passa da tela.                             │
│                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

## Reavaliação

Depois do check-in: a linha em foco já mostra o n novo e o vencimento recalculado; Enter mantém a dificuldade, 1–5 recalcula com a base nova (RN-06), Esc cancela.

```text
Fila de hoje — 2026-09-28
────────────────────────────────────────────────────────────────────────────────────
↑ 2 acima
Atrasados (8)
  3.  [Inglês]       Phrasal verbs              venceu 2026-09-14 (14d)     d3  n=1
  4.  [Física]       Leis de Newton             venceu 2026-09-18 (10d)     d2  n=3
  5.  [História]     Revolução Industrial       venceu 2026-09-22 (6d)      d3  n=2
  6.  [Português]    Crase e regência verbal    venceu 2026-09-24 (4d)      d2  n=5
> 7.  [Biologia]     Ciclo de Krebs e fosfori…  vence 2026-10-21 (23d)      d4  n=5
  8.  [Cálculo]      Integrais por partes       venceu 2026-09-25 (3d)      d5  n=1

Hoje (4)
  9.  [Cálculo]      Séries de Taylor           vence hoje                  d4  n=1
↓ 3 abaixo
────────────────────────────────────────────────────────────────────────────────────
✓ Check-in registrado: Ciclo de Krebs e fosforilação oxidativa
Dificuldade atual: 4 — difícil  ·  Enter mantém, ou escolha 1–5:
  1 trivial   2 fácil   3 médio   4 difícil   5 muito difícil
Esc cancela · Enter mantém · 1–5 recalcula
```

## Fila vazia

Estado vazio explícito com o streak de fila zerada (RF-21). Só q e ? respondem.

```text
Fila de hoje — 2026-09-28
────────────────────────────────────────────────────────────────────────────────────


                           Fila zerada — streak de 4 dias

                                  ? ajuda · q sair

────────────────────────────────────────────────────────────────────────────────────
```

## Ajuda

? abre a lista de teclas da v1 e lembra que os comandos de linha fazem o resto.

```text
╭─ Ajuda ──────────────────────────────────────────────────────────────────────────╮
│                                                                                  │
│ ↑ ↓  k j      mover o foco na fila                                               │
│ PgUp PgDn     rolar uma página                                                   │
│ g  G          primeiro e último item                                             │
│ Enter         check-in do item em foco                                           │
│ 1–5           reavaliar a dificuldade                                            │
│ i             abrir o detalhe                                                    │
│ s             abrir o painel de stats                                            │
│ Esc           fechar painel ou cancelar                                          │
│ ?             esta ajuda                                                         │
│ q             sair                                                               │
│ Ctrl-C        sair com 130                                                       │
│                                                                                  │
│ Os comandos de linha fazem o resto: add, edit, archive, cold, stats.             │
│ Esc · ? · q para fechar                                                          │
│                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

## Stats

O painel do `s` na fila: streak de fila zerada, contagens de hoje e por status e o recorte por matéria. Abre e fecha com `s`, `Esc` ou `q`, inclusive na fila vazia.

```text
╭─ Stats ──────────────────────────────────────────────────────────────────────────╮
│                                                                                  │
│ Streak de fila zerada                                                            │
│ 4 dias        último dia 2026-09-24                                              │
│                                                                                  │
│ Hoje             3 check-ins              Ativos         12                      │
│ Atrasados        8                        Arquivados     3                       │
│ Para hoje        4                        Arquivo morto  1                       │
│                                                                                  │
│ Por matéria      Cálculo 3 · Inglês 2 · Biologia 2 · Física 2 · Química 1        │
│                                                                                  │
│ s · Esc · q fecha                                                                │
│                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────╯
```

## Sem cor

Com --no-color ou NO_COLOR: o atraso vira !, a matéria perde o tom e nada deixa de ser legível.

```text
Fila de hoje — 2026-09-28
────────────────────────────────────────────────────────────────────────────────────
Atrasados (8)
> 1.  [Cálculo]      Derivadas parciais         ! venceu 2026-08-22 (37d)   d4  n=2
  2.  [Estruturas …] Árvores balanceadas AVL    ! venceu 2026-09-07 (21d)   d5  n=0
  3.  [Inglês]       Phrasal verbs              ! venceu 2026-09-14 (14d)   d3  n=1
  4.  [Física]       Leis de Newton             ! venceu 2026-09-18 (10d)   d2  n=3
  5.  [História]     Revolução Industrial       ! venceu 2026-09-22 (6d)    d3  n=2
  6.  [Português]    Crase e regência verbal    ! venceu 2026-09-24 (4d)    d2  n=5
  7.  [Biologia]     Ciclo de Krebs e fosfori…  ! venceu 2026-09-27 (1d)    d4  n=4
  8.  [Cálculo]      Integrais por partes       ! venceu 2026-09-25 (3d)    d5  n=1

Hoje (4)
  9.  [Cálculo]      Séries de Taylor             vence hoje                d4  n=1
  10. [Química]      Estequiometria               vence hoje                d3  n=0
  11. [Estruturas …] Grafos: caminho mínimo       vence hoje                d5  n=2
  12. [Inglês]       Reported speech              vence hoje                d2  n=6
────────────────────────────────────────────────────────────────────────────────────
Enter revisar · i detalhe · ? ajuda · q sair                8 atrasados, 4 para hoje
```

## Terminal estreito

Abaixo de 60×15 a TUI pede uma janela maior em vez de desenhar quebrado.

```text
Terminal pequeno: 46 × 12

Aumente a janela para pelo menos
60 colunas e 15 linhas.
```
