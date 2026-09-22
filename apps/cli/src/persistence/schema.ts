export const BUSY_TIMEOUT_MS = 5_000

export const SCHEMA_SQL = `CREATE TABLE items (
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
);`

export const PRAGMAS = [
  'PRAGMA foreign_keys = ON',
  'PRAGMA journal_mode = WAL',
  `PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`,
  'PRAGMA synchronous = NORMAL',
]