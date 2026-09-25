import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { makeItem } from './persistence/helpers.ts'
import { withDb } from './persistence/helpers/db.ts'
import { rebasedDate, runStudy, seed, todayLocalDate, withStore } from './commands/helpers.ts'

type StreakMeta = {
  readonly current: string | null
  readonly lastDay: string | null
}

function streakMeta(dbPath: string): StreakMeta {
  return withStore(dbPath, (store) => ({
    current: store.getMeta('streak_current'),
    lastDay: store.getMeta('streak_last_day'),
  }))
}

function seedStreak(dbPath: string, current: number, lastDay: string | null): void {
  withStore(dbPath, (store) => {
    store.setMeta('streak_current', String(current))
    if (lastDay !== null) store.setMeta('streak_last_day', lastDay)
  })
}

function withStreakDb(run: (dbPath: string, today: string) => void): void {
  withDb((dbPath) => run(dbPath, todayLocalDate()))
}

describe('AC2 — o gancho roda antes do comando (RN-14)', () => {
  it('gancho-antes-do-comando: list carimba o dia antes de rodar e o meta fica fresco', () => {
    withStreakDb((dbPath, today) => {
      seedStreak(dbPath, 4, rebasedDate(today, -1))

      const result = runStudy(['list', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(streakMeta(dbPath)).toEqual({ current: '5', lastDay: today })
    })
  })

  it('gancho-mesmo-dia-idempotente: duas execuções no mesmo dia deixam o contador igual', () => {
    withStreakDb((dbPath, today) => {
      seedStreak(dbPath, 4, rebasedDate(today, -1))

      runStudy(['list', '--db', dbPath, '--json'])
      const second = runStudy(['list', '--db', dbPath, '--json'])

      expect(second.status).toBe(0)
      expect(streakMeta(dbPath)).toEqual({ current: '5', lastDay: today })
    })
  })
})

describe('AC3 — o gancho roda depois do comando (RN-14, CA-16)', () => {
  it('gancho-depois-unarchive-vence-hoje: devolver à fila um item vencido zera o dia carimbado', () => {
    withStreakDb((dbPath, today) => {
      seed(dbPath, {
        items: [
          makeItem({
            id: 'unarchive-1',
            status: 'archived',
            archived_at: `${today}T12:00:00Z`,
            due_date: today,
          }),
        ],
      })

      runStudy(['list', '--db', dbPath, '--json'])
      expect(streakMeta(dbPath)).toEqual({ current: '1', lastDay: today })

      const result = runStudy(['unarchive', 'unarchive-1', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(streakMeta(dbPath)).toEqual({ current: '0', lastDay: today })
    })
  })

  it('gancho-depois-review-esvazia-nao-soma: esvaziar a fila no mesmo dia não soma de novo', () => {
    withStreakDb((dbPath, today) => {
      seed(dbPath, { items: [makeItem({ id: 'review-1', due_date: today })] })
      seedStreak(dbPath, 0, today)

      const result = runStudy(['review', 'review-1', '-d', '4', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(streakMeta(dbPath)).toEqual({ current: '0', lastDay: today })
    })
  })
})

describe('AC4 — as isenções (ADR-022)', () => {
  it('gancho-isento-export: export não toca o streak do banco', () => {
    withDb((dbPath) => {
      seedStreak(dbPath, 4, '2026-09-12')

      const result = runStudy(['export', join(dirname(dbPath), 'backup.json'), '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(streakMeta(dbPath)).toEqual({ current: '4', lastDay: '2026-09-12' })
    })
  })

  it('gancho-isento-import: import preserva o streak do arquivo na mesma execução', () => {
    withDb((dbPath) => {
      const dumpPath = join(dirname(dbPath), 'dump.json')
      writeFileSync(
        dumpPath,
        JSON.stringify({
          schema_version: 1,
          exported_at: '2026-09-23T12:00:00Z',
          meta: { streak_current: 4, streak_last_day: '2026-09-12' },
          items: [],
          review_logs: [],
          cold_archive: [],
        }),
      )

      const result = runStudy(['import', dumpPath, '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(streakMeta(dbPath)).toEqual({ current: '4', lastDay: '2026-09-12' })
    })
  })

  it('gancho-isento-init: init --reset --yes recria o banco sem as chaves de streak', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'init-1' })] })
      seedStreak(dbPath, 4, '2026-09-12')

      const result = runStudy(['init', '--reset', '--yes', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(streakMeta(dbPath)).toEqual({ current: null, lastDay: null })
    })
  })
})

