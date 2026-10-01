import { ErrorNotice, LoadingNotice } from '../../../notices.tsx'
import { strings } from '../../../strings.ts'
import { type DataController, type DataCounts } from '../model/dataView.ts'

export function DataView({ controller }: { readonly controller: DataController }) {
  const busy = controller.state.status === 'busy'
  return (
    <section>
      <h2>{strings.data.heading}</h2>
      <button type="button" onClick={controller.exportData} disabled={busy}>
        {strings.data.export}
      </button>
      <button type="button" onClick={controller.importData} disabled={busy}>
        {strings.data.import}
      </button>
      {busy ? <LoadingNotice /> : null}
      {controller.state.status === 'error' ? (
        <ErrorNotice message={controller.state.message} />
      ) : null}
      {controller.lastExport !== null ? (
        <Confirmation title={strings.data.exported} counts={controller.lastExport} />
      ) : null}
      {controller.lastImport !== null ? (
        <Confirmation title={strings.data.imported} counts={controller.lastImport} />
      ) : null}
    </section>
  )
}

function Confirmation({ title, counts }: { readonly title: string; readonly counts: DataCounts }) {
  const rows: readonly (readonly [string, number])[] = [
    [strings.data.countsItems, counts.items],
    [strings.data.countsCheckins, counts.reviewLogs],
    [strings.data.countsCold, counts.coldArchive],
    [strings.data.countsWritten, counts.written],
    [strings.data.countsSkipped, counts.skipped],
  ]
  return (
    <div>
      <p>{title}</p>
      <ul>
        {rows.map(([label, value]) => (
          <li key={label}>{`${label}: ${value}`}</li>
        ))}
      </ul>
    </div>
  )
}
