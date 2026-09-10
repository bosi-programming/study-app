# CLI — App de Estudo Espaçado

Versão: 1 | Data: 2026-09-09 | Base: `docs/REQUISITOS.md`

## Convenções

- Comando raiz: `study`.
- Banco padrão: `~/Library/Application Support/study-app/study.db`.
- Sobrescrita por `--db <path>` ou variável `STUDY_DB`.
- Saída humana por padrão; `--json` para script e testes de snapshot.
- Exit codes: 0 sucesso, 1 erro de uso, 2 erro de validação, 3 conflito de estado.
- Comandos destrutivos exigem `--yes` ou confirmação interativa.

## Comandos

| Comando | Descrição | Exemplo |
| --- | --- | --- |
| `study init` | cria banco e schema | `study init` |
| `study add` | cria item | `study add "Derivadas parciais" -s Cálculo -d 4 -n "cap. 3"` |
| `study list` | lista itens | `study list -s Cálculo --status active` |
| `study due` | fila do dia | `study due` |
| `study review <id>` | check-in "estudei agora" | `study review 2f1c9c1e` |
| `study show <id>` | detalhe e próximo vencimento | `study show 2f1c9c1e` |
| `study difficulty <id> <1-5>` | reavalia dificuldade | `study difficulty 2f1c9c1e 2` |
| `study archive <id>` | arquiva item | `study archive 2f1c9c1e` |
| `study unarchive <id>` | desarquiva item | `study unarchive 2f1c9c1e` |
| `study archive list` | lista arquivo morto | `study archive list` |
| `study archive restore <id>` | restaura do arquivo morto | `study archive restore 2f1c9c1e` |
| `study archive purge <id>` | remove em definitivo | `study archive purge 2f1c9c1e --yes` |
| `study stats` | métricas do RF-21..RF-23 | `study stats` |
| `study export <path>` | exporta JSON v1 | `study export backup.json` |
| `study import <path>` | importa JSON v1 | `study import backup.json` |

## Flags

| Flag | Aplica a | Efeito |
| --- | --- | --- |
| `-s, --subject <nome>` | add, list, due, stats | filtra ou define matéria |
| `-d, --difficulty <1-5>` | add | dificuldade inicial, obrigatória |
| `-n, --note <texto>` | add | nota opcional |
| `-l, --link <url>` | add | link opcional |
| `--status <active|archived|cold>` | list | filtra status |
| `--json` | todos | saída JSON estável para testes |
| `--db <path>` | todos | caminho do banco |
| `--yes` | purge, import | pula confirmação |

## Saídas esperadas

### `study due`

```
Fila de hoje — 2026-09-09

Atrasados (2)
  1. [Cálculo] Derivadas parciais       venceu 2026-09-06 (3d)   d4  n=2
  2. [Inglês] Phrasal verbs             venceu 2026-09-08 (1d)   d3  n=1

Hoje (1)
  3. [Cálculo] Integrais por partes     vence 2026-09-09         d5  n=0

2 atrasados, 1 para hoje.
```

### `study review <id>`

```
Check-in registrado: Derivadas parciais
Próximo vencimento: 2026-09-18 (intervalo 12d, n=3)
```

### `study stats`

```
Streak de fila zerada: 4 dias
Ativos: 12   Arquivados: 3   Arquivo morto: 1
Check-ins hoje: 3   Total por matéria: Cálculo 8, Inglês 4
```

## Erros

| Situação | Exit | Mensagem |
| --- | --- | --- |
| Item não encontrado | 1 | `item não encontrado: <id>` |
| Dificuldade fora de 1–5 | 2 | `dificuldade inválida: use 1 a 5` |
| Check-in em arquivado | 3 | `item arquivado; use study unarchive <id>` |
| Purga sem confirmação | 2 | `purge exige --yes` |
| Import com schema futuro | 2 | `schema_version 2 não suportado` |

## Notas de implementação

- Avaliar `node:sqlite` (built-in no Node 24) vs `better-sqlite3` na fase 1.
- Formatação de tabela com largura fixa na V1; sem cores obrigatórias.
- `--json` é o contrato usado pelos testes de snapshot do CLI.
