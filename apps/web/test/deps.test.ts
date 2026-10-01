import { InvalidFieldError } from '@study/core'
import { afterAll, describe, expect, it } from 'vitest'
import { localDateOf, systemClock, systemDeps, systemIds, tryLocalDateOf } from '../src/deps.ts'

const originalTimezone = process.env.TZ
process.env.TZ = 'America/Sao_Paulo'

afterAll(() => {
  process.env.TZ = originalTimezone
})

describe('AC-9 borda de data do web', () => {
  it('deps-converte-o-instant-iso-na-data-local', () => {
    expect(localDateOf('2026-09-30T12:00:00Z')).toBe('2026-09-30')
    expect(localDateOf('2026-10-01T02:30:00Z')).toBe('2026-09-30')
    expect(tryLocalDateOf('2026-10-01T02:30:00Z')).toBe('2026-09-30')
  })

  it('deps-recusa-o-instant-invalido', () => {
    expect(() => localDateOf('nope')).toThrow(InvalidFieldError)
    expect(tryLocalDateOf('nope')).toBeNull()
  })

  it('deps-system-entrega-relogio-e-gerador-de-id', () => {
    expect(systemClock.todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(systemClock.nowUtc()))).toBe(false)
    expect(systemIds()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(systemDeps.clock).toBe(systemClock)
    expect(systemDeps.ids).toBe(systemIds)
  })
})
