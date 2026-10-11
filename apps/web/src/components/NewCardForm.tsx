import { type CardFieldMessages, EMPTY_NEW_CARD, fieldMessages } from '../cardForm'
import { type NewCard, validateCard } from '@study/core'
import { Button, Input, Paper, Typography } from 'bosi-design-system/react'
import {
  type ChangeEvent,
  type ComponentProps,
  type FormEvent,
  type JSX,
  useId,
  useState,
} from 'react'

const SAVE_ERROR_MESSAGE = 'Não foi possível salvar. Tente novamente.'

type FormButtonProps = ComponentProps<typeof Button> & {
  readonly type?: 'button' | 'submit'
}

const FormButton = Button as (props: FormButtonProps) => JSX.Element

export interface NewCardFormProps {
  readonly categories: readonly string[]
  readonly onCreate: (input: NewCard) => Promise<void>
  readonly onCancel: () => void
}

export function NewCardForm({
  categories,
  onCreate,
  onCancel,
}: NewCardFormProps): JSX.Element {
  const [values, setValues] = useState<NewCard>(EMPTY_NEW_CARD)
  const [messages, setMessages] = useState<CardFieldMessages>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const contentId = useId()
  const contentErrorId = `${contentId}-error`

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault()
    const validation = validateCard(values)
    if (!validation.valid) {
      setMessages(fieldMessages(validation))
      return
    }
    setMessages({})
    setSaveError(null)
    try {
      await onCreate(validation.value)
    } catch {
      setSaveError(SAVE_ERROR_MESSAGE)
    }
  }

  return (
    <Paper className="p-6">
      <form
        data-testid="new-card-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
      >
        <Input
          name="name"
          label="Nome"
          value={values.name}
          setValue={(value) => setValues((previous) => ({ ...previous, name: value }))}
          error={messages.name ?? ''}
        />
        <Input
          name="category"
          label="Categoria"
          value={values.category}
          setValue={(value) =>
            setValues((previous) => ({ ...previous, category: value }))
          }
          error={messages.category ?? ''}
        />
        <div className="flex flex-col gap-1">
          <Typography as="label" htmlFor={contentId} size="body">
            Conteúdo
          </Typography>
          <textarea
            id={contentId}
            name="content"
            rows={6}
            value={values.content}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setValues((previous) => ({
                ...previous,
                content: event.target.value,
              }))
            }
            aria-describedby={messages.content ? contentErrorId : undefined}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-2 py-3 text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          />
          {messages.content ? (
            <Typography as="p" color="error" id={contentErrorId}>
              {messages.content}
            </Typography>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <FormButton
              key={category}
              type="button"
              size="small"
              onClick={() =>
                setValues((previous) => ({ ...previous, category }))
              }
            >
              {category}
            </FormButton>
          ))}
        </div>
        {saveError ? (
          <p role="alert" className="text-red-700 dark:text-red-400">
            {saveError}
          </p>
        ) : null}
        <div className="flex gap-2">
          <FormButton type="submit">Salvar</FormButton>
          <FormButton type="button" onClick={onCancel}>
            Cancelar
          </FormButton>
        </div>
      </form>
    </Paper>
  )
}
