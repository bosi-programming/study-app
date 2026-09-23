# CLI — App de Estudo Espaçado

Versão: 3 | Data: 2026-09-20 | Base: `docs/especificacao/REQUISITOS.md`

## Convenções

- Comando raiz: `study`.
- Banco padrão por SO:
  - macOS: `~/Library/Application Support/study-app/study.db`
  - Linux: `$XDG_DATA_HOME/study-app/study.db`, fallback `~/.local/share/study-app/study.db`
  - Windows: `%APPDATA%\study-app\study.db`
- Sobrescrita por `--db <path>` ou variável `STUDY_DB`; diretórios-pai são criados quando faltarem.
- Saída humana por padrão; `--json` para script e testes de snapshot.
- Prompts vão para o stderr; resultado vai para o stdout.
- Comandos destrutivos exigem a flag de confirmação: `--yes` em `remove`, `cold purge` e `init --reset`.

### Exit codes

| Código | Significado | Exemplos |
| --- | --- | --- |
| 0 | sucesso | — |
| 1 | uso: falta flag obrigatória ou argumento inválido | `remove` sem `--yes`; `-d` ausente sem terminal |
| 2 | validação: valor fora do domínio | dificuldade 7; `--status` inválido; schema futuro |
| 3 | estado ou ambiente: algo impede a operação | referência não encontrada ou ambígua; check-in em arquivado; backup do init falhou |

### Referências de item

Todo comando que recebe um item aceita `<ref>`, resolvido nesta ordem:

1. UUID exato.
2. Prefixo único de 4 ou mais caracteres.
3. Título exato, comparado sem diferenciar maiúsculas e acentos.

Qualquer ambiguidade é erro de estado (exit 3) e lista os candidatos com id, matéria e vencimento. O CLI nunca escolhe sozinho.

### Prompts

- Prompts só acontecem com terminal interativo.
- `--json`, stdin não-TTY ou `--no-input` desligam todo prompt; nesse caso o valor tem que vir por flag, senão exit 1.
- `edit` nunca pergunta: só aceita flags.
- `add` pergunta apenas a dificuldade ausente; matéria continua obrigatória por flag.
- `review` pergunta a dificuldade depois de registrar o check-in.

## Comandos

| Comando | Descrição | Exemplo |
| --- | --- | --- |
| `study init` | cria banco e schema; com banco existente pergunta e exige confirmação reforçada | `study init` |
| `study add` | cria item; sem `-d` pergunta a dificuldade | `study add "Derivadas parciais" -s Cálculo -d 4 -n "cap. 3"` |
| `study list` | lista itens | `study list -s Cálculo --status active` |
| `study find` | busca por substring no título | `study find derivada` |
| `study due` | fila do dia com recorte por matéria | `study due` |
| `study review <ref>` | check-in e avaliação da dificuldade | `study review 2f1c9c1e` |
| `study show <ref>` | detalhe, próximo vencimento e histórico | `study show 2f1c9c1e --history` |
| `study edit <ref>` | edita título, matéria, nota, link ou dificuldade | `study edit 2f1c9c1e -d 2` |
| `study remove <ref>` | remove em definitivo, sem passar pelo arquivo morto | `study remove 2f1c9c1e --yes` |
| `study difficulty <ref> <1-5>` | reavalia a dificuldade | `study difficulty 2f1c9c1e 2` |
| `study archive <ref>` | arquiva item | `study archive 2f1c9c1e` |
| `study unarchive <ref>` | desarquiva item | `study unarchive 2f1c9c1e` |
| `study cold list` | visão do arquivo morto, com data de migração | `study cold list` |
| `study cold restore <ref>` | restaura do arquivo morto | `study cold restore 2f1c9c1e` |
| `study cold purge <ref>` | remove em definitivo do arquivo morto | `study cold purge 2f1c9c1e --yes` |
| `study config get <chave>` | lê uma configuração | `study config get cold_archive_after_days` |
| `study config set <chave> <valor>` | altera uma configuração | `study config set cold_archive_after_days 90` |
| `study stats` | métricas do RF-21..RF-23 | `study stats` |
| `study export <path>` | exporta JSON v1 | `study export backup.json` |
| `study import <path>` | importa JSON v1 | `study import backup.json` |

`study list --status cold` é o filtro genérico (mesmas colunas de `list`); `study cold list` é a visão do ciclo de vida, com `cold_archived_at` e o agrupamento de `restore`/`purge`.

## Flags

| Flag | Aplica a | Efeito |
| --- | --- | --- |
| `-s, --subject <nome>` | add, list, due, find, stats | filtra ou define matéria |
| `-d, --difficulty <1-5>` | add, edit, review | dificuldade; em `review` define o valor e pula o prompt |
| `-n, --note <texto>` | add, edit | nota opcional |
| `-l, --link <url>` | add, edit | link opcional |
| `--title <texto>` | edit | novo título |
| `--status <active\|archived\|cold>` | list, find | um único valor; sem a flag, apenas ativos |
| `--history` | show | inclui os check-ins registrados |
| `--reset` | init | autoriza recriar o banco existente |
| `--yes` | remove, cold purge, init --reset | confirma a operação destrutiva |
| `--no-input` | todos | nunca pergunta |
| `--export-dir <path>` | todos | destino do export automático do arquivo morto |
| `--json` | todos | saída JSON estável para testes |
| `--db <path>` | todos | caminho do banco |

## Fluxos com prompt

- `study add` sem `-d` mostra os rótulos 1–5 e lê a dificuldade; valor vazio é inválido.
- `study review` registra o check-in, imprime a confirmação e só então pergunta a dificuldade, pré-preenchida com a atual. Enter mantém; um valor novo recalcula o intervalo com a base nova e o n já incrementado.
- Abortar o prompt depois do check-in (Ctrl-C) mantém o check-in, não altera a dificuldade e encerra com exit 130.
- `study init` com banco existente pergunta; confirmar exige `--reset --yes`, e o banco é exportado para `<data-dir>/backups/pre-reset-<timestamp>.json` antes de ser recriado. Se o backup falhar, o banco não é alterado.

## Arquivo morto

- A checagem roda no início de todo comando, depois de abrir o banco e antes da ação pedida. `--help`, erro de `parseArgs` e `study` sem comando não abrem banco e não migram.
- Itens arquivados há mais que `cold_archive_after_days` (padrão 180) migram com aviso no stderr.
- A conta é estritamente maior e em data local: migra quem tem `daysBetween(dataLocalDe(archived_at), hoje) > janela`. Item `archived` com `archived_at` nulo não migra.
- A migração mantém a linha em `items` com `status = 'cold'` e `cold_archived_at`, e grava um snapshot `{item, review_logs}` em `cold_archive`.
- Cada migração dispara o export automático para `<data-dir>/exports/cold-archive-<YYYY-MM-DD>.json`, sobrescrevível por `--export-dir`.
- O export é escrito **antes** da migração: ele é o backup do estado anterior (ADR-005). O item migrado aparece no arquivo ainda como `archived`, e o snapshot novo de `cold_archive` entra no export da execução seguinte. Duas migrações no mesmo dia sobrescrevem o arquivo com o dump completo, sem merge.
- Se o export falhar, nada migra; o aviso vai para o stderr e o comando em execução segue com a saída normal.
- A migração não bloqueia nem altera a saída do comando em execução.
- `cold restore` volta o item a `active` com o mesmo `n` e a mesma dificuldade, limpa `archived_at`/`cold_archived_at` e apaga a linha de `cold_archive`.
- `cold purge` exige `--yes` e é a única operação destrutiva do arquivo: apaga o item, os seus `ReviewLog` (CASCADE) e a linha de `cold_archive`. O arquivo de export do dia continua no disco.
- `config get|set` cobre só `cold_archive_after_days`. O `set` migra primeiro com a janela antiga e grava a nova depois, então itens que passam a ser elegíveis migram na execução seguinte.

## Contrato `--json`

- Todo comando devolve um único objeto JSON no stdout, com `schema_version: 1` e a chave do comando como raiz.
- Erros vão para o stderr como `{"error":{"code","message"}}`, com o exit code correspondente.
- Chaves em inglês, iguais às do contrato JSON v1 de `docs/especificacao/MODELO-DE-DADOS.md`.

```json
{
  "schema_version": 1,
  "due": {
    "date": "2026-09-12",
    "overdue": [
      { "id": "2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60", "subject": "Cálculo", "days_late": 6 }
    ],
    "today": [],
    "by_subject": { "Cálculo": 2 }
  }
}
```

## Saídas esperadas

### `study due`

```
Fila de hoje — 2026-09-12

Atrasados (2)
  1. [Cálculo] Derivadas parciais       venceu 2026-09-06 (6d)   d4  n=2
  2. [Inglês] Phrasal verbs             venceu 2026-09-08 (4d)   d3  n=1

Hoje (1)
  3. [Cálculo] Integrais por partes     vence hoje              d5  n=0

Por matéria: Cálculo 2, Inglês 1
2 atrasados, 1 para hoje.
```

### `study review <ref>`

```
Check-in registrado: Derivadas parciais
Dificuldade atual: 4 — Enter mantém, ou escolha 1–5:
Próximo vencimento: 2026-09-24 (intervalo 24d, n=3)
```

### `study cold list`

```
ID        Matéria         Título                        Migrado em    Dificuldade  Check-ins
2f1c9c1e  Cálculo         Derivadas parciais            2026-09-01              4          2
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
| Item não encontrado | 3 | `item não encontrado: <ref>` |
| Referência ambígua | 3 | `referência ambígua: <ref>`, seguida da lista de candidatos |
| Dificuldade fora de 1–5 | 2 | `dificuldade inválida: use 1 a 5` |
| Data fora de `YYYY-MM-DD` | 2 | `data inválida: use YYYY-MM-DD` |
| Referência curta demais e sem correspondência | 2 | `referência inválida: use um UUID, um prefixo de 4 ou mais caracteres ou o título exato` |
| Check-in em arquivado | 3 | `item arquivado; use study unarchive <ref>` |
| Check-in em item do arquivo morto | 3 | `item no arquivo morto; use study cold restore <ref>` |
| `archive` repetido | 3 | `item já está arquivado: <ref>` |
| `unarchive` em item ativo | 3 | `item já está ativo: <ref>` |
| `archive`/`unarchive` em item do arquivo morto | 3 | `item no arquivo morto; use study cold restore <ref>` |
| `cold restore`/`cold purge` fora do arquivo morto | 3 | `item não está no arquivo morto: <ref>` |
| `--status` inválido | 2 | `status inválido: use active, archived ou cold` |
| Chave de config desconhecida | 2 | `chave desconhecida: <chave>` |
| Valor de config fora do domínio | 2 | `valor inválido para <chave>: <valor>` |
| Flag de confirmação ausente | 1 | `remove exige --yes` |
| Confirmação ausente na purga | 1 | `cold purge exige --yes` |
| Valor faltando sem terminal | 1 | `-d é obrigatório sem terminal interativo` |
| Export sobre arquivo existente | 1 | `arquivo já existe; use --yes para sobrescrever` |
| Import com schema futuro | 2 | `schema_version 2 não suportado` |
| Backup do init falhou | 3 | `backup falhou; banco não foi alterado` |

## Notas de implementação

- Engine: `node:sqlite` (built-in no Node 24) — ADR-014. `foreign_keys = ON`, `journal_mode = WAL` e `busy_timeout = 5000`; o schema canônico aplica verbatim (`pnpm sqlite:probe`).
- Formatação de tabela com largura fixa na V1; sem cores obrigatórias.
- `--json` é o contrato usado pelos testes de snapshot do CLI.
- A resolução por título usa `title_key` (normalizado) e o índice `idx_items_title`.
- O prompt lê de `/dev/tty` quando disponível, para não consumir stdin redirecionado.
