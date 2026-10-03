import { FORM_FIELD_ORDER } from '../fieldTypes.ts'
import { boxOptions } from './boxOptions.ts'
import { fieldInputLine } from './fieldInputLine.ts'
import { plainText } from './plainText.ts'
import { renderBox } from './renderBox.ts'
import type { FormField, RenderState } from './types.ts'

const FIELD_LABELS: Readonly<Record<FormField, string>> = {
  title: 'Título',
  subject: 'Matéria',
  difficulty: 'Dificuldade',
  note: 'Nota',
  link: 'Link',
}
const FORM_TITLES = { add: 'Novo item', edit: 'Editar item' } as const
const FORM_HINT = 'Enter avança; no último campo grava · Esc cancela'

export function renderForm(state: RenderState): string[] {
  const options = boxOptions(state)
  const form = state.form
  if (form === null) return renderBox('Formulário', [], options)

  const body = FORM_FIELD_ORDER.map((field) =>
    fieldInputLine(FIELD_LABELS[field], form.fields[field], state.viewport.columns - 2, form.focus === field, state.color),
  )
  return renderBox(FORM_TITLES[form.mode], [...body, plainText(''), plainText(` ${FORM_HINT}`)], options)
}
