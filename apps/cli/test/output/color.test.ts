import { describe, expect, it } from 'vitest'
import { resolveColorEnabled } from '../../src/output/color.ts'
import { rebasedDate, runStudy, seed, todayLocalDate } from '../commands/helpers.ts'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'

const ESC = '\u001b['
const RESET = `${ESC}0m`
const ACCENT = `${ESC}38;2;232;161;59m`
const SUCCESS = `${ESC}38;2;100;200;137m`
const MUTED = `${ESC}38;2;144;155;166m`
const OPTIONS = { json: false, noColor: false }

describe('cor — decisão de ligar a paleta', () => {
  it('cor-tty: só o stdout de terminal liga as cores por padrão', () => {
    expect(resolveColorEnabled({}, true, OPTIONS)).toBe(true)
    expect(resolveColorEnabled({}, false, OPTIONS)).toBe(false)
    expect(resolveColorEnabled({ TERM: 'dumb' }, true, OPTIONS)).toBe(false)
  })

  it('cor-json-e-no-color: os dois desligam mesmo com FORCE_COLOR', () => {
    expect(resolveColorEnabled({}, true, { json: true, noColor: false })).toBe(false)
    expect(resolveColorEnabled({}, true, { json: false, noColor: true })).toBe(false)
    expect(resolveColorEnabled({ FORCE_COLOR: '1' }, true, { json: true, noColor: false })).toBe(
      false,
    )
    expect(resolveColorEnabled({ FORCE_COLOR: '1' }, true, { json: false, noColor: true })).toBe(
      false,
    )
  })

  it('cor-env: FORCE_COLOR vence NO_COLOR e o valor vazio não conta', () => {
    expect(resolveColorEnabled({ NO_COLOR: '1' }, true, OPTIONS)).toBe(false)
    expect(resolveColorEnabled({ NO_COLOR: '' }, true, OPTIONS)).toBe(true)
    expect(resolveColorEnabled({ FORCE_COLOR: '1' }, false, OPTIONS)).toBe(true)
    expect(resolveColorEnabled({ FORCE_COLOR: '1', NO_COLOR: '1' }, false, OPTIONS)).toBe(true)
    expect(resolveColorEnabled({ FORCE_COLOR: '0' }, true, OPTIONS)).toBe(true)
  })
})

describe('cor — a saída humana do bin', () => {
  it('cor-due-paleta: o atrasado sai em âmbar, a seção em negrito e o rodapé em cinza', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [
          makeItem({ id: 'a', title: 'Atrasado', due_date: rebasedDate(todayLocalDate(), -6) }),
        ],
      })

      const stdout = runStudy(['due', '--db', dbPath], { env: { FORCE_COLOR: '1' } }).stdout

      expect(stdout).toContain(`${ESC}1m${ACCENT}Atrasados (1)${RESET}`)
      expect(stdout).toContain(`${ACCENT}venceu `)
      expect(stdout).toContain(`${MUTED}Fila de hoje — `)
      expect(stdout).toContain('Atrasados (1)')
      expect(stdout).toContain('1 atrasados, 0 para hoje.')
    })
  })

  it('cor-hoje-verde: a seção de hoje e o vencimento de hoje saem em verde', () => {
    withDb((dbPath) => {
      const today = todayLocalDate()
      seed(dbPath, {
        items: [makeItem({ id: 'a', title: 'De hoje', due_date: today })],
      })

      const stdout = runStudy(['due', '--db', dbPath], { env: { FORCE_COLOR: '1' } }).stdout

      expect(stdout).toContain(`${ESC}1m${SUCCESS}Hoje (1)${RESET}`)
      expect(stdout).toContain(`${SUCCESS}vence hoje `)
    })
  })

  it('cor-review-verde: o check-in registrado sai em verde e o intervalo em âmbar', () => {
    withDb((dbPath) => {
      seed(dbPath, {
        items: [makeItem({ id: 'a', title: 'Atrasado', due_date: todayLocalDate() })],
      })

      const result = runStudy(['review', 'Atrasado', '-d', '4', '--db', dbPath], {
        env: { FORCE_COLOR: '1' },
      })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain(`${ESC}1m${SUCCESS}Check-in registrado:${RESET}`)
      expect(result.stdout).toContain(`${ACCENT}(intervalo `)
    })
  })

  it('cor-sem-tty: fora do terminal e sem FORCE_COLOR a saída fica sem escapes', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', title: 'Atrasado', due_date: '2026-09-01' })] })

      expect(runStudy(['due', '--db', dbPath]).stdout).not.toContain(ESC)
    })
  })

  it('cor-desligada: --no-color vence FORCE_COLOR e o --json nunca colora', () => {
    withDb((dbPath) => {
      seed(dbPath, { items: [makeItem({ id: 'a', title: 'Atrasado', due_date: '2026-09-01' })] })

      const forced = { env: { FORCE_COLOR: '1' } }
      expect(runStudy(['due', '--db', dbPath, '--no-color'], forced).stdout).not.toContain(ESC)
      expect(runStudy(['due', '--db', dbPath, '--json'], forced).stdout).not.toContain(ESC)
    })
  })

  it('cor-uso-nova-flag: o --help anuncia --no-color', () => {
    const result = runStudy(['--help'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('--no-color')
  })
})
