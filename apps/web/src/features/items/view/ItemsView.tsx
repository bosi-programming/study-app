import { DIFFICULTY_LABELS, type ItemStatus } from '@study/core'
import { EmptyNotice, ErrorNotice, LoadingNotice } from '../../../notices.tsx'
import { hrefFor } from '../../../routing.ts'
import { strings } from '../../../strings.ts'
import { type ItemsController } from '../model/listItems.ts'

const STATUSES: readonly ItemStatus[] = ['active', 'archived', 'cold']

export function ItemsView({ controller }: { readonly controller: ItemsController }) {
  const { state, filter } = controller
  if (state.status === 'loading') return <LoadingNotice />
  if (state.status === 'error') return <ErrorNotice message={state.message} />

  return (
    <section aria-label={strings.items.heading}>
      <h2>{strings.items.heading}</h2>
      <label>
        {strings.items.statusLabel}
        <select
          value={filter.status}
          onChange={(event) => controller.setStatus(event.target.value as ItemStatus)}
        >
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {strings.filterStatus[status]}
            </option>
          ))}
        </select>
      </label>
      <label>
        {strings.items.subjectLabel}
        <select value={filter.subject} onChange={(event) => controller.setSubject(event.target.value)}>
          <option value="">{strings.items.subjectAll}</option>
          {state.value.subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>
      <label>
        {strings.items.searchLabel}
        <input value={filter.term} onChange={(event) => controller.setTerm(event.target.value)} />
      </label>
      {state.value.rows.length === 0 ? (
        <EmptyNotice
          message={strings.items.empty}
          action={<a href={hrefFor({ name: 'add' })}>{strings.items.emptyAction}</a>}
        />
      ) : (
        <ul>
          {state.value.rows.map((item) => (
            <li key={item.id}>
              <a href={hrefFor({ name: 'item', id: item.id })}>{item.title}</a>
              <span>{item.subject}</span>
              <time dateTime={item.due_date}>{item.due_date}</time>
              <span>{DIFFICULTY_LABELS[item.difficulty]}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
