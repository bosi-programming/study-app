import { hrefFor } from '../../../routing.ts'
import { strings } from '../../../strings.ts'
import { EmptyNotice, ErrorNotice, LoadingNotice } from '../../../notices.tsx'
import { type LoadState } from '../../../loadState.ts'
import { type Queue, type QueueEntry, type QueueSummary } from '../model/buildQueue.ts'

type QueueViewProps = {
  readonly state: LoadState<Queue>
}

export function QueueView({ state }: QueueViewProps) {
  if (state.status === 'loading') return <LoadingNotice />
  if (state.status === 'error') return <ErrorNotice message={state.message} />
  if (state.value.entries.length === 0) {
    return (
      <EmptyNotice
        message={strings.queue.empty}
        action={<a href={hrefFor({ name: 'add' })}>{strings.queue.emptyAction}</a>}
      />
    )
  }

  return (
    <section aria-label={strings.queue.heading}>
      <h2>{strings.queue.heading}</h2>
      <ul>
        {state.value.entries.map((entry) => (
          <QueueRow key={entry.item.id} entry={entry} />
        ))}
      </ul>
      <Summary summary={state.value.summary} />
    </section>
  )
}

function QueueRow({ entry }: { readonly entry: QueueEntry }) {
  return (
    <li>
      <a href={hrefFor({ name: 'item', id: entry.item.id })}>{entry.item.title}</a>
      <span>{entry.item.subject}</span>
      <time dateTime={entry.item.due_date}>{entry.item.due_date}</time>
      <span>{entry.late ? strings.queue.late(entry.daysLate) : strings.queue.dueToday}</span>
    </li>
  )
}

function Summary({ summary }: { readonly summary: QueueSummary }) {
  return (
    <div>
      <p>{`${strings.queue.summaryTotal}: ${summary.total}`}</p>
      <p>{`${strings.queue.summaryLate}: ${summary.late}`}</p>
      <h3>{strings.queue.summaryBySubject}</h3>
      <ul>
        {summary.bySubject.map((entry) => (
          <li key={entry.subject}>{`${entry.subject}: ${entry.count}`}</li>
        ))}
      </ul>
    </div>
  )
}
