import { useEffect, useState } from 'react'
import { type Item } from '@study/core'
import { messageForError } from './errors.ts'
import { type LoadState } from './loadState.ts'
import { type Store } from './store/index.ts'
import { strings } from './strings.ts'

export type ItemLoad = {
  readonly state: LoadState<Item>
  setItem(item: Item): void
}

export function useItem(store: Store, id: string): ItemLoad {
  const [state, setState] = useState<LoadState<Item>>({ status: 'loading' })

  useEffect(() => {
    let active = true
    setState({ status: 'loading' })
    store.getItem(id).then(
      (item) => {
        if (!active) return
        setState(
          item === null
            ? { status: 'error', message: strings.errors.notFound }
            : { status: 'ready', value: item },
        )
      },
      (thrown: unknown) => {
        if (active) setState({ status: 'error', message: messageForError(thrown) })
      },
    )
    return () => {
      active = false
    }
  }, [store, id])

  return { state, setItem: (item) => setState({ status: 'ready', value: item }) }
}
