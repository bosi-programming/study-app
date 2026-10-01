import { ErrorNotice, LoadingNotice } from '../../../notices.tsx'
import { hrefFor } from '../../../routing.ts'
import { strings } from '../../../strings.ts'
import { type ReviewController } from '../model/reviewState.ts'

export function ReviewView({ controller }: { readonly controller: ReviewController }) {
  const { state } = controller
  if (state.status === 'loading') return <LoadingNotice />
  if (state.status === 'error') return <ErrorNotice message={state.message} />

  const item = state.value
  return (
    <section aria-label={strings.review.heading}>
      <h2>{strings.review.heading}</h2>
      <p>{item.title}</p>
      <p>
        {strings.detail.dueDateField} <time dateTime={item.due_date}>{item.due_date}</time>
      </p>
      <button type="button" onClick={controller.checkin}>
        {strings.review.checkin}
      </button>
      {controller.phase === 'reevaluate' ? (
        <div>
          <p>{strings.review.reevaluate}</p>
          <label>
            {strings.review.difficultyLabel}
            <input
              type="number"
              min={1}
              max={5}
              value={controller.difficulty}
              onChange={(event) => controller.setDifficulty(event.target.value)}
            />
          </label>
          <button type="button" onClick={controller.applyDifficulty}>
            {strings.review.apply}
          </button>
          <button type="button" onClick={controller.keepDifficulty}>
            {strings.review.keep}
          </button>
        </div>
      ) : null}
      {controller.error === null ? null : <ErrorNotice message={controller.error} />}
      {controller.error === null ? null : (
        <a href={hrefFor({ name: 'item', id: item.id })}>{strings.review.openItem}</a>
      )}
    </section>
  )
}
