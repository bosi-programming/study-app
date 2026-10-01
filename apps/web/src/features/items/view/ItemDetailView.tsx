import { DIFFICULTY_LABELS } from '@study/core'
import { ErrorNotice, LoadingNotice } from '../../../notices.tsx'
import { hrefFor } from '../../../routing.ts'
import { strings } from '../../../strings.ts'
import { type ItemDetailController } from '../model/itemDetail.ts'

export function ItemDetailView({ controller }: { readonly controller: ItemDetailController }) {
  const { state, error } = controller
  if (state.status === 'loading') return <LoadingNotice />
  if (state.status === 'error') return <ErrorNotice message={state.message} />

  const item = state.value
  return (
    <section aria-label={strings.detail.heading}>
      <h2>{strings.detail.heading}</h2>
      <dl>
        <dt>{strings.detail.titleField}</dt>
        <dd>{item.title}</dd>
        <dt>{strings.detail.subjectField}</dt>
        <dd>{item.subject}</dd>
        <dt>{strings.detail.difficultyField}</dt>
        <dd>{DIFFICULTY_LABELS[item.difficulty]}</dd>
        <dt>{strings.detail.noteField}</dt>
        <dd>{item.note ?? strings.detail.none}</dd>
        <dt>{strings.detail.linkField}</dt>
        <dd>{item.link ?? strings.detail.none}</dd>
        <dt>{strings.detail.dueDateField}</dt>
        <dd>
          <time dateTime={item.due_date}>{item.due_date}</time>
        </dd>
        <dt>{strings.detail.statusField}</dt>
        <dd>{strings.status[item.status]}</dd>
        <dt>{strings.detail.streakField}</dt>
        <dd>{item.on_time_streak}</dd>
      </dl>
      <a href={hrefFor({ name: 'review', id: item.id })}>{strings.detail.review}</a>
      <button type="button" onClick={controller.archive}>
        {strings.detail.archive}
      </button>
      <button type="button" onClick={controller.unarchive}>
        {strings.detail.unarchive}
      </button>
      {error === null ? null : <ErrorNotice message={error} />}
    </section>
  )
}
