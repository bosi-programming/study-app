import '@testing-library/jest-dom/vitest'
import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { IDB_NAME, SCHEMA_VERSION_KEY } from '../src/store/schema.ts'
import { openStore } from '../src/store/store.ts'
import { strings } from '../src/strings.ts'
import { freshEnvironment } from './store/helpers.ts'

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = '<div id="root"></div>'
})

afterEach(cleanup)

describe('AC-9 boot do main.tsx', () => {
  it('main-mostra-o-erro-do-store-quando-a-abertura-falha', async () => {
    vi.doMock('../src/store/index.ts', async () => {
      const actual = await vi.importActual<typeof import('../src/store/index.ts')>(
        '../src/store/index.ts',
      )
      return { ...actual, openStore: () => Promise.reject(new Error('IndexedDB explodiu')) }
    })

    await import('../src/main.tsx')

    expect(await screen.findByRole('alert')).toHaveTextContent(strings.errors.store)
    expect(screen.queryByRole('navigation')).toBeNull()
  })

  it('main-mostra-a-recuperacao-quando-o-schema-divergiu', async () => {
    const environment = freshEnvironment()
    const seeded = await openStore(environment, IDB_NAME)
    await seeded.setMeta(SCHEMA_VERSION_KEY, '2')
    seeded.close()
    vi.doMock('../src/store/index.ts', async () => {
      const actual = await vi.importActual<typeof import('../src/store/index.ts')>(
        '../src/store/index.ts',
      )
      return { ...actual, browserIdb: () => environment }
    })

    await import('../src/main.tsx')

    expect(
      await screen.findByRole('button', { name: strings.data.export }),
    ).toBeInTheDocument()
  })

  it('main-falha-alto-quando-o-root-nao-existe', async () => {
    document.body.innerHTML = ''

    await expect(import('../src/main.tsx')).rejects.toThrow()
  })
})
