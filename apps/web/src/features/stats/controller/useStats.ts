import { useEffect, useState } from 'react'
import { type Deps } from '@study/core'
import { messageForError } from '../../../errors.ts'
import { type LoadState } from '../../../loadState.ts'
import { readQueueStreak } from '../../../queueStreak.ts'
import { type Store } from '../../../store/index.ts'
import { buildStats, type Stats } from '../model/buildStats.ts'

export function useStats(store: Store, deps: Deps): LoadState<Stats> {
  const [state, setState] = useState<LoadState<Stats>>({ status: 'loading' })
  const today = deps.clock.todayLocalDate()

  useEffect(() => {
    let active = true
    Promise.all([store.listItems(), store.listReviewLogs(), readQueueStreak(store)]).then(
      ([items, logs, streak]) => {
        if (active) setState({ status: 'ready', value: buildStats({ items, logs, streak, today }) })
      },
      (thrown: unknown) => {
        if (active) setState({ status: 'error', message: messageForError(thrown) })
      },
    )
    return () => {
      active = false
    }
  }, [store, today])

  return state
}
