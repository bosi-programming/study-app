import { useEffect, useState } from 'react'
import { archiveItem, unarchiveItem, type Deps, type Item } from '@study/core'
import { messageForError } from '../../../errors.ts'
import { type LoadState } from '../../../loadState.ts'
import { rollQueueStreak } from '../../../queueStreak.ts'
import { type Store } from '../../../store/index.ts'
import { strings } from '../../../strings.ts'
import { type ItemDetailController } from '../model/itemDetail.ts'

export function useItemDetail(store: Store, deps: Deps, id: string): ItemDetailController {
  const [state, setState] = useState<LoadState<Item>>({ status: 'loading' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    store.getItem(id).then(
      (item) => {
        if (!active) return
        setState(item === null ? { status: 'error', message: strings.errors.notFound } : { status: 'ready', value: item })
      },
      (thrown: unknown) => {
        if (active) setState({ status: 'error', message: messageForError(thrown) })
      },
    )
    return () => {
      active = false
    }
  }, [store, id])

  async function persist(next: Item): Promise<void> {
    setError(null)
    try {
      await store.saveItem(next)
      await rollQueueStreak(store, deps.clock.todayLocalDate())
      setState({ status: 'ready', value: next })
    } catch (thrown) {
      setError(messageForError(thrown))
    }
  }

  function archive(): void {
    if (state.status !== 'ready') return
    if (state.value.status === 'archived') {
      setError(strings.errors.alreadyArchived)
      return
    }
    if (state.value.status === 'cold') {
      setError(strings.errors.itemCold)
      return
    }
    void persist(archiveItem(state.value, deps.clock.nowUtc()))
  }

  function unarchive(): void {
    if (state.status !== 'ready') return
    if (state.value.status === 'active') {
      setError(strings.errors.alreadyActive)
      return
    }
    if (state.value.status === 'cold') {
      setError(strings.errors.itemCold)
      return
    }
    void persist(unarchiveItem(state.value, deps.clock.nowUtc()))
  }

  return { state, error, archive, unarchive }
}
