import { Button, Paper, Typography } from 'bosi-design-system/react'
import { type ComponentProps, type JSX, type KeyboardEvent, useId } from 'react'

type DialogButtonProps = ComponentProps<typeof Button> & {
  readonly disabled?: boolean
}

const DialogButton = Button as (props: DialogButtonProps) => JSX.Element

export interface ConfirmationDialogProps {
  readonly open: boolean
  readonly cardName: string
  readonly pending: boolean
  readonly error: string | null
  readonly onConfirm: () => void
  readonly onCancel: () => void
}

export function ConfirmationDialog({
  open,
  cardName,
  pending,
  error,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps): JSX.Element | null {
  const titleId = useId()
  const messageId = useId()

  if (!open) {
    return null
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>): void {
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
    }
  }

  return (
    <dialog
      open
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      data-testid="confirmation-dialog"
      onKeyDown={handleKeyDown}
    >
      <Paper className="p-6">
        <Typography as="h2" size="h2" id={titleId}>
          Excluir conteúdo?
        </Typography>
        <Typography as="p" size="body" id={messageId}>
          {cardName}
        </Typography>
        {error !== null ? <p role="alert">{error}</p> : null}
        <div className="flex gap-2">
          <DialogButton onClick={onConfirm} disabled={pending}>
            Confirmar
          </DialogButton>
          <DialogButton onClick={onCancel} disabled={pending}>
            Cancelar
          </DialogButton>
        </div>
      </Paper>
    </dialog>
  )
}
