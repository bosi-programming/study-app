import { type DueEstimate } from '../model/due.ts'

type DueDateProps = {
  readonly estimate: DueEstimate
}

export function DueDate({ estimate }: DueDateProps) {
  return (
    <p>
      Próxima revisão em <time dateTime={estimate.dueDate}>{estimate.dueDate}</time> —{' '}
      <span>{estimate.intervalDays} dias</span>
    </p>
  )
}
