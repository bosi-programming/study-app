# Modelo de Dados — App de Estudo Espaçado

Versão do schema: 1 | Data: 2026-09-09 | Atualizado: 2026-09-20 | Base: `docs/especificacao/REQUISITOS.md`

O `schema_version` continua em 1: nenhum dado foi publicado, então as colunas novas entram no lugar, sem migração.

## Entidades

### Item

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| id | UUID v4 | sim | chave estável entre plataformas |
| title | string | sim | 1–200 caracteres, sem espaços nas pontas |
| title_key | string | sim | derivado de `title`: trim, sem caixa e sem acentos; usado na resolução por `<ref>` e em `study find` |
| subject | string | sim | 1–60 caracteres, comparação normalizada |
| difficulty | int 1–5 | sim | escala com rótulos no PRD |
| note | string | não | até 10.000 caracteres |
| link | string URL | não | opcional, sem validação estrita na V1 |
| interval_days | int | sim | intervalo atual em dias; inicia no base |
| due_date | date YYYY-MM-DD | sim | vencimento local |
| review_count | int | sim | n de check-ins; nunca decresce |
| on_time_streak | int | sim | check-ins consecutivos no prazo; zera com atraso; histórico, não dispara sugestão |
| status | enum | sim | active, archived, cold |
| last_reviewed_at | timestamp UTC | não | nulo antes do primeiro check-in |
| archived_at | timestamp UTC | não | nulo se nunca arquivado |
| cold_archived_at | timestamp UTC | não | nulo se nunca migrado |
| created_at | timestamp UTC | sim | — |
| updated_at | timestamp UTC | sim | usado para resolver conflito de import |

### ReviewLog

| Campo | Tipo | Obrigatório | Regra |
| --- | --- | --- | --- |
| id | UUID v4 | sim | — |
| item_id | UUID | sim | referência ao Item |
| reviewed_at | timestamp UTC | sim | momento do check-in |
| due_date_at_review | date | sim | vencimento no momento do check-in |
| interval_after | int | sim | intervalo resultante, com teto |
| review_count_after | int | sim | n após o check-in |
| late | boolean | sim | true quando check-in após o vencimento |

### Meta

| Chave | Tipo | Descrição |
| --- | --- | --- |
| schema_version | int | versão do schema/contrato JSON |
| cold_archive_after_days | int | padrão 180, configurável |
| last_cold_archive_export_at | timestamp UTC | controle do export automático |
| locale | string | padrão pt-BR |
| streak_current | int | dias locais consecutivos com fila zerada ao fim do dia |
| streak_last_day | date YYYY-MM-DD | último dia local considerado no cálculo do streak |

## Transições de estado

```
active --archive--> archived --180 dias--> cold
  ^                   |                      |
  +----unarchive------+-----restore----------+
```

- `active` participa de fila e das contagens de ativos.
- `archived` sai da fila e das contagens de ativos; permanece no banco principal.
- `cold` vive em store separado, sai de todas as consultas por padrão.
- `purge` e remoção definitiva só por comando manual; remove Item e seus ReviewLog.

## Schema SQLite (CLI e mobile)

Mesmo schema no CLI (`node:sqlite`, ADR-014) e no mobile (`expo-sqlite`).

```sql
CREATE TABLE items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  title_key TEXT NOT NULL,
  subject TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  note TEXT,
  link TEXT,
  interval_days INTEGER NOT NULL,
  due_date TEXT NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  on_time_streak INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  last_reviewed_at TEXT,
  archived_at TEXT,
  cold_archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_items_due ON items (status, due_date);
CREATE INDEX idx_items_subject ON items (subject_key, status);
CREATE INDEX idx_items_title ON items (title_key);

CREATE TABLE review_logs (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  reviewed_at TEXT NOT NULL,
  due_date_at_review TEXT NOT NULL,
  interval_after INTEGER NOT NULL,
  review_count_after INTEGER NOT NULL,
  late INTEGER NOT NULL
);

CREATE INDEX idx_review_logs_item ON review_logs (item_id, reviewed_at);

CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE cold_archive (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  cold_archived_at TEXT NOT NULL
);
```

## IndexedDB (web e desktop)

| Store | Chave | Índices | Conteúdo |
| --- | --- | --- | --- |
| items | id | status+due_date, subject_key+status | item ativo ou arquivado |
| review_logs | id | item_id+reviewed_at | histórico |
| meta | key | — | config e versão |
| cold_archive | id | cold_archived_at | payload JSON do item |

## Contrato JSON v1

```json
{
  "schema_version": 1,
  "exported_at": "2026-09-09T18:30:00Z",
  "meta": {
    "cold_archive_after_days": 180,
    "locale": "pt-BR",
    "streak_current": 4,
    "streak_last_day": "2026-09-12"
  },
  "items": [
    {
      "id": "2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60",
      "title": "Derivadas parciais",
      "subject": "Cálculo",
      "difficulty": 4,
      "note": "cap. 3 do Stewart",
      "link": null,
      "interval_days": 6,
      "due_date": "2026-09-12",
      "review_count": 2,
      "on_time_streak": 2,
      "status": "active",
      "last_reviewed_at": "2026-09-06T22:10:00Z",
      "created_at": "2026-08-30T09:00:00Z",
      "updated_at": "2026-09-06T22:10:00Z"
    }
  ],
  "review_logs": [
    {
      "id": "9b8a7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d",
      "item_id": "2f1c9c1e-6a1a-4a2e-9f4e-1b2c3d4e5f60",
      "reviewed_at": "2026-09-06T22:10:00Z",
      "due_date_at_review": "2026-09-06",
      "interval_after": 6,
      "review_count_after": 2,
      "late": false
    }
  ],
  "cold_archive": []
}
```

## Migração e compatibilidade

- `schema_version` no topo do JSON e na tabela `meta`.
- `title_key` e `subject_key` são derivados e ficam fora do contrato JSON; são recalculados na importação.
- Import aceita apenas versão igual ou menor, aplicando migrações em ordem.
- Import idempotente por UUID; conflito resolvido por `updated_at` mais recente.
- Export sempre inclui o arquivo morto; purge é a única operação destrutiva.
- Postgres futuro recebe o mesmo schema, com `subject_key` e índices equivalentes.
