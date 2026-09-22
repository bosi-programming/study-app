import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { openStore } from '../../src/persistence/store.ts'
import { PRAGMAS } from '../../src/persistence/schema.ts'
import { withDb } from './helpers/db.ts'

describe('store schema', () => {
  it('applies the canonical DDL to a fresh database', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const db = new DatabaseSync(dbPath)
        try {
          const names = db
            .prepare(
              `SELECT name FROM sqlite_master
                 WHERE type IN ('table', 'index') AND name NOT LIKE 'sqlite_%'
                 ORDER BY name`,
            )
            .all()
            .map((row) => String(row.name))
          expect(names).toEqual([
            'cold_archive',
            'idx_items_due',
            'idx_items_subject',
            'idx_items_title',
            'idx_review_logs_item',
            'items',
            'meta',
            'review_logs',
          ])
        } finally {
          db.close()
        }
      } finally {
        store.close()
      }
    })
  })

  it('fixes the engine pragmas, journal_mode persisting at file level', () => {
    expect(PRAGMAS).toEqual([
      'PRAGMA foreign_keys = ON',
      'PRAGMA journal_mode = WAL',
      'PRAGMA busy_timeout = 5000',
      'PRAGMA synchronous = NORMAL',
    ])
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        const db = new DatabaseSync(dbPath)
        try {
          const journal = String(db.prepare('PRAGMA journal_mode').get()?.journal_mode)
          expect(journal).toBe('wal')
        } finally {
          db.close()
        }
      } finally {
        store.close()
      }
    })
  })

  it('seeds meta.schema_version = 1 on a fresh database', () => {
    withDb((dbPath) => {
      const store = openStore(dbPath)
      try {
        expect(store.schemaVersion()).toBe(1)
      } finally {
        store.close()
      }
    })
  })

  it('never re-applies DDL nor touches data when the database already exists', () => {
    withDb((dbPath) => {
      const first = openStore(dbPath)
      first.setMeta('marker', 'survive')
      first.close()

      const second = openStore(dbPath)
      try {
        expect(second.getMeta('marker')).toBe('survive')
        expect(second.schemaVersion()).toBe(1)
      } finally {
        second.close()
      }
    })
  })
})