import { useState } from 'react'
import { recordReview, reevaluateDifficulty, type Deps } from '@study/core'
import { messageForError } from '../../../errors.ts'
import { rollQueueStreak } from '../../../queueStreak.ts'
import { type Store } from '../../../store/index.ts'
import { useItem } from '../../../useItem.ts'
import { type ReviewController, type ReviewPhase } from '../model/reviewState.ts'

export function useReview(store: Store, deps: Deps, id: string): ReviewController {
  const { state, setItem } = useItem(store, id)
  const [phase, setPhase] = useState<ReviewPhase>('idle')
  const [difficulty, setDifficulty] = useState('')
  const [error, setError] = useState<string | null>(null)

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
      setItem(result.item)
    } catch (thrown) {
      setError(messageForError(thrown))
    }
  }

  async function applyDifficulty(): Promise<void> {
    if (state.status !== 'ready') return
    setError(null)
    try {
      const reviewed = reevaluateDifficulty(state.value, Number(difficulty), deps)
      if (reviewed !== state.value) await store.saveItem(reviewed)
      setPhase('idle')
      setItem(reviewed)
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
