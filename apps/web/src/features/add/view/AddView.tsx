import { MAX_DIFFICULTY, MIN_DIFFICULTY } from '@study/core'
import { DueDate } from '../../due/index.ts'
import { ErrorNotice, LoadingNotice } from '../../../notices.tsx'
import { strings } from '../../../strings.ts'
import { type AddController } from '../model/addForm.ts'

export function AddView({ controller }: { readonly controller: AddController }) {
  return (
    <section aria-label={strings.add.heading}>
      <h2>{strings.add.heading}</h2>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          controller.submit()
        }}
      >
        <label>
          {strings.add.titleLabel}
          <input
            value={controller.values.title}
            onChange={(event) => controller.setValue('title', event.target.value)}
          />
        </label>
        {fieldErrorNotice(controller, 'title')}
        <label>
          {strings.add.subjectLabel}
          <input
            value={controller.values.subject}
            onChange={(event) => controller.setValue('subject', event.target.value)}
          />
        </label>
        {fieldErrorNotice(controller, 'subject')}
        <label>
          {strings.add.difficultyLabel}
          <input
            type="number"
            min={MIN_DIFFICULTY}
            max={MAX_DIFFICULTY}
            value={controller.values.difficulty}
            onChange={(event) => controller.setValue('difficulty', event.target.value)}
          />
        </label>
        {fieldErrorNotice(controller, 'difficulty')}
        <label>
          {strings.add.noteLabel}
          <input
            value={controller.values.note}
            onChange={(event) => controller.setValue('note', event.target.value)}
          />
        </label>
        {fieldErrorNotice(controller, 'note')}
        <label>
          {strings.add.linkLabel}
          <input
            value={controller.values.link}
            onChange={(event) => controller.setValue('link', event.target.value)}
          />
        </label>
        {fieldErrorNotice(controller, 'link')}
        {controller.preview === null ? null : <DueDate estimate={controller.preview} />}
        <button type="submit" disabled={controller.busy}>
          {strings.add.submit}
        </button>
      </form>
      {controller.busy ? <LoadingNotice /> : null}
      {controller.error === null ? null : <ErrorNotice message={controller.error} />}
    </section>
  )
}

function fieldErrorNotice(controller: AddController, field: string) {
  const message = controller.fieldErrors[field]
  return message === undefined ? null : <ErrorNotice message={message} />
}
