import { ErrorNotice, LoadingNotice } from '../../../notices.tsx'
import { strings } from '../../../strings.ts'
import { type Stats } from '../model/buildStats.ts'
import { type LoadState } from '../../../loadState.ts'

export function StatsView({ state }: { readonly state: LoadState<Stats> }) {
  if (state.status === 'loading') return <LoadingNotice />
  if (state.status === 'error') return <ErrorNotice message={state.message} />

  const stats = state.value
  return (
    <section aria-label={strings.stats.heading}>
      <h2>{strings.stats.heading}</h2>
      <ul>
        <li>{`${strings.stats.streak}: ${stats.streak}`}</li>
        <li>{`${strings.stats.active}: ${stats.counts.active}`}</li>
        <li>{`${strings.stats.archived}: ${stats.counts.archived}`}</li>
        <li>{`${strings.stats.cold}: ${stats.counts.cold}`}</li>
        <li>{`${strings.stats.checkinsToday}: ${stats.checkinsToday}`}</li>
      </ul>
      <h3>{strings.stats.bySubject}</h3>
      <ul>
        {stats.bySubject.map((entry) => (
          <li key={entry.subject}>{`${entry.subject}: ${entry.count}`}</li>
        ))}
      </ul>
    </section>
  )
}
