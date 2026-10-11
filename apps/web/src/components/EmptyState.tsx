import { Typography } from 'bosi-design-system/react'
import { type JSX } from 'react'

export interface EmptyStateProps {
  readonly message: string
}

export function EmptyState({ message }: EmptyStateProps): JSX.Element {
  return (
    <Typography as="p" size="body">
      {message}
    </Typography>
  )
}
