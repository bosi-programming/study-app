import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { type Deps, addDays } from '@study/core'
import { describe, expect, it } from 'vitest'
import {
  type ContextHookTarget,
  type OpenContextOptions,
  type OpenedContext,
  openContext,
} from '../../src/context.ts'
import { type Store, openStore } from '../../src/persistence/index.ts'
import { type Session, type SessionOptions, openSession } from '../../src/tui/session/index.ts'
import { dispatch } from '../../src/tui/session/dispatch.ts'
import { type SessionState } from '../../src/tui/session/types.ts'
import { makeItem } from '../persistence/helpers.ts'
import { withDb } from '../persistence/helpers/db.ts'
import { seed, withStore } from '../commands/helpers.ts'

const SESSION_DIR = resolve(import.meta.dirname, '../../src/tui/session')

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

      const source = readdirSync(SESSION_DIR)
        .filter((name) => name.endsWith('.ts'))
        .map((name) => readFileSync(join(SESSION_DIR, name), 'utf8'))
        .join('\n')
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

  it('session-reavaliacao-cancelada-volta-para-a-fila: item que sai da fila cancela a reavaliação e volta para a fila', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [
          makeItem({ id: 'A', difficulty: 3, due_date: today }),
          makeItem({ id: 'B', due_date: today }),
        ],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'start-reevaluate' })
        expect(session.state().reevaluation?.itemId).toBe('A')

        archive(dbPath, 'A', today)
        session.applyAction({ kind: 'focus-next' })

        expect(session.state().reevaluation).toBeNull()
        expect(session.state().screen).toBe('queue')
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

describe('AC10 — a reavaliação após o check-in', () => {
  it('session-checkin-abre-reavaliacao: o check-in abre a reavaliação do item revisado, já fora da fila', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 3, due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        const state = session.applyAction({ kind: 'check-in' })

        expect(state.screen).toBe('reevaluate')
        expect(state.reevaluation).toEqual({ itemId: 'A', currentDifficulty: 3 })
        expect(state.queue.map((item) => item.id)).toEqual([])
        withStore(dbPath, (store) => {
          expect(store.listReviewLogs('A')).toHaveLength(1)
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-reavaliacao-item-ativo-fora-da-fila-escreve: reevaluate grava a dificuldade nova do item ativo que saiu da fila', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 3, due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'check-in' })
        const state = session.applyAction({ kind: 'reevaluate', difficulty: 5 })

        expect(state.reevaluation).toBeNull()
        expect(state.screen).toBe('queue')
        withStore(dbPath, (store) => {
          const item = store.getItem('A')
          expect(item?.difficulty).toBe(5)
          expect(item?.review_count).toBe(1)
          expect(store.listReviewLogs('A')).toHaveLength(1)
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-reavaliacao-item-inativo-cancela: item arquivado limpa a reavaliação e não escreve', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 3, due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'check-in' })
        expect(session.state().reevaluation?.itemId).toBe('A')

        archive(dbPath, 'A', today)
        const state = session.applyAction({ kind: 'reevaluate', difficulty: 5 })

        expect(state.reevaluation).toBeNull()
        expect(state.screen).toBe('queue')
        withStore(dbPath, (store) => {
          expect(store.getItem('A')?.difficulty).toBe(3)
          expect(store.listReviewLogs('A')).toHaveLength(1)
        })
      } finally {
        session.close()
      }
    })
  })

  it('session-reavaliacao-item-removido-cancela: item removido limpa a reavaliação e não escreve', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', difficulty: 3, due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'check-in' })
        withStore(dbPath, (store) => store.deleteItem('A'))

        const state = session.applyAction({ kind: 'reevaluate', difficulty: 5 })

        expect(state.reevaluation).toBeNull()
        expect(state.screen).toBe('queue')
        withStore(dbPath, (store) => {
          expect(store.getItem('A')).toBeNull()
        })
      } finally {
        session.close()
      }
    })
  })
})

function baseSessionState(today: string, overrides: Partial<SessionState> = {}): SessionState {
  return {
    today,
    screen: 'queue',
    queue: [],
    focusId: null,
    detailItemId: null,
    reevaluation: null,
    form: null,
    cold: null,
    items: null,
    config: null,
    path: null,
    confirmation: null,
    streak: { streak_current: 0, streak_last_day: null },
    banner: null,
    fatal: null,
    ...overrides,
  }
}

function typeText(session: Session, text: string): void {
  for (const char of [...text]) session.applyAction({ kind: 'field-insert', text: char })
}

function replaceField(session: Session, text: string): void {
  session.applyAction({ kind: 'field-home' })
  for (let index = 0; index < 80; index += 1) session.applyAction({ kind: 'field-delete' })
  typeText(session, text)
}

describe('AC12 — os comandos de escrita na sessão', () => {
  it('sessao-add-grava-e-rele: o formulario grava pelo createItem e a fila e relida (U-17)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'keep', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        expect(session.applyAction({ kind: 'open-add' }).screen).toBe('form')
        typeText(session, 'Derivadas')
        session.applyAction({ kind: 'form-enter' })
        typeText(session, 'Cálculo')
        session.applyAction({ kind: 'form-enter' })
        typeText(session, '4')
        session.applyAction({ kind: 'form-enter' })
        session.applyAction({ kind: 'form-enter' })
        session.applyAction({ kind: 'form-enter' })

        const state = session.state()
        expect(state.screen).toBe('queue')
        expect(state.banner?.message).toContain('Item criado: Derivadas')
        expect(state.queue.map((item) => item.id)).toEqual(['keep'])
        withStore(dbPath, (store) => {
          const created = store.listItems().find((item) => item.title === 'Derivadas')
          expect(created?.subject).toBe('Cálculo')
          expect(created?.difficulty).toBe(4)
        })
      } finally {
        session.close()
      }
    })
  })

  it('sessao-edit-carrega-e-grava-so-o-que-mudou: abre com os valores atuais (U-18)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, {
        items: [makeItem({ id: 'A', title: 'Antigo', subject: 'Cálculo', difficulty: 4, due_date: today })],
      })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        const opened = session.applyAction({ kind: 'open-edit' })
        expect(opened.screen).toBe('form')
        expect(opened.form?.mode).toBe('edit')
        expect(opened.form?.fields.title.value).toBe('Antigo')
        expect(opened.form?.fields.difficulty.value).toBe('4')

        session.applyAction({ kind: 'form-enter' })
        replaceField(session, 'Álgebra')
        session.applyAction({ kind: 'form-enter' })
        session.applyAction({ kind: 'form-enter' })
        session.applyAction({ kind: 'form-enter' })
        session.applyAction({ kind: 'form-enter' })

        withStore(dbPath, (store) => {
          const item = store.getItem('A')
          expect(item?.subject).toBe('Álgebra')
          expect(item?.title).toBe('Antigo')
          expect(item?.difficulty).toBe(4)
        })
      } finally {
        session.close()
      }
    })
  })

  it('sessao-x-x-arquiva-desarquiva: x e X usam as funcoes do CLI (U-19)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })
      const store = openStore(dbPath)
      try {
        const target: ContextHookTarget = { store, deps: clock.deps, exportDir: null, dbPath }
        const archived = dispatch(target, baseSessionState(today, { focusId: 'A' }), { kind: 'archive' })
        expect(store.getItem('A')?.status).toBe('archived')
        expect(archived.banner?.message).toContain('arquivado')

        const unarchived = dispatch(target, baseSessionState(today, { focusId: 'A' }), { kind: 'unarchive' })
        expect(store.getItem('A')?.status).toBe('active')
        expect(unarchived.banner?.message).toContain('desarquivado')
      } finally {
        store.close()
      }
    })
  })

  it('sessao-remove-confirma: D pede confirmacao e so o y remove (U-20)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        const asked = session.applyAction({ kind: 'request-remove' })
        expect(asked.screen).toBe('confirm')
        expect(asked.confirmation?.message).toContain('Remover')
        withStore(dbPath, (store) => expect(store.getItem('A')).not.toBeNull())

        expect(session.applyAction({ kind: 'confirm-no' }).screen).toBe('queue')
        withStore(dbPath, (store) => expect(store.getItem('A')).not.toBeNull())

        session.applyAction({ kind: 'request-remove' })
        expect(session.applyAction({ kind: 'confirm-yes' }).screen).toBe('queue')
        withStore(dbPath, (store) => expect(store.getItem('A')).toBeNull())
      } finally {
        session.close()
      }
    })
  })

  it('sessao-config-le-e-grava: get desenha e set grava pelo parseColdArchiveWindow (U-22)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        const opened = session.applyAction({ kind: 'open-config' })
        expect(opened.screen).toBe('config')
        expect(opened.config?.field.value).toBe('180')

        session.applyAction({ kind: 'form-enter' })
        replaceField(session, '90')
        const saved = session.applyAction({ kind: 'form-enter' })
        expect(saved.config?.editing).toBe(false)
        expect(saved.banner?.message).toContain('cold_archive_after_days: 90')
        withStore(dbPath, (store) => expect(store.getMeta('cold_archive_after_days')).toBe('90'))

        session.applyAction({ kind: 'form-enter' })
        replaceField(session, 'abc')
        const invalid = session.applyAction({ kind: 'form-enter' })
        expect(invalid.banner?.kind).toBe('warning')
        expect(invalid.config?.editing).toBe(true)
        withStore(dbPath, (store) => expect(store.getMeta('cold_archive_after_days')).toBe('90'))
      } finally {
        session.close()
      }
    })
  })

  it('sessao-export-import: o caminho digitado chama dumpJsonV1 e applyDump (U-23)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      const exportPath = join(dirname(dbPath), 'dump.json')
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'open-export' })
        typeText(session, exportPath)
        const exported = session.applyAction({ kind: 'form-enter' })
        expect(exported.screen).toBe('queue')
        expect(exported.banner?.message).toContain('Exportado')
        expect(existsSync(exportPath)).toBe(true)

        withStore(dbPath, (store) => store.deleteItem('A'))

        session.applyAction({ kind: 'open-import' })
        typeText(session, exportPath)
        const imported = session.applyAction({ kind: 'form-enter' })
        expect(imported.screen).toBe('queue')
        expect(imported.banner?.message).toContain('Importado')
        withStore(dbPath, (store) => expect(store.getItem('A')).not.toBeNull())
      } finally {
        session.close()
      }
    })
  })

  it('sessao-export-existente-confirma: so o y sobrescreve o arquivo existente (U-24)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      const exportPath = join(dirname(dbPath), 'dump.json')
      writeFileSync(exportPath, 'keep')
      seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'open-export' })
        typeText(session, exportPath)
        const asked = session.applyAction({ kind: 'form-enter' })
        expect(asked.screen).toBe('confirm')
        expect(asked.confirmation?.message).toContain('Sobrescrever')
        expect(readFileSync(exportPath, 'utf8')).toBe('keep')

        expect(session.applyAction({ kind: 'confirm-no' }).screen).toBe('queue')
        expect(readFileSync(exportPath, 'utf8')).toBe('keep')

        session.applyAction({ kind: 'open-export' })
        typeText(session, exportPath)
        session.applyAction({ kind: 'form-enter' })
        expect(session.applyAction({ kind: 'confirm-yes' }).screen).toBe('queue')
        expect(readFileSync(exportPath, 'utf8')).not.toBe('keep')
      } finally {
        session.close()
      }
    })
  })

  it('sessao-cold-restaura: R restaura o item do arquivo morto (U-19)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      const stamp = '2026-09-01T00:00:00Z'
      seed(dbPath, {
        items: [makeItem({ id: 'cold-1', title: 'Antigo', status: 'cold', cold_archived_at: stamp })],
      })
      withStore(dbPath, (store) =>
        store.saveColdArchive({ id: 'cold-1', payload: '{}', cold_archived_at: stamp }),
      )

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        const opened = session.applyAction({ kind: 'open-cold' })
        expect(opened.screen).toBe('cold')
        expect(opened.cold?.focusId).toBe('cold-1')

        const restored = session.applyAction({ kind: 'cold-restore' })
        expect(restored.banner?.message).toContain('Item restaurado: Antigo')
        withStore(dbPath, (store) => {
          expect(store.getItem('cold-1')?.status).toBe('active')
          expect(store.listColdArchive()).toEqual([])
        })
      } finally {
        session.close()
      }
    })
  })

  it('sessao-cold-purge-confirma: P pede confirmacao e so o y purga (U-20)', () => {
    withDb((dbPath) => {
      const today = '2026-09-20'
      const clock = fakeDeps(today)
      const stamp = '2026-09-01T00:00:00Z'
      seed(dbPath, {
        items: [makeItem({ id: 'cold-1', title: 'Antigo', status: 'cold', cold_archived_at: stamp })],
      })
      withStore(dbPath, (store) =>
        store.saveColdArchive({ id: 'cold-1', payload: '{}', cold_archived_at: stamp }),
      )

      const session = openSession(sessionOptions(dbPath, clock.deps))
      try {
        session.applyAction({ kind: 'open-cold' })
        const asked = session.applyAction({ kind: 'cold-purge' })
        expect(asked.screen).toBe('confirm')
        expect(asked.confirmation?.message).toContain('Remover do arquivo morto?')
        withStore(dbPath, (store) => expect(store.getItem('cold-1')).not.toBeNull())

        expect(session.applyAction({ kind: 'confirm-no' }).screen).toBe('cold')
        withStore(dbPath, (store) => expect(store.getItem('cold-1')).not.toBeNull())

        session.applyAction({ kind: 'cold-purge' })
        const purged = session.applyAction({ kind: 'confirm-yes' })
        expect(purged.screen).toBe('cold')
        expect(purged.banner?.message).toContain('Removido do arquivo morto: Antigo')
        withStore(dbPath, (store) => {
          expect(store.getItem('cold-1')).toBeNull()
          expect(store.listColdArchive()).toEqual([])
        })
      } finally {
        session.close()
      }
    })
  })
})

describe('AC13 — a lista de fichas na sessão', () => {
  it('sessao-fichas-abre-e-fecha: l abre a lista com ativas e arquivadas e o foco da fila (U-27)', () => {
      withDb((dbPath) => {
        const today = '2026-09-20'
        const clock = fakeDeps(today)
        seed(dbPath, {
          items: [
            makeItem({ id: 'A', title: 'Ativa', due_date: today }),
            makeItem({
              id: 'Z',
              title: 'Arquivada',
              status: 'archived',
              archived_at: `${today}T12:00:00Z`,
              due_date: '2026-08-01',
            }),
          ],
        })

        const session = openSession(sessionOptions(dbPath, clock.deps))
        try {
          const opened = session.applyAction({ kind: 'open-items' })
          expect(opened.screen).toBe('items')
          expect(opened.items?.focusId).toBe('A')
          expect(session.applyAction({ kind: 'close-items' }).screen).toBe('queue')
        } finally {
          session.close()
        }
    })
  })

  it('sessao-fichas-vazia-mantem-arquivadas: sem fila, l ainda lista e foca a arquivada (U-27)', () => {
      withDb((dbPath) => {
        const today = '2026-09-20'
        const clock = fakeDeps(today)
        seed(dbPath, {
          items: [
            makeItem({
              id: 'Z',
              title: 'Arquivada',
              status: 'archived',
              archived_at: `${today}T12:00:00Z`,
              due_date: '2026-08-01',
            }),
          ],
        })

        const session = openSession(sessionOptions(dbPath, clock.deps))
        try {
          expect(session.state().queue).toEqual([])
          const opened = session.applyAction({ kind: 'open-items' })
          expect(opened.screen).toBe('items')
          expect(opened.items?.focusId).toBe('Z')
        } finally {
          session.close()
        }
    })
  })

  it('sessao-fichas-x-x-arquiva-desarquiva: x e X agem no foco da lista (U-27)', () => {
      withDb((dbPath) => {
        const today = '2026-09-20'
        const clock = fakeDeps(today)
        seed(dbPath, { items: [makeItem({ id: 'A', due_date: today })] })

        const session = openSession(sessionOptions(dbPath, clock.deps))
        try {
          session.applyAction({ kind: 'open-items' })
          const archived = session.applyAction({ kind: 'archive' })
          expect(archived.screen).toBe('items')
          expect(archived.banner?.message).toContain('arquivado')
          withStore(dbPath, (store) => expect(store.getItem('A')?.status).toBe('archived'))

          const unarchived = session.applyAction({ kind: 'unarchive' })
          expect(unarchived.banner?.message).toContain('desarquivado')
          withStore(dbPath, (store) => expect(store.getItem('A')?.status).toBe('active'))
        } finally {
          session.close()
        }
    })
  })

  it('sessao-fichas-detalhe-volta: i abre o detalhe e Esc volta para a lista (U-27)', () => {
      withDb((dbPath) => {
        const today = '2026-09-20'
        const clock = fakeDeps(today)
        seed(dbPath, { items: [makeItem({ id: 'A', title: 'Ativa', due_date: today })] })

        const session = openSession(sessionOptions(dbPath, clock.deps))
        try {
          session.applyAction({ kind: 'open-items' })
          const detail = session.applyAction({ kind: 'open-detail' })
          expect(detail.screen).toBe('detail')
          expect(detail.detailItemId).toBe('A')
          expect(session.applyAction({ kind: 'close-detail' }).screen).toBe('items')
        } finally {
          session.close()
        }
    })
  })
})
