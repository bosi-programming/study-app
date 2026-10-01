import '@testing-library/jest-dom/vitest'
import { type Clock, type Deps } from '@study/core'
import { render, type RenderResult } from '@testing-library/react'
import { App } from '../src/App.tsx'
import { type Store } from '../src/store/index.ts'
import { makeItem, makeLog, openTestStore, seed, type TestStore } from './store/helpers.ts'

export { makeItem, makeLog, openTestStore, seed }
export type { TestStore }

export const DEFAULT_TODAY = '2026-09-30'

export type TestDeps = Deps & {
  setToday(day: string): void
  setNowUtc(instant: string): void
}

export function testDeps(today: string = DEFAULT_TODAY): TestDeps {
  let currentToday = today
  let currentNow = `${today}T12:00:00Z`
  let count = 0

  const clock: Clock = {
    todayLocalDate: () => currentToday,
    nowUtc: () => currentNow,
  }

  return {
    clock,
    ids: () => {
      count += 1
      return `00000000-0000-4000-8000-${String(count).padStart(12, '0')}`
    },
    setToday: (day) => {
      currentToday = day
      currentNow = `${day}T12:00:00Z`
    },
    setNowUtc: (instant) => {
      currentNow = instant
    },
  }
}

export function renderApp(store: Store, deps: Deps, hash = '#/'): RenderResult {
  globalThis.location.hash = hash
  return render(<App store={store} deps={deps} />)
}

export function navigate(hash: string): void {
  globalThis.location.hash = hash
  globalThis.dispatchEvent(new HashChangeEvent('hashchange'))
}

export async function openApp(
  options: { readonly hash?: string; readonly today?: string } = {},
): Promise<TestStore & { readonly deps: TestDeps; readonly view: RenderResult }> {
  const harness = await openTestStore()
  const deps = testDeps(options.today ?? DEFAULT_TODAY)
  const view = renderApp(harness.store, deps, options.hash ?? '#/')
  return { ...harness, deps, view }
}
