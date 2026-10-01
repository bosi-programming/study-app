import { useEffect, useState } from 'react'
import { type Deps } from '@study/core'
import { messageForError } from '../../../errors.ts'
import { type LoadState } from '../../../loadState.ts'
import { type Store } from '../../../store/index.ts'
import { buildQueue, type Queue } from '../model/buildQueue.ts'

export function useQueue(store: Store, deps: Deps): LoadState<Queue> {
  const [state, setState] = useState<LoadState<Queue>>({ status: 'loading' })
  const today = deps.clock.todayLocalDate()

  useEffect(() => {
    let active = true
    store.dueItems(today).then(
      (items) => {
        if (active) setState({ status: 'ready', value: buildQueue(items, today) })
      },
      (error: unknown) => {
        if (active) setState({ status: 'error', message: messageForError(error) })
      },
    )
    return () => {
      active = false
    }
  }, [store, today])

  return state
}
