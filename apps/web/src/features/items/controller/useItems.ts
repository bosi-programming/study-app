import { useEffect, useState } from 'react'
import { messageForError } from '../../../errors.ts'
import { type LoadState } from '../../../loadState.ts'
import { type Store } from '../../../store/index.ts'
import {
  DEFAULT_ITEMS_FILTER,
  hasTerm,
  queryFilter,
  subjectOptions,
  type ItemsController,
  type ItemsFilter,
  type ItemsResult,
} from '../model/listItems.ts'

export function useItems(store: Store): ItemsController {
  const [filter, setFilter] = useState<ItemsFilter>(DEFAULT_ITEMS_FILTER)
  const [state, setState] = useState<LoadState<ItemsResult>>({ status: 'loading' })

  useEffect(() => {
    let active = true
    const query = queryFilter(filter)
    const rows = hasTerm(filter.term) ? store.findItems(filter.term, query) : store.listItems(query)

    Promise.all([rows, store.listItems()]).then(
      ([found, all]) => {
        if (active) setState({ status: 'ready', value: { rows: found, subjects: subjectOptions(all) } })
      },
      (thrown: unknown) => {
        if (active) setState({ status: 'error', message: messageForError(thrown) })
      },
    )

    return () => {
      active = false
    }
  }, [store, filter])

  return {
    state,
    filter,
    setStatus: (status) => setFilter((current) => ({ ...current, status })),
    setSubject: (subject) => setFilter((current) => ({ ...current, subject })),
    setTerm: (term) => setFilter((current) => ({ ...current, term })),
  }
}
