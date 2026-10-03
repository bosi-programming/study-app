export type TextField = {
  readonly value: string
  readonly cursor: number
}

export type FormField = 'title' | 'subject' | 'difficulty' | 'note' | 'link'

export const FORM_FIELD_ORDER: readonly FormField[] = ['title', 'subject', 'difficulty', 'note', 'link']
