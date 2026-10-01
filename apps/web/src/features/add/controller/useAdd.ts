import { useState } from 'react'
import { createItem, type Deps } from '@study/core'
import { fieldErrorOf, messageForError } from '../../../errors.ts'
import { rollQueueStreak } from '../../../queueStreak.ts'
import { type Store } from '../../../store/index.ts'
import { tryInitialDueEstimate } from '../../due/model/due.ts'
import {
  EMPTY_ADD_FORM,
  toItemInput,
  type AddController,
  type AddFormValues,
  type AddSaved,
} from '../model/addForm.ts'

export function useAdd(store: Store, deps: Deps, onSaved: AddSaved): AddController {
  const [values, setValues] = useState(EMPTY_ADD_FORM)
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const preview = tryInitialDueEstimate(Number(values.difficulty), deps.clock.todayLocalDate())

  function setValue(field: keyof AddFormValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(): Promise<void> {
    setBusy(true)
    setError(null)
    setFieldErrors({})
    try {
      const item = createItem(toItemInput(values), deps)
      await store.saveItem(item)
      await rollQueueStreak(store, deps.clock.todayLocalDate())
      onSaved({ name: 'items' })
    } catch (thrown) {
      const fieldError = fieldErrorOf(thrown)
      if (fieldError === null) setError(messageForError(thrown))
      else setFieldErrors({ [fieldError.field]: fieldError.message })
    } finally {
      setBusy(false)
    }
  }

  return {
    values,
    fieldErrors,
    preview,
    error,
    busy,
    setValue,
    submit: () => {
      void submit()
    },
  }
}
