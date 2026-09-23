import { afterAll, describe, expect, it } from 'vitest'
import { InvalidFieldError } from '@study/core'
import { localDateOf } from '../src/deps.ts'

const originalTz = process.env.TZ

afterAll(() => {
  process.env.TZ = originalTz
})

describe('apoio — a base de data local', () => {
  it('localDateOf-converte: o mesmo instante cai em datas locais diferentes por fuso', () => {
    process.env.TZ = 'America/Sao_Paulo'
    expect(localDateOf('2026-09-12T02:00:00Z')).toBe('2026-09-11')
    expect(localDateOf('2026-09-12T12:00:00Z')).toBe('2026-09-12')

    process.env.TZ = 'Asia/Tokyo'
    expect(localDateOf('2026-09-11T20:00:00Z')).toBe('2026-09-12')
    expect(localDateOf('2026-09-12T02:00:00Z')).toBe('2026-09-12')

    process.env.TZ = 'UTC'
    expect(localDateOf('2026-09-12T23:00:00Z')).toBe('2026-09-12')
  })

  it('localDateOf-data-invalida: um instante que não parseia lança invalid-field', () => {
    expect(() => localDateOf('nao-e-data')).toThrow(InvalidFieldError)
    expect(() => localDateOf('')).toThrow(InvalidFieldError)
  })
})
