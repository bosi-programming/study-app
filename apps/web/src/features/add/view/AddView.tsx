import { strings } from '../../../strings.ts'
import { ErrorNotice } from '../../../notices.tsx'
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
            min={1}
            max={5}
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
        <p>
          {strings.add.previewLabel}{' '}
          {controller.preview === null ? null : (
            <time dateTime={controller.preview.dueDate}>{controller.preview.dueDate}</time>
          )}
        </p>
        <button type="submit" disabled={controller.busy}>
          {strings.add.submit}
        </button>
      </form>
      {controller.error === null ? null : <ErrorNotice message={controller.error} />}
    </section>
  )
}

function fieldErrorNotice(controller: AddController, field: string) {
  const message = controller.fieldErrors[field]
  return message === undefined ? null : <ErrorNotice message={message} />
}
