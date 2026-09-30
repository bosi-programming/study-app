import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { type Deps, addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import {
  type OpenContextOptions,
  type OpenedContext,
  openContext,
} from '../../src/context.ts'
import { type Store } from '../../src/persistence/index.ts'
import { type SessionOptions, openSession } from '../../src/tui/session.ts'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { seed, withStore } from '../commands/helpers.ts'

const SESSION_SOURCE = resolve(import.meta.dirname, '../../src/tui/session.ts')

function fakeDeps(start: string): { deps: Deps; setToday: (today: string) => void } {
  let today = start
  let counter = 0
  return {
    deps: {
      clock: {
        nowUtc: () => `${today}T12:00:00Z`,
        todayLocalDate: () => today,
      },
      ids: () => `gen-${++counter}`,
    },
    setToday: (next) => {
      today = next
    },
  }
}

function sessionOptions(dbPath: string, deps: Deps): SessionOptions {
  return { dbPath, exportDir: undefined, deps }
}

function archive(dbPath: string, id: string, at: string): void {
  withStore(dbPath, (store) => {
    const item = store.getItem(id)
    if (item === null) return
    store.saveItem({ ...item, status: 'archived', archived_at: `${at}T12:00:00Z` })
  })
}

function recordingOpen(calls: string[]): (options: OpenContextOptions) => OpenedContext {
  return (options: OpenContextOptions): OpenedContext => {
    const opened = openContext(options)
    return {
      ...opened,
      store: {
        ...opened.store,
        transaction: <T>(run: () => T): T => {
          calls.push('transaction')
          return opened.store.transaction(run)
        },
      },
    }
  }
}

function failOnceOpen(): {
  open: (options: OpenContextOptions) => OpenedContext
  arm: () => void
} {
  let armed = false
  return {
    arm: () => {
      armed = true
    },
    open: (options) => {
      const opened = openContext(options)
      return {
        ...opened,
        store: {
          ...opened.store,
          transaction: <T>(run: () => T): T => {
            if (armed) {
              armed = false
              throw new Error('disco cheio')
            }
            return opened.store.transaction(run)
          },
        },
      }
    },
  }
}

function failingReadOpen(): (options: OpenContextOptions) => OpenedContext {
  return (options) => {
    const opened = openContext(options)
    const store: Store = {
      ...opened.store,
      dueItems: () => {
        throw new Error('store fora do ar')
      },
    }
    return { ...opened, store }
  }
}

describe('AC1 — o estado da sessão', () => {
  it('session-estado-inicial: abre com a fila relida, o foco no primeiro atrasado e o streak', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'late', due_date: addDays(today, -2) }),
          makeItem({ id: 'due', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      const state = session.state()
      try {
        expect(state.today).toBe(today)
        expect(state.screen).toBe('queue')
        expect(state.queue.map((item) => item.id)).toEqual(['late', 'due'])
        expect(state.focusId).toBe('late')
        expect(state.streak).toEqual({ streak_current: 0, streak_last_day: today })
        expect(state.banner).toBeNull()
        expect(state.fatal).toBeNull()
      } finally {
        session.close()
      }
    })
  })

  it('session-foco-primeiro-atrasado-ou-hoje: sem atraso foca o primeiro de hoje; fila vazia zera', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'due', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(session.state().focusId).toBe('due')
      } finally {
        session.close()
      }
    })

    withDb((dbPath) => {
      const clock = fakeDeps('2026-09-20')
      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(session.state().focusId).toBeNull()
      } finally {
        session.close()
      }
    })
  })

  it('session-estado-e-dado-puro: o estado é serializável e o módulo não toca no terminal', () => {
    withDb((dbPath) => {
      const clock = fakeDeps('2026-09-20')
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: '2026-09-20' })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        const state = session.state()
        expect(JSON.parse(JSON.stringify(state))).toEqual(state)
      } finally {
        session.close()
      }

      const source = readFileSync(SESSION_SOURCE, 'utf8')
      expect(source).not.toContain('process.stdin')
      expect(source).not.toContain('process.stdout')
      expect(source).not.toContain('setRawMode')
      expect(source).not.toContain('SIGWINCH')
    })
  })
})

describe('AC2 — os ganchos na abertura e a cada ação', () => {
  it('session-ganchos-na-abertura: abre rodando a migração e o streak de entrada', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({
            id: 'a-1',
            status: 'archived',
            archived_at: `${addDays(today, -181)}T12:00:00Z`,
          }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(session.state().streak.streak_last_day).toBe(today)
        expect(session.state().banner?.kind).toBe('info')
        withStore(dbPath, (store) => {
          expect(store.getItem('a-1')?.status).toBe('cold')
        })
        expect(existsSync(join(dirname(dbPath), 'exports', `cold-archive-${today}.json`))).toBe(
          true,
        )
      } finally {
        session.close()
      }
    })
  })

  it('session-ganchos-apos-navegacao: a navegação roda entrada e saída e o streak fica idempotente', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: today })] })
      const calls: string[] = []

      const session = openSession({
        ...sessionOptions(dbPath, clock.deps),
        open: recordingOpen(calls),
      })
      try {
        const before = session.state().streak
        calls.length = 0
        session.applyAction({ kind: 'focus-next' })

        expect(session.state().streak).toEqual(before)
        expect(calls.filter((call) => call === 'transaction')).toHaveLength(2)
      } finally {
        session.close()
      }
    })
  })

  it('session-ganchos-apos-check-in: o check-in roda a saída e esvaziar a fila carimba o dia', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: today })] })
      const calls: string[] = []

      const session = openSession({
        ...sessionOptions(dbPath, clock.deps),
        open: recordingOpen(calls),
      })
      try {
        calls.length = 0
        session.applyAction({ kind: 'check-in' })

        expect(session.state().queue).toEqual([])
        expect(session.state().streak.streak_last_day).toBe(today)
        expect(calls.filter((call) => call === 'transaction')).toHaveLength(3)
      } finally {
        session.close()
      }
    })
  })

  it('session-ganchos-na-ordem: a ordem observável é migração → entrada → ação → saída', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({
            id: 'cold',
            status: 'archived',
            archived_at: `${addDays(today, -181)}T12:00:00Z`,
          }),
          makeItem({ id: 'due', due_date: today }),
        ],
      })
      const calls: string[] = []

      const session = openSession({
        ...sessionOptions(dbPath, clock.deps),
        open: (options) => {
          const opened = openContext(options)
          const store: Store = {
            ...opened.store,
            saveItem: (item) => {
              calls.push('saveItem')
              opened.store.saveItem(item)
            },
            setMeta: (key, value) => {
              calls.push(`setMeta:${key}`)
              opened.store.setMeta(key, value)
            },
          }
          return { ...opened, store }
        },
      })
      try {
        expect(session.state().banner?.kind).toBe('info')
        withStore(dbPath, (store) => {
          expect(store.getItem('cold')?.status).toBe('cold')
        })

        calls.length = 0
        session.applyAction({ kind: 'check-in' })

        const entry = calls.indexOf('setMeta:streak_current')
        const action = calls.findIndex((call, index) => call === 'saveItem' && index > entry)
        const exit = calls.indexOf('setMeta:streak_current', entry + 1)
        expect(entry).toBeGreaterThanOrEqual(0)
        expect(action).toBeGreaterThan(entry)
        expect(exit).toBeGreaterThan(action)
      } finally {
        session.close()
      }
    })
  })
})

describe('AC3 — a virada do dia antes de cada desenho', () => {
  it('session-virada-do-dia-antes-do-desenho: beforeRender recalcula hoje, relê a fila e reprocessa o streak', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const next = addDays(today, 1)
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        withStore(dbPath, (store) => {
          store.saveItem(makeItem({ id: 'b', due_date: next }))
        })
        clock.setToday(next)

        const state = session.beforeRender()

        expect(state.today).toBe(next)
        expect(state.queue.map((item) => item.id)).toEqual(['a', 'b'])
        expect(state.streak.streak_last_day).toBe(next)
      } finally {
        session.close()
      }
    })
  })

  it('session-virada-preserva-foco-por-id: o foco acompanha o mesmo item pela reordenação', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', due_date: addDays(today, -1) }),
          makeItem({ id: 'B', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(session.state().focusId).toBe('A')
        withStore(dbPath, (store) => {
          store.saveItem(makeItem({ id: 'C', due_date: addDays(today, -2) }))
        })
        clock.setToday(addDays(today, 1))

        expect(session.beforeRender().focusId).toBe('A')
      } finally {
        session.close()
      }
    })
  })

  it('session-virada-clampa-item-fora-da-fila: um item que saiu da fila clampa o foco', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', due_date: addDays(today, -1) }),
          makeItem({ id: 'B', due_date: today }),
          makeItem({ id: 'C', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(session.state().focusId).toBe('A')
        archive(dbPath, 'A', today)
        clock.setToday(addDays(today, 1))

        expect(session.beforeRender().focusId).toBe('B')
      } finally {
        session.close()
      }
    })
  })

  it('session-acao-trata-a-virada: a ação detecta o dia novo sem beforeRender', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const next = addDays(today, 1)
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'a', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        withStore(dbPath, (store) => {
          store.saveItem(makeItem({ id: 'b', due_date: next }))
        })
        clock.setToday(next)

        const state = session.applyAction({ kind: 'focus-next' })

        expect(state.today).toBe(next)
        expect(state.queue.map((item) => item.id)).toEqual(['a', 'b'])
      } finally {
        session.close()
      }
    })
  })

  it('session-sem-virada-nao-rele: no mesmo dia o desenho mantém o último read', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', title: 'antigo', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        const before = session.state()
        withStore(dbPath, (store) => {
          store.saveItem(makeItem({ id: 'A', title: 'novo', due_date: today }))
        })

        const after = session.beforeRender()

        expect(after).toBe(before)
        expect(after.queue[0]?.title).toBe('antigo')
      } finally {
        session.close()
      }
    })
  })
})

describe('AC4 — cada ação relê o store', () => {
  it('session-acao-rele-o-store: uma escrita externa aparece depois da ação', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', title: 'antigo', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        withStore(dbPath, (store) => {
          store.saveItem(makeItem({ id: 'A', title: 'novo', due_date: today }))
        })
        session.applyAction({ kind: 'focus-next' })

        expect(session.state().queue[0]?.title).toBe('novo')
      } finally {
        session.close()
      }
    })
  })

  it('session-foco-por-id-clampa: um foco que saiu da fila clampa e a fila vazia zera', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', due_date: today }),
          makeItem({ id: 'B', due_date: today }),
          makeItem({ id: 'C', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(session.state().focusId).toBe('A')
        archive(dbPath, 'A', today)
        session.applyAction({ kind: 'toggle-help' })

        expect(session.state().focusId).toBe('B')
      } finally {
        session.close()
      }
    })

    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        archive(dbPath, 'A', today)
        session.applyAction({ kind: 'toggle-help' })

        expect(session.state().focusId).toBeNull()
      } finally {
        session.close()
      }
    })
  })

  it('session-check-in-usa-linha-fresca: a dificuldade mudada por outro processo entra no cálculo', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 4, due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        withStore(dbPath, (store) => {
          store.saveItem(makeItem({ id: 'A', difficulty: 5, due_date: today }))
        })
        session.applyAction({ kind: 'check-in' })

        withStore(dbPath, (store) => {
          const item = store.getItem('A')
          expect(item?.interval_days).toBe(4)
          expect(item?.due_date).toBe(addDays(today, 4))
          expect(store.listReviewLogs('A')).toHaveLength(1)
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-reavaliacao-item-fora-da-fila-cancelada: reavaliar item fora da fila não escreve', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 3, due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'start-reevaluate' })
        expect(session.state().reevaluation?.itemId).toBe('A')

        archive(dbPath, 'A', today)
        session.applyAction({ kind: 'reevaluate', difficulty: 5 })

        expect(session.state().reevaluation).toBeNull()
        withStore(dbPath, (store) => {
          expect(store.getItem('A')?.difficulty).toBe(3)
          expect(store.listReviewLogs('A')).toEqual([])
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-detalhe-segue-o-foco: o detalhe re-aponta com o foco e fecha quando a fila esvazia', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', due_date: today }),
          makeItem({ id: 'B', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'open-detail' })
        expect(session.state().screen).toBe('detail')
        expect(session.state().detailItemId).toBe('A')

        session.applyAction({ kind: 'focus-next' })
        expect(session.state().detailItemId).toBe('B')

        archive(dbPath, 'A', today)
        archive(dbPath, 'B', today)
        session.applyAction({ kind: 'focus-next' })

        expect(session.state().focusId).toBeNull()
        expect(session.state().screen).toBe('queue')
        expect(session.state().detailItemId).toBeNull()
      } finally {
        session.close()
      }
    })
  })

  it('session-foco-anterior: prev anda para trás e clampa na primeira posição', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', due_date: today }),
          makeItem({ id: 'B', due_date: today }),
          makeItem({ id: 'C', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'focus-next' })
        expect(session.state().focusId).toBe('B')
        session.applyAction({ kind: 'focus-prev' })
        expect(session.state().focusId).toBe('A')
        session.applyAction({ kind: 'focus-prev' })
        expect(session.state().focusId).toBe('A')
      } finally {
        session.close()
      }
    })
  })

  it('session-foco-limites: first e last vão às pontas da fila', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', due_date: today }),
          makeItem({ id: 'B', due_date: today }),
          makeItem({ id: 'C', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'focus-last' })
        expect(session.state().focusId).toBe('C')
        session.applyAction({ kind: 'focus-first' })
        expect(session.state().focusId).toBe('A')
      } finally {
        session.close()
      }
    })
  })

  it('session-fecha-o-detalhe: close-detail volta para a fila e limpa o detalhe', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'open-detail' })
        session.applyAction({ kind: 'close-detail' })

        expect(session.state().screen).toBe('queue')
        expect(session.state().detailItemId).toBeNull()
      } finally {
        session.close()
      }
    })
  })

  it('session-cancela-reavaliacao: cancel-reevaluate volta para a fila sem escrever', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 3, due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'start-reevaluate' })
        session.applyAction({ kind: 'cancel-reevaluate' })

        expect(session.state().screen).toBe('queue')
        expect(session.state().reevaluation).toBeNull()
        withStore(dbPath, (store) => {
          expect(store.getItem('A')?.difficulty).toBe(3)
          expect(store.listReviewLogs('A')).toEqual([])
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-sem-cache-entre-acoes: uma mudança depois do último read só aparece na próxima ação', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', title: 'antigo', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        withStore(dbPath, (store) => {
          store.saveItem(makeItem({ id: 'A', title: 'novo', due_date: today }))
        })
        expect(session.state().queue[0]?.title).toBe('antigo')

        session.applyAction({ kind: 'focus-next' })
        expect(session.state().queue[0]?.title).toBe('novo')
      } finally {
        session.close()
      }
    })
  })
})

describe('AC5 — a falha de escrita não derruba a sessão', () => {
  it('session-falha-de-escrita-vira-aviso: a ação não avança e o estado anterior permanece', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      const failOnce = failOnceOpen()
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession({ ...sessionOptions(dbPath, clock.deps), open: failOnce.open })
      try {
        const before = session.state()
        failOnce.arm()
        const after = session.applyAction({ kind: 'check-in' })

        expect(after.banner?.kind).toBe('warning')
        expect(after.banner?.message).toContain('disco cheio')
        expect(after.fatal).toBeNull()
        expect(after.queue).toEqual(before.queue)
        expect(after.focusId).toEqual(before.focusId)
        withStore(dbPath, (store) => {
          expect(store.getItem('A')?.review_count).toBe(0)
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-falha-nao-derruba-a-sessao: a ação seguinte limpa o aviso e funciona', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      const failOnce = failOnceOpen()
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession({ ...sessionOptions(dbPath, clock.deps), open: failOnce.open })
      try {
        failOnce.arm()
        session.applyAction({ kind: 'check-in' })
        expect(session.state().banner?.kind).toBe('warning')

        const after = session.applyAction({ kind: 'check-in' })
        expect(after.banner).toBeNull()
        expect(after.queue).toEqual([])
        withStore(dbPath, (store) => {
          expect(store.getItem('A')?.review_count).toBe(1)
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-frame-anterior-permanece: no erro o estado é o frame anterior mais o aviso', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      const failOnce = failOnceOpen()
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession({ ...sessionOptions(dbPath, clock.deps), open: failOnce.open })
      try {
        const before = session.state()
        failOnce.arm()
        const after = session.applyAction({ kind: 'check-in' })

        expect(after.today).toBe(before.today)
        expect(after.screen).toBe(before.screen)
        expect(after.queue).toEqual(before.queue)
        expect(after.focusId).toBe(before.focusId)
        expect(after.detailItemId).toBe(before.detailItemId)
        expect(after.reevaluation).toEqual(before.reevaluation)
        expect(after.streak).toEqual(before.streak)
        expect(after.fatal).toBeNull()
        expect(after.banner?.kind).toBe('warning')
      } finally {
        session.close()
      }
    })
  })

  it('session-falha-fatal-expoe-erro: a releitura que lança marca fatal e a sessão não sai sozinha', () => {
    withDb((dbPath) => {
      const clock = fakeDeps('2026-09-20')
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: '2026-09-20' })] })

      const session = openSession({ ...sessionOptions(dbPath, clock.deps), open: failingReadOpen() })
      try {
        expect(session.state().fatal?.message).toContain('store fora do ar')
        expect(() => session.close()).not.toThrow()
        expect(session.state().fatal?.message).toContain('store fora do ar')
      } finally {
        session.close()
      }
    })
  })
})

describe('AC6 — duas instâncias sob WAL', () => {
  it('session-duas-instancias-veem-a-escrita-na-proxima-acao: a escrita alheia aparece na releitura', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'X', due_date: today })] })

      const a = openSession(sessionOptions(dbPath, clock.deps))
      const b = openSession(sessionOptions(dbPath, clock.deps))
      try {
        a.applyAction({ kind: 'check-in' })

        expect(b.state().queue.map((item) => item.id)).toEqual(['X'])

        b.applyAction({ kind: 'focus-next' })
        expect(b.state().queue).toEqual([])
        expect(b.state().focusId).toBeNull()
      } finally {
        a.close()
        b.close()
      }
    })
  })

  it('session-duas-instancias-foco-clampa-na-escrita-alheia: a escrita alheia clampa o foco', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'X', due_date: today }),
          makeItem({ id: 'Y', due_date: today }),
        ],
      })

      const b = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(b.state().focusId).toBe('X')
        archive(dbPath, 'X', today)

        b.applyAction({ kind: 'focus-next' })
        expect(b.state().focusId).toBe('Y')
      } finally {
        b.close()
      }
    })
  })

  it('session-duas-escritas-sem-busy: duas instâncias escrevem sem SQLITE_BUSY', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'X', due_date: today }),
          makeItem({ id: 'Y', due_date: today }),
        ],
      })

      const a = openSession(sessionOptions(dbPath, clock.deps))
      const b = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(() => a.applyAction({ kind: 'check-in' })).not.toThrow()
        expect(() => b.applyAction({ kind: 'check-in' })).not.toThrow()

        withStore(dbPath, (store) => {
          expect(store.listReviewLogs()).toHaveLength(2)
        })
      } finally {
        a.close()
        b.close()
      }
    })
  })
})
