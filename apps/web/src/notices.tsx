import { type ReactNode } from 'react'
import { strings } from './strings.ts'

export function LoadingNotice() {
  return <p role="status">{strings.notice.loading}</p>
}

export function ErrorNotice({ message }: { readonly message: string }) {
  return <p role="alert">{message}</p>
}

export function EmptyNotice({ message, action }: { readonly message: string; readonly action?: ReactNode }) {
  return (
    <div>
      <p>{message}</p>
      {action}
    </div>
  )
}
