import { useEffect, useState } from 'react'
import { recordReview, reevaluateDifficulty, type Deps, type Item } from '@study/core'
import { messageForError } from '../../../errors.ts'
import { type LoadState } from '../../../loadState.ts'
import { rollQueueStreak } from '../../../queueStreak.ts'
import { type Store } from '../../../store/index.ts'
import { strings } from '../../../strings.ts'
import { type ReviewController, type ReviewPhase } from '../model/reviewState.ts'

export function useReview(store: Store, deps: Deps, id: string): ReviewController {
  const [state, setState] = useState<LoadState<Item>>({ status: 'loading' })
  const [phase, setPhase] = useState<ReviewPhase>('idle')
  const [difficulty, setDifficulty] = useState('')
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

  async function checkin(): Promise<void> {
    if (state.status !== 'ready') return
    setError(null)
    try {
      const result = recordReview(state.value, deps)
      await store.transaction(async (scoped) => {
        await scoped.saveItem(result.item)
        await scoped.saveReviewLog(result.log)
      })
      await rollQueueStreak(store, deps.clock.todayLocalDate())
      setDifficulty(String(result.item.difficulty))
      setPhase('reevaluate')
      setState({ status: 'ready', value: result.item })
    } catch (thrown) {
      setError(messageForError(thrown))
    }
  }

  async function applyDifficulty(): Promise<void> {
    if (state.status !== 'ready') return
    setError(null)
    try {
      const reviewed = reevaluateDifficulty(state.value, Number(difficulty), deps)
      if (reviewed !== state.value) {
        await store.saveItem(reviewed)
        await rollQueueStreak(store, deps.clock.todayLocalDate())
      }
      setPhase('idle')
      setState({ status: 'ready', value: reviewed })
    } catch (thrown) {
      setError(messageForError(thrown))
    }
  }

  return {
    state,
    phase,
    difficulty,
    error,
    setDifficulty,
    checkin: () => {
      void checkin()
    },
    applyDifficulty: () => {
      void applyDifficulty()
    },
    keepDifficulty: () => setPhase('idle'),
  }
}
