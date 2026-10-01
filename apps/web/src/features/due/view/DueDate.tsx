import { strings } from '../../../strings.ts'
import { type DueEstimate } from '../model/due.ts'

type DueDateProps = {
  readonly estimate: DueEstimate
}

export function DueDate({ estimate }: DueDateProps) {
  return (
    <p>
      {strings.due.prefix} <time dateTime={estimate.dueDate}>{estimate.dueDate}</time>
      {strings.due.separator}
      <span>{strings.due.days(estimate.intervalDays)}</span>
    </p>
  )
}
