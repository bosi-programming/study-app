import { type ItemInput } from '@study/core'
import { type Route } from '../../../routing.ts'
import { type DueEstimate } from '../../due/model/due.ts'

export type AddFormValues = {
  readonly title: string
  readonly subject: string
  readonly difficulty: string
  readonly note: string
  readonly link: string
}

export const EMPTY_ADD_FORM: AddFormValues = {
  title: '',
  subject: '',
  difficulty: '3',
  note: '',
  link: '',
}

export type AddController = {
  readonly values: AddFormValues
  readonly fieldErrors: Readonly<Record<string, string>>
  readonly preview: DueEstimate | null
  readonly error: string | null
  readonly busy: boolean
  setValue(field: keyof AddFormValues, value: string): void
  submit(): void
}

export function toItemInput(values: AddFormValues): ItemInput {
  return {
    title: values.title,
    subject: values.subject,
    difficulty: Number(values.difficulty),
    note: values.note,
    link: values.link,
  }
}

export type AddSaved = (route: Route) => void
