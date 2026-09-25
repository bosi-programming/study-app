import { addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import { systemDeps } from '../../src/deps.ts'
import { makeItem, makeLog } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import {
  dataOf,
  errorOf,
  jsonOf,
  rebasedDate,
  runStudy,
  seed,
  todayLocalDate,
  withStore,
} from './helpers.ts'

const OLD_INSTANT = '2020-01-01T12:00:00Z'
const FAR_FUTURE_DAYS = 30

type RunResult = Parameters<typeof dataOf>[0]

function statsOf(result: RunResult): Record<string, unknown> {
  return dataOf(result, 'stats')
}

function itemsOfStats(result: RunResult): Record<string, number> {
  return statsOf(result)['items'] as Record<string, number>
}

function streakOfStats(result: RunResult): Record<string, unknown> {
  return statsOf(result)['streak'] as Record<string, unknown>
}

function bySubjectOfStats(result: RunResult): Record<string, number> {
  return statsOf(result)['checkins_by_subject'] as Record<string, number>
}

function seedStreak(dbPath: string, current: number, lastDay: string | null): void {
  withStore(dbPath, (store) => {
    store.setMeta('streak_current', String(current))
    if (lastDay !== null) store.setMeta('streak_last_day', lastDay)
  })
}

function logOn(itemId: string, id: string, reviewedAt: string): ReturnType<typeof makeLog> {
  return makeLog({ id, item_id: itemId, reviewed_at: reviewedAt })
}

describe('AC5 — as contagens de item (RF-22, RN-09)', () => {
  it('stats-contagens-por-status: dois ativos, um arquivado e um cold', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'active-1', subject: 'Cálculo', status: 'active' }),
          makeItem({ id: 'active-2', subject: 'Inglês', status: 'active' }),
          makeItem({ id: 'archived-1', subject: 'Cálculo', status: 'archived' }),
          makeItem({ id: 'cold-1', subject: 'Cálculo', status: 'cold' }),
        ],
      })

      const result = runStudy(['stats', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemsOfStats(result)).toEqual({ active: 2, archived: 1, cold: 1 })
    })
  })

  it('stats-contagem-por-materia: -s recorta as três contagens sem caixa nem acento', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'active-1', subject: 'Cálculo', status: 'active' }),
          makeItem({ id: 'active-2', subject: 'Inglês', status: 'active' }),
          makeItem({ id: 'archived-1', subject: 'Cálculo', status: 'archived' }),
          makeItem({ id: 'cold-1', subject: 'Cálculo', status: 'cold' }),
        ],
      })

      const result = runStudy(['stats', '-s', 'calculo', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(itemsOfStats(result)).toEqual({ active: 1, archived: 1, cold: 1 })
    })
  })
})

describe('AC6 — os check-ins de hoje (RF-23)', () => {
  it('stats-checkins-hoje-local: conta o log do dia local e ignora o de outro dia', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'item-1', due_date: addDays(todayLocalDate(), FAR_FUTURE_DAYS) })],
        logs: [
          logOn('item-1', 'hoje', systemDeps.clock.nowUtc()),
          logOn('item-1', 'antigo', OLD_INSTANT),
        ],
      })

      const result = runStudy(['stats', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(statsOf(result)['checkins_today']).toBe(1)
    })
  })

  it('stats-checkins-hoje-sem-status: o check-in de item arquivado e o de cold contam', () => {
    withDb((dbPath) => {
      const now = systemDeps.clock.nowUtc()
      seed(dbPath, {
        items: [
          makeItem({ id: 'archived-1', subject: 'Cálculo', status: 'archived' }),
          makeItem({ id: 'cold-1', subject: 'Cálculo', status: 'cold' }),
        ],
        logs: [logOn('archived-1', 'log-1', now), logOn('cold-1', 'log-2', now)],
      })

      const result = runStudy(['stats', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(statsOf(result)['checkins_today']).toBe(2)
    })
  })
})

describe('AC7 — o total por matéria (RF-23)', () => {
  const items = [
    makeItem({ id: 'calculo-1', subject: 'Cálculo', due_date: '2026-09-12' }),
    makeItem({ id: 'ingles-1', subject: 'Inglês', due_date: '2026-09-13' }),
    makeItem({ id: 'calculo-2', subject: 'Cálculo', status: 'archived', due_date: '2026-09-14' }),
  ]
  const logs = [
    logOn('calculo-1', 'log-1', OLD_INSTANT),
    logOn('calculo-1', 'log-2', OLD_INSTANT),
    logOn('ingles-1', 'log-3', systemDeps.clock.nowUtc()),
    logOn('calculo-2', 'log-4', OLD_INSTANT),
  ]

  it('stats-total-por-materia: soma todos os status pelo rótulo subject, na ordem dos itens', () => {
    withDb((dbPath) => {
      seed(dbPath, { items, logs })

      const result = runStudy(['stats', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(statsOf(result)['checkins_by_subject']).toEqual({ Cálculo: 3, Inglês: 1 })
    })
  })

  it('stats-total-por-materia-filtro: -s estreita o grupo e os check-ins de hoje', () => {
    withDb((dbPath) => {
      seed(dbPath, { items, logs })

      const result = runStudy(['stats', '-s', 'ingles', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(bySubjectOfStats(result)).toEqual({ Inglês: 1 })
      expect(statsOf(result)['checkins_today']).toBe(1)
    })
  })
})

describe('AC8 — o envelope (RNF-08)', () => {
  it('stats-envelope: o payload é exatamente o contrato de stats', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [makeItem({ id: 'item-1', subject: 'Cálculo', due_date: addDays(today, FAR_FUTURE_DAYS) })],
        logs: [logOn('item-1', 'log-1', systemDeps.clock.nowUtc())],
      })

      const result = runStudy(['stats', '--db', dbPath, '--json'])

      expect(result.status).toBe(0)
      expect(jsonOf(result)).toEqual({
        schema_version: 1,
        stats: {
          date: today,
          streak: { current: 1, last_day: today },
          items: { active: 1, archived: 0, cold: 0 },
          checkins_today: 1,
          checkins_by_subject: { Cálculo: 1 },
        },
      })
    })
  })
})

describe('AC9 — a saída humana (CLI.md)', () => {
  it('stats-saida-humana: as três linhas, na ordem e com os separadores do contrato', () => {
    withDb((dbPath) => {
      seedStreak(dbPath, 4, rebasedDate(todayLocalDate(), -1))
      seed(dbPath, {
        items: [
          makeItem({ id: 'calculo-1', subject: 'Cálculo', due_date: addDays(todayLocalDate(), FAR_FUTURE_DAYS) }),
          makeItem({ id: 'ingles-1', subject: 'Inglês', due_date: addDays(todayLocalDate(), FAR_FUTURE_DAYS + 1) }),
          makeItem({ id: 'arquivado-1', subject: 'Cálculo', status: 'archived' }),
          makeItem({ id: 'morto-1', subject: 'Cálculo', status: 'cold' }),
          makeItem({ id: 'morto-2', subject: 'Inglês', status: 'cold' }),
        ],
        logs: [
          logOn('calculo-1', 'log-1', OLD_INSTANT),
          logOn('calculo-1', 'log-2', OLD_INSTANT),
          logOn('ingles-1', 'log-3', systemDeps.clock.nowUtc()),
        ],
      })

      const result = runStudy(['stats', '--db', dbPath])

      expect(result.stdout).toBe(
        [
          'Streak de fila zerada: 5 dias',
          'Ativos: 2   Arquivados: 1   Arquivo morto: 2',
          'Check-ins hoje: 1   Total por matéria: Cálculo 2, Inglês 1',
          '',
        ].join('\n'),
      )
    })
  })

  it('stats-saida-vazia: banco novo mostra streak 1, zeros e o traço do total', () => {
    withDb((dbPath) => {
      const result = runStudy(['stats', '--db', dbPath])

      expect(result.stdout).toBe(
        [
          'Streak de fila zerada: 1 dias',
          'Ativos: 0   Arquivados: 0   Arquivo morto: 0',
          'Check-ins hoje: 0   Total por matéria: —',
          '',
        ].join('\n'),
      )
    })
  })
})

describe('AC10 — os casos de borda', () => {
  it('stats-banco-novo: banco vazio devolve zeros, streak 1 e as mesmas chaves', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()

      const result = runStudy(['stats', '--db', dbPath, '--json'])

      expect(statsOf(result)).toEqual({
        date: today,
        streak: { current: 1, last_day: today },
        items: { active: 0, archived: 0, cold: 0 },
        checkins_today: 0,
        checkins_by_subject: {},
      })
    })
  })

  it('stats-materia-sem-item: matéria sem item sai 0 com zeros e traço, sem erro', () => {
    withDb((dbPath) => {
      const result = runStudy(['stats', '-s', 'Nada', '--db', dbPath])

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('Ativos: 0   Arquivados: 0   Arquivo morto: 0')
      expect(result.stdout).toContain('Total por matéria: —')
      expect(result.stderr).toBe('')
    })
  })

  it('stats-streak-global-com-filtro: -s não muda o streak', () => {
    withDb((dbPath) => {
      seedStreak(dbPath, 4, rebasedDate(todayLocalDate(), -1))

      const result = runStudy(['stats', '-s', 'Nada', '--db', dbPath, '--json'])

      expect(streakOfStats(result)).toEqual({ current: 5, last_day: todayLocalDate() })
    })
  })
})

describe('AC12 — o uso do comando', () => {
  it('stats-uso: posicional e flag de outro comando saem 1, e o USAGE lista stats', () => {
    withDb((dbPath) => {
      const positional = runStudy(['stats', 'extra', '--db', dbPath, '--json'])
      const foreignFlag = runStudy(['stats', '-d', '4', '--db', dbPath, '--json'])

      expect(positional.status).toBe(1)
      expect(errorOf(positional).code).toBe('usage')
      expect(foreignFlag.status).toBe(1)
      expect(errorOf(foreignFlag).code).toBe('usage')
      expect(runStudy(['--help']).stdout).toMatch(/\bstats\b/)
    })
  })
})
